import pytest
import math
from backend.app.core.exceptions import ToolExecutionError
from backend.app.tools.calculator import (
    evaluate_expression,
    is_valid_math_expression,
    extract_math_expression,
    extract_engineering_calculations,
)
from backend.app.tools.agent import agent_orchestrator
from backend.app.agent.planner import planner, intent_analyzer
from backend.app.tools.registry import tool_registry


def test_calculator_arithmetic():
    assert evaluate_expression("2 + 2") == 4.0
    assert evaluate_expression("10 * 5 - 8 / 2") == 46.0
    assert evaluate_expression("2 ** 8") == 256.0
    assert evaluate_expression("2 ^ 8") == 256.0
    assert evaluate_expression("120 * 50 / 6") == 1000.0


def test_calculator_functions():
    assert evaluate_expression("sqrt(144)") == 12.0
    assert evaluate_expression("abs(-42)") == 42.0
    assert evaluate_expression("round(3.14159, 2)") == 3.14
    assert evaluate_expression("log10(1000)") == 3.0
    assert evaluate_expression("sin(pi / 2)") == 1.0
    assert evaluate_expression("cos(0)") == 1.0
    assert evaluate_expression("exp(1)") == pytest.approx(math.e, rel=1e-4)


def test_calculator_unit_handling():
    """Validates that physical and electrical engineering units are stripped properly."""
    assert evaluate_expression("50 Hz * 0.04") == 2.0
    assert evaluate_expression("120 * 50Hz / 6") == 1000.0
    assert evaluate_expression("1000 rpm * (1 - 0.04)") == 960.0
    assert evaluate_expression("400 V * 10 A * 0.85") == 3400.0
    assert evaluate_expression("100 ohm + 50 ohm") == 150.0
    assert evaluate_expression("500 W / 100 V") == 5.0
    assert evaluate_expression("15 N*m * 100 rad/s") == 1500.0


def test_calculator_natural_language_rejection():
    """Validates that natural language text and questions are rejected with clean ToolExecutionError."""
    # Direct questions must be rejected from raw evaluation
    with pytest.raises(ToolExecutionError) as exc_info:
        evaluate_expression("What is the rotor speed of a 6-pole, 50 Hz three-phase induction motor operating at a fractional slip of s = 0.04? Also explain how rotor frequency varies with slip.")
    assert "natural language text" in str(exc_info.value).lower()

    with pytest.raises(ToolExecutionError) as exc_info2:
        evaluate_expression("the rotor speed of a 6-pole, 50 Hz three-phase induction motor")
    assert "natural language text" in str(exc_info2.value).lower() or "invalid" in str(exc_info2.value).lower()

    with pytest.raises(ToolExecutionError):
        evaluate_expression("Explain the difference between synchronous speed and rotor speed")

    # Ensure no raw AST/Python tracebacks leaked
    with pytest.raises(ToolExecutionError) as exc_info3:
        evaluate_expression("invalid syntax +++ ???")
    assert "<unknown>" not in str(exc_info3.value)
    assert "SyntaxError" not in str(exc_info3.value)


def test_is_valid_math_expression():
    assert is_valid_math_expression("120 * 50 / 6") is True
    assert is_valid_math_expression("1000 * (1 - 0.04)") is True
    assert is_valid_math_expression("0.04 * 50") is True
    assert is_valid_math_expression("sqrt(144) + 2^8") is True
    assert is_valid_math_expression("sin(pi / 2)") is True
    assert is_valid_math_expression("What is the rotor speed of a 6-pole motor?") is False
    assert is_valid_math_expression("calculate the slip") is False
    assert is_valid_math_expression("rotor speed is 960 rpm") is False


def test_extract_math_expression():
    # Clean expression extraction
    assert extract_math_expression("calculate: 45 * 12 + 88") == "45 * 12 + 88"
    assert extract_math_expression("Evaluate sqrt(256) + 10") == "sqrt(256) + 10"
    assert extract_math_expression("/calc 120 * 50 / 6") == "120 * 50 / 6"
    assert extract_math_expression("What is 100 * (1 - 0.05)?") == "100 * (1 - 0.05)"

    # Natural language questions requiring reasoning must return None
    assert extract_math_expression("What is the rotor speed of a 6-pole, 50 Hz three-phase induction motor operating at a fractional slip of s = 0.04? Also explain how rotor frequency varies with slip.") is None
    assert extract_math_expression("Explain the working principle of a transformer.") is None
    assert extract_math_expression("How does slip vary with torque in an induction motor?") is None


