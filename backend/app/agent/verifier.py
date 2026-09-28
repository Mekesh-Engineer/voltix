import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.agent.state import VerificationResult, Evidence
from backend.app.tools.calculator import evaluate_expression
from backend.app.core.logging import logger


class VerificationEngine:
    """
    Independent Verification Layer verifying tool claims, citations, calculations,
    and generated artifacts before final user synthesis (Section 24).
    """

    def verify_math_claim(self, claim_expression: str, claimed_answer: float) -> bool:
        """Independently computes expression and compares with claim."""
        try:
            actual = evaluate_expression(claim_expression)
            return abs(actual - float(claimed_answer)) < 1e-4
        except Exception as e:
            logger.warning(f"Math verification failed for '{claim_expression}': {e}")
            return False

    def verify_artifact_created(self, file_path: str) -> bool:
        """Checks if generated artifact exists and is non-empty."""
        p = Path(file_path)
        return p.exists() and p.is_file() and p.stat().st_size > 0

    def verify_step_execution(
        self,
        tool_name: Optional[str],
        tool_input: Dict[str, Any],
        tool_output: Any,
        artifacts_generated: List[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """
        Validates that a tool execution yielded verified, non-hallucinated results.
        """
        checks: List[str] = []
        failures: List[str] = []
        diagnostics: Dict[str, Any] = {}

        if not tool_name:
            return VerificationResult(passed=True, checks_run=["No tool to verify"])

        checks.append(f"Tool {tool_name} returned non-null output")
        if tool_output is None:
            failures.append(f"Tool {tool_name} produced null output.")

        # Math verification
        if tool_name in ("math.calculate", "calculator"):
            expr = tool_input.get("expression", "")
            checks.append(f"Verify math computation for: {expr}")
            try:
                verified_ans = evaluate_expression(expr)
                if isinstance(tool_output, (int, float)) and abs(verified_ans - float(tool_output)) > 1e-4:
                    failures.append(f"Math mismatch: Claimed {tool_output} vs Computed {verified_ans}")
                diagnostics["verified_math_output"] = verified_ans
            except Exception as e:
                failures.append(f"Math calculation failed evaluation: {str(e)}")

        # Artifact generation verification
        if "artifact." in tool_name or tool_name.startswith("filesystem.write"):
            checks.append("Verify physical artifact persistence")
            if artifacts_generated:
                for art in artifacts_generated:
                    fpath = art.get("file_path")
                    if fpath and not self.verify_artifact_created(fpath):
                        failures.append(f"Artifact file '{fpath}' does not exist or is empty.")
                    else:
                        diagnostics[f"artifact_verified_{art.get('name')}"] = True

        # Python execution validation
        if tool_name == "python":
            checks.append("Verify Python sandbox status")
            if isinstance(tool_output, str) and ("Execution error" in tool_output or "Traceback" in tool_output):
                failures.append("Python script reported runtime exception.")

        passed = len(failures) == 0
        confidence = 1.0 if passed else max(0.2, 1.0 - (len(failures) * 0.3))

        return VerificationResult(
            passed=passed,
            checks_run=checks,
            failures=failures,
            diagnostics=diagnostics,
            confidence_score=round(confidence, 2),
        )


verification_engine = VerificationEngine()
