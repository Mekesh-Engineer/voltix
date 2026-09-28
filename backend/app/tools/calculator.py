import ast
import operator
import math
import re
from typing import Union, Optional, List, Dict, Any
from backend.app.core.exceptions import ToolExecutionError
from backend.app.tools.registry import ToolDefinition, tool_registry

# Allowed mathematical operations
_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.BitXor: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

_SAFE_FUNCTIONS = {
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "exp": math.exp,
    "floor": math.floor,
    "ceil": math.ceil,
    "abs": abs,
    "round": round,
    "pi": math.pi,
    "e": math.e,
}

_COMMON_UNITS = [
    r"khz", r"mhz", r"ghz", r"hz",
    r"rad/s", r"rpm",
    r"mva", r"kva", r"va",
    r"kvar", r"mvar", r"var",
    r"gw", r"mw", r"kw", r"w",
    r"kv", r"mv", r"v",
    r"ma", r"ka", r"a",
    r"kohm", r"mohm", r"ohm", r"kω", r"mω", r"ω",
    r"mh", r"uh", r"h",  # Henry
    r"uf", r"nf", r"pf", r"f",  # Farad
    r"n[·\*\.]?m", r"nm",
    r"m/s", r"km/h",
    r"kj", r"mj", r"j",
    r"degrees", r"radians", r"deg", r"rad",
    r"seconds", r"minutes", r"hours", r"sec", r"ms", r"s",
    r"p\.u\.", r"pu", r"per\s*unit",
    r"percent", r"%",
]

_UNIT_REGEX = re.compile(
    r"(?<=\d|\))\s*(?:" + "|".join(_COMMON_UNITS) + r")\b",
    re.IGNORECASE,
)

_FORBIDDEN_WORDS = re.compile(
    r"\b(?:the|rotor|stator|speed|pole|poles|induction|motor|generator|converter|inverter|transformer|phase|voltage|current|power|slip|frequency|torque|efficiency|resistance|inductance|capacitance|reactance|impedance|explain|also|how|why|when|where|which|describe|derive|prove|difference|ratio|fractional|operating|under|load|condition|conditions|state|flux|density|synchronous|three-phase|single-phase|calculate|compute|find|determine|solve|tell|me|what|is|value|result)\b",
    re.IGNORECASE,
)

_PREFIX_REGEX = re.compile(
    r"^(?:calculate|compute|evaluate|what(?:\s+is|\'s)?|find(?:\s+the)?(?:\s+value|\s+result)?(?:\s+of)?|determine|solve|tell\s+me)\s*[:\s]*",
    re.IGNORECASE,
)


def _eval_node(node: ast.AST) -> Union[int, float]:
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ToolExecutionError("Unsupported constant type in math expression.")

    if isinstance(node, ast.BinOp):
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        op_type = type(node.op)
        if op_type in _OPERATORS:
            if op_type in (ast.Div, ast.FloorDiv, ast.Mod) and right == 0:
                raise ToolExecutionError("Division by zero is undefined.")
            return _OPERATORS[op_type](left, right)
        raise ToolExecutionError("Unsupported mathematical operator.")

    if isinstance(node, ast.UnaryOp):
        operand = _eval_node(node.operand)
        op_type = type(node.op)
        if op_type in _OPERATORS:
            return _OPERATORS[op_type](operand)
        raise ToolExecutionError("Unsupported unary operator.")

    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name) and node.func.id.lower() in _SAFE_FUNCTIONS:
            func = _SAFE_FUNCTIONS[node.func.id.lower()]
            args = [_eval_node(arg) for arg in node.args]
            return func(*args)
        raise ToolExecutionError(f"Unsupported function call in math expression.")

    if isinstance(node, ast.Name):
        lower_id = node.id.lower()
        if lower_id in _SAFE_FUNCTIONS:
            val = _SAFE_FUNCTIONS[lower_id]
            if isinstance(val, (int, float)):
                return val
        raise ToolExecutionError(f"Unknown variable in math expression: {node.id}")

    raise ToolExecutionError("Unsupported mathematical syntax.")


