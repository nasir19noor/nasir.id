"""Tool interface. spec() emits the exact shape Bedrock's Converse API wants."""
from abc import ABC, abstractmethod


class Tool(ABC):
    name: str
    description: str
    input_schema: dict

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