def test_extract_engineering_calculations_induction_motor():
    """Validates parameter extraction and formula generation for induction motor problem."""
    query = "What is the rotor speed of a 6-pole, 50 Hz three-phase induction motor operating at a fractional slip of s = 0.04? Also explain how rotor frequency varies with slip."
    calcs = extract_engineering_calculations(query)

    assert len(calcs) == 3
    # 1. Ns
    assert calcs[0]["name"] == "Synchronous Speed (Ns)"
    assert calcs[0]["expression"] == "120 * 50.0 / 6"
    assert calcs[0]["expected"] == 1000.0
    assert calcs[0]["unit"] == "rpm"

    # 2. Nr
    assert calcs[1]["name"] == "Rotor Speed (Nr)"
    assert calcs[1]["expression"] == "1000.0 * (1 - 0.04)"
    assert calcs[1]["expected"] == 960.0
    assert calcs[1]["unit"] == "rpm"

    # 3. fr
    assert calcs[2]["name"] == "Rotor Frequency (fr)"
    assert calcs[2]["expression"] == "0.04 * 50.0"
    assert calcs[2]["expected"] == 2.0
    assert calcs[2]["unit"] == "Hz"


def test_extract_engineering_calculations_transformer():
    query = "A single-phase transformer has N1 = 500 primary turns and N2 = 100 secondary turns with primary voltage of 240 V."
    calcs = extract_engineering_calculations(query)
    assert len(calcs) == 2
    assert calcs[0]["name"] == "Transformer Turns Ratio (a)"
    assert calcs[0]["expected"] == 5.0
    assert calcs[1]["name"] == "Secondary Voltage (V2)"
    assert calcs[1]["expected"] == 48.0


def test_extract_engineering_calculations_dcdc_buck():
    query = "Calculate the duty cycle of a buck converter with input voltage 24 V and output voltage 12 V."
    calcs = extract_engineering_calculations(query)
    assert len(calcs) == 1
    assert calcs[0]["name"] == "Buck Converter Duty Cycle (D)"
    assert calcs[0]["expected"] == 0.5


def test_extract_engineering_calculations_three_phase_power():
    query = "Find the active power of a three-phase system with 400 V line voltage, 10 A line current, and power factor 0.85."
    calcs = extract_engineering_calculations(query)
    assert len(calcs) == 2
    assert calcs[0]["name"] == "Three-Phase Active Power (P)"
    assert calcs[0]["expected"] == pytest.approx(math.sqrt(3) * 400 * 10 * 0.85, rel=1e-3)


@pytest.mark.asyncio
async def test_agent_orchestrator_induction_motor_flow():
    """Validates that AgentOrchestrator extracts parameters and executes sub-calculations independently."""
    user_query = "What is the rotor speed of a 6-pole, 50 Hz three-phase induction motor operating at a fractional slip of s = 0.04? Also explain how rotor frequency varies with slip."
    res = await agent_orchestrator.run_tool_loop(
        messages=[{"role": "user", "content": user_query}],
        tools_enabled=True,
    )
    assert res is not None
    assert res["type"] == "tool_call"
    assert res["tool"] == "math.calculate"
    assert "calculations" in res["input"]
    assert len(res["input"]["calculations"]) == 3
    assert "Synchronous Speed (Ns)" in res["output"]
    assert "1000.0 rpm" in res["output"]
    assert "960.0 rpm" in res["output"]
    assert "2.0 Hz" in res["output"]


@pytest.mark.asyncio
async def test_agent_orchestrator_non_calculation_query():
    """Validates that purely theoretical questions do not invoke math.calculate."""
    res = await agent_orchestrator.run_tool_loop(
        messages=[{"role": "user", "content": "Explain how rotor frequency varies with slip in an induction motor"}],
        tools_enabled=True,
    )
    # Must not invoke math.calculate on non-computational questions
    assert res is None


@pytest.mark.asyncio
async def test_planner_engineering_multi_step():
    """Validates that Planner creates sequential calculation steps for engineering problems."""
    query = "What is the rotor speed of a 6-pole, 50 Hz three-phase induction motor operating at a fractional slip of s = 0.04?"
    plan = planner.create_plan(query)
    assert len(plan.steps) == 3
    assert plan.steps[0].tool_name == "math.calculate"
    assert plan.steps[0].input_params["expression"] == "120 * 50.0 / 6"
    assert plan.steps[1].tool_name == "math.calculate"
    assert plan.steps[1].input_params["expression"] == "1000.0 * (1 - 0.04)"
    assert plan.steps[2].tool_name == "math.calculate"
    assert plan.steps[2].input_params["expression"] == "0.04 * 50.0"


def test_calculator_safety():
    with pytest.raises(Exception):
        evaluate_expression("__import__('os').system('ls')")
    with pytest.raises(Exception):
        evaluate_expression("open('secret.txt')")
    with pytest.raises(ToolExecutionError):
        evaluate_expression("eval('2+2')")


def test_tool_registry():
    calc = tool_registry.get("calculator")
    assert calc is not None
    assert calc.name == "calculator"