def is_valid_math_expression(expr: str) -> bool:
    """
    Validates if a string is a clean, computable mathematical expression.
    Rejects natural language sentences, questions, and non-math tokens.
    """
    if not expr or not isinstance(expr, str):
        return False

    clean = expr.strip()
    if not clean or len(clean) > 400:
        return False

    # Must not contain question marks, exclamation marks, or statements
    if "?" in clean or "!" in clean or ";" in clean:
        return False

    # Strip prefixes like "calculate:", "What is", etc.
    clean_no_prefix = _PREFIX_REGEX.sub("", clean).strip()

    # Reject if remaining string contains forbidden natural language keywords
    if _FORBIDDEN_WORDS.search(clean_no_prefix):
        return False

    # Must contain at least one digit or safe constant
    if not re.search(r"\d|\bpi\b|\be\b", clean_no_prefix, re.IGNORECASE):
        return False

    # Strip units and check tokens
    clean_no_units = _UNIT_REGEX.sub("", clean_no_prefix).strip()
    clean_sanitized = (
        clean_no_units.replace("^", "**")
        .replace("×", "*")
        .replace("÷", "/")
        .replace("√", "sqrt")
        .replace("·", "*")
        .replace("π", "pi")
    )

    # Extract all identifier tokens (words)
    identifiers = re.findall(r"[a-zA-Z_]\w*", clean_sanitized)
    for ident in identifiers:
        if ident.lower() not in _SAFE_FUNCTIONS:
            return False

    # Validate AST structure
    try:
        parsed = ast.parse(clean_sanitized, mode="eval")
        for node in ast.walk(parsed):
            if isinstance(
                node,
                (
                    ast.Expression,
                    ast.BinOp,
                    ast.UnaryOp,
                    ast.Constant,
                    ast.Call,
                    ast.Name,
                    ast.Load,
                    ast.Add,
                    ast.Sub,
                    ast.Mult,
                    ast.Div,
                    ast.FloorDiv,
                    ast.Mod,
                    ast.Pow,
                    ast.BitXor,
                    ast.USub,
                    ast.UAdd,
                ),
            ):
                continue
            return False
        return True
    except Exception:
        return False


def extract_math_expression(text: str) -> Optional[str]:
    """
    Extracts and sanitizes a single mathematical expression from user input.
    Returns None if the input is a natural language question requiring reasoning.
    """
    if not text:
        return None

    clean = text.strip()

    # Slash command /calc <expr>
    if clean.lower().startswith("/calc"):
        clean = clean[5:].strip().lstrip(":").strip()

    # Strip prefixes like "calculate:", "What is", etc.
    clean = _PREFIX_REGEX.sub("", clean).strip()

    # Strip trailing punctuation
    clean = clean.rstrip(".?!;")

    # Strip units
    clean_no_units = _UNIT_REGEX.sub("", clean).strip()

    if is_valid_math_expression(clean_no_units):
        return clean_no_units

    # If the text has question marks or natural language sentences, check if an isolated formula exists
    if "?" in clean or _FORBIDDEN_WORDS.search(clean):
        # Look for explicit math formula like `(sqrt(65536) * 12) + (2^8 / 4) - 45.5`
        matches = re.findall(
            r"(?:(?:\(?\s*(?:sqrt|sin|cos|tan|asin|acos|atan|log|log10|abs|exp|round|floor|ceil)?\s*\(?[0-9\.]+\s*[\+\-\*\/\^\%]\s*[0-9\.\+\-\*\/\^\(\)\s\w\.\%]+))",
            clean,
        )
        for m in matches:
            candidate = m.strip()
            candidate_nounits = _UNIT_REGEX.sub("", candidate).strip()
            if is_valid_math_expression(candidate_nounits):
                return candidate_nounits
        return None

    return None


