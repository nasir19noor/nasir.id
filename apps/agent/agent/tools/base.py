"""Every tool implements this interface. `spec()` produces the exact JSON shape
that Bedrock's Converse API expects under toolConfig.tools[]."""
from abc import ABC, abstractmethod


class Tool(ABC):
    name: str
    description: str
    input_schema: dict  # JSON Schema for the tool's arguments

    @abstractmethod
    def run(self, **kwargs) -> str:
        ...

    def spec(self) -> dict:
        return {
            "toolSpec": {
                "name": self.name,
                "description": self.description,
                "inputSchema": {"json": self.input_schema},
            }
        }
