from pydantic import BaseModel


class ProblemDetails(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str
    request_id: str


class AIChatException(Exception):
    """Base exception for AI Chat Platform."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class LLMProviderError(AIChatException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=502)


class OllamaUnavailableError(AIChatException):
    def __init__(self, message: str = "Unable to connect to Ollama. Make sure Ollama is running and try again."):
        super().__init__(message=message, status_code=503)


class ModelNotFoundError(AIChatException):
    def __init__(self, model_name: str):
        super().__init__(message=f"Model '{model_name}' was not found or is currently unavailable.", status_code=404)


class FileValidationError(AIChatException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)


class RAGError(AIChatException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=500)


class ToolExecutionError(AIChatException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)