def extract_engineering_calculations(text: str) -> List[Dict[str, Any]]:
    """
    Intelligently extracts mathematical parameters from electrical/electronics engineering
    problem statements and constructs independent, tool-safe calculation expressions.
    """
    if not text:
        return []

    lower = text.lower()
    calculations: List[Dict[str, Any]] = []

    # 1. Three-Phase Induction Motor (Synchronous speed, Rotor speed, Rotor frequency, Slip)
    if "induction motor" in lower or ("motor" in lower and ("slip" in lower or "pole" in lower or "rpm" in lower or "rotor" in lower)):
        # Extract Poles P
        poles_match = re.search(r"(\d+)\s*[- ]?pole", lower) or re.search(r"(?:poles?|p)\s*(?:=|is|of)?\s*(\d+)", lower)
        # Extract Frequency f
        freq_match = re.search(r"(\d+(?:\.\d+)?)\s*hz", lower) or re.search(r"(?:frequency|f)\s*(?:=|is|of)?\s*(\d+(?:\.\d+)?)", lower)
        # Extract Slip s
        slip_match = re.search(r"(?:slip|s)\s*(?:=|of|is|at)?\s*(?:a\s+fractional\s+slip\s+of\s+s\s*=\s*)?([0-9]*\.[0-9]+|\d+%)", lower)
        # Extract RPM if given
        rpm_match = re.search(r"(\d+(?:\.\d+)?)\s*rpm", lower) or re.search(r"(?:speed|nr|ns)\s*(?:=|is|of)?\s*(\d+(?:\.\d+)?)", lower)

        p = int(poles_match.group(1)) if poles_match else None
        f = float(freq_match.group(1)) if freq_match else None
        
        s = None
        if slip_match:
            raw_s = slip_match.group(1).replace("%", "").strip()
            s = float(raw_s) / 100.0 if "%" in slip_match.group(1) or (float(raw_s) > 1.0 and float(raw_s) <= 100.0) else float(raw_s)

        nr_given = float(rpm_match.group(1)) if rpm_match and not poles_match else None

        # Calculate Ns if P and f are present
        if p and f:
            ns_val = (120.0 * f) / p
            calculations.append({
                "name": "Synchronous Speed (Ns)",
                "formula": "120 * f / P",
                "expression": f"120 * {f} / {p}",
                "unit": "rpm",
                "expected": ns_val,
            })

            # Calculate Nr and fr if s is present
            if s is not None:
                nr_val = ns_val * (1.0 - s)
                fr_val = s * f
                calculations.append({
                    "name": "Rotor Speed (Nr)",
                    "formula": "Ns * (1 - s)",
                    "expression": f"{ns_val} * (1 - {s})",
                    "unit": "rpm",
                    "expected": nr_val,
                })
                calculations.append({
                    "name": "Rotor Frequency (fr)",
                    "formula": "s * f",
                    "expression": f"{s} * {f}",
                    "unit": "Hz",
                    "expected": fr_val,
                })
            elif nr_given is not None and nr_given != ns_val:
                # Calculate slip from actual speed
                calc_s = (ns_val - nr_given) / ns_val
                calculations.append({
                    "name": "Fractional Slip (s)",
                    "formula": "(Ns - Nr) / Ns",
                    "expression": f"({ns_val} - {nr_given}) / {ns_val}",
                    "unit": "p.u.",
                    "expected": calc_s,
                })
                calculations.append({
                    "name": "Rotor Frequency (fr)",
                    "formula": "s * f",
                    "expression": f"{calc_s} * {f}",
                    "unit": "Hz",
                    "expected": calc_s * f,
                })

    # 2. Transformer Voltage, Current, and Turns Ratio
    elif "transformer" in lower:
        v1_match = re.search(r"(\d+(?:\.\d+)?)\s*v\s*(?:primary|input|1)", lower) or re.search(r"primary\s*(?:voltage)?\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\s*v", lower)
        n1_match = re.search(r"(\d+)\s*(?:primary\s*turns|turns\s*on\s*primary|n1)", lower) or re.search(r"n1\s*=\s*(\d+)", lower)
        n2_match = re.search(r"(\d+)\s*(?:secondary\s*turns|turns\s*on\s*secondary|n2)", lower) or re.search(r"n2\s*=\s*(\d+)", lower)

        if n1_match and n2_match:
            n1 = float(n1_match.group(1))
            n2 = float(n2_match.group(1))
            ratio = n1 / n2
            calculations.append({
                "name": "Transformer Turns Ratio (a)",
                "formula": "N1 / N2",
                "expression": f"{n1} / {n2}",
                "unit": "ratio",
                "expected": ratio,
            })
            if v1_match:
                v1 = float(v1_match.group(1))
                v2_val = v1 * (n2 / n1)
                calculations.append({
                    "name": "Secondary Voltage (V2)",
                    "formula": "V1 * (N2 / N1)",
                    "expression": f"{v1} * ({n2} / {n1})",
                    "unit": "V",
                    "expected": v2_val,
                })

    # 3. DC-DC Converter (Buck / Boost Duty Cycle & Output Voltage)
    elif "buck" in lower or "boost" in lower or "converter" in lower:
        vin_match = re.search(r"(\d+(?:\.\d+)?)\s*v\s*(?:in|input)", lower) or re.search(r"input(?:\s+voltage)?\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\s*v", lower)
        vout_match = re.search(r"(\d+(?:\.\d+)?)\s*v\s*(?:out|output)", lower) or re.search(r"output(?:\s+voltage)?\s*(?:of|=|is)?\s*(\d+(?:\.\d+)?)\s*v", lower)
        duty_match = re.search(r"(?:duty\s+cycle|d)\s*(?:=|of|is)?\s*([0-9]*\.[0-9]+|\d+%)", lower)

        if vin_match and vout_match:
            vin = float(vin_match.group(1))
            vout = float(vout_match.group(1))
            if vin > 0 and "buck" in lower:
                d_val = vout / vin
                calculations.append({
                    "name": "Buck Converter Duty Cycle (D)",
                    "formula": "Vo / Vin",
                    "expression": f"{vout} / {vin}",
                    "unit": "p.u.",
                    "expected": d_val,
                })
            elif vin > 0 and "boost" in lower and vout > vin:
                d_val = 1.0 - (vin / vout)
                calculations.append({
                    "name": "Boost Converter Duty Cycle (D)",
                    "formula": "1 - (Vin / Vo)",
                    "expression": f"1 - ({vin} / {vout})",
                    "unit": "p.u.",
                    "expected": d_val,
                })
        elif vin_match and duty_match:
            vin = float(vin_match.group(1))
            raw_d = duty_match.group(1).replace("%", "")
            d = float(raw_d) / 100.0 if "%" in duty_match.group(1) or float(raw_d) > 1.0 else float(raw_d)
            if "buck" in lower:
                vo_val = d * vin
                calculations.append({
                    "name": "Buck Output Voltage (Vo)",
                    "formula": "D * Vin",
                    "expression": f"{d} * {vin}",
                    "unit": "V",
                    "expected": vo_val,
                })

    # 4. Three-Phase AC Power P = sqrt(3) * VL * IL * pf
    elif "three-phase" in lower and ("power" in lower or "kw" in lower or "kva" in lower or "kvar" in lower):
        vl_match = re.search(r"(\d+(?:\.\d+)?)\s*v", lower)
        il_match = re.search(r"(\d+(?:\.\d+)?)\s*a", lower)
        pf_match = re.search(r"(?:pf|power factor|cos\s*phi)\s*(?:=|of|is)?\s*([0-9]*\.[0-9]+)", lower)
        if vl_match and il_match:
            vl = float(vl_match.group(1))
            il = float(il_match.group(1))
            pf = float(pf_match.group(1)) if pf_match else 1.0
            
            p_val = math.sqrt(3) * vl * il * pf
            s_val = math.sqrt(3) * vl * il
            calculations.append({
                "name": "Three-Phase Active Power (P)",
                "formula": "sqrt(3) * VL * IL * pf",
                "expression": f"sqrt(3) * {vl} * {il} * {pf}",
                "unit": "W",
                "expected": p_val,
            })
            calculations.append({
                "name": "Three-Phase Apparent Power (S)",
                "formula": "sqrt(3) * VL * IL",
                "expression": f"sqrt(3) * {vl} * {il}",
                "unit": "VA",
                "expected": s_val,
            })

    return calculations


def evaluate_expression(expression: str) -> float:
    """
    Safely evaluates mathematical expressions using strict AST parsing.
    Strips units, validates arithmetic tokens, and rejects natural language.
    """
    if not expression or not isinstance(expression, str):
        raise ToolExecutionError("Empty mathematical expression provided.")

    clean_expr = expression.strip()

    # Reject forbidden natural language sentences
    if _FORBIDDEN_WORDS.search(clean_expr):
        raise ToolExecutionError("Input contains natural language text rather than a valid mathematical expression.")

    # Strip units and replace operators
    clean_expr = _UNIT_REGEX.sub("", clean_expr).strip()
    clean_expr = (
        clean_expr.replace("^", "**")
        .replace("×", "*")
        .replace("÷", "/")
        .replace("√", "sqrt")
        .replace("·", "*")
        .replace("π", "pi")
    )

    try:
        parsed = ast.parse(clean_expr, mode="eval")
        result = _eval_node(parsed.body)
        return float(result) if isinstance(result, (int, float)) else result
    except Exception as e:
        if isinstance(e, ToolExecutionError):
            raise
        # Clean user-safe error message without raw AST/Python tracebacks
        raise ToolExecutionError(f"Unable to evaluate mathematical expression: '{expression}' contains invalid or non-computable syntax.")


# Register calculator tool
calc_def = ToolDefinition(
    name="calculator",
    description="Safely evaluate mathematical calculations, arithmetic, exponents, and trigonometric functions.",
    parameters={
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "The mathematical expression to evaluate, e.g. 'sqrt(144) + 12 * 3.5'",
            }
        },
        "required": ["expression"],
    },
    timeout=3,
)

tool_registry.register(calc_def, evaluate_expression)
