"""The agent loop.

    user message
      -> Bedrock: answer, OR request tool calls
      -> run the tools, feed results back, ask again
      -> repeat until no tools are requested (or MAX_AGENT_STEPS)

`run_stream` yields an event per step so the frontend can draw the trace live.
`run` is just run_stream drained to its final answer."""
import time
from config import MAX_AGENT_STEPS
from agent.bedrock_client import BedrockClient
from agent.tools import build_registry, build_tool_config

SYSTEM_PROMPT = """You are the infrastructure copilot for Nasir's environment:
a Contabo VPS (Docker, self-hosted GitHub Actions runner, PostgreSQL), an AWS
account in ap-southeast-1, and DNS on Cloudflare.

Rules:
- You are read-only. Gather facts with tools before answering.
- Pick the most specific tool. Chain tools when one answer feeds the next.
- Never attempt a write or destructive action. Instead, print the exact command
  the human should run, and say what it will change.
- Answer in plain language, and point at the tool output you relied on.
- Be concise. No preamble.
"""


class Agent:
    def __init__(self, memory=None, conversation_id: int | None = None):
        self.bedrock = BedrockClient()
        self.registry = build_registry()
        self.tool_config = build_tool_config(self.registry)
        self.memory = memory
        self.conversation_id = conversation_id
        self.messages: list = []
        if memory and conversation_id:
            try:
                self.messages = memory.load_messages(conversation_id)
            except Exception:
                self.messages = []

    def _add(self, role: str, content: list) -> None:
        self.messages.append({"role": role, "content": content})
        if self.memory and self.conversation_id:
            try:
                self.memory.save_message(self.conversation_id, role, content)
            except Exception:
                pass  # memory is best-effort; never break the loop over it

    def _execute_tool(self, tool_use: dict) -> str:
        tool = self.registry.get(tool_use["name"])
        if not tool:
            return f"Unknown tool: {tool_use['name']}"
        try:
            return tool.run(**tool_use.get("input", {}))
        except Exception as e:
            return f"Tool error: {e}"

    def run_stream(self, user_input: str):
        """Yield dict events: text | tool_use | tool_result | done | error."""
        self._add("user", [{"text": user_input}])

        for step in range(1, MAX_AGENT_STEPS + 1):
            try:
                response = self.bedrock.converse(
                    messages=self.messages,
                    system=SYSTEM_PROMPT,
                    tool_config=self.tool_config,
                )
            except Exception as e:
                yield {"type": "error", "message": f"Bedrock call failed: {e}"}
                return

            message = response["output"]["message"]
            self._add(message["role"], message["content"])

            for block in message["content"]:
                if "text" in block and block["text"].strip():
                    yield {"type": "text", "step": step, "text": block["text"]}

            if response.get("stopReason") == "tool_use":
                results = []
                for block in message["content"]:
                    if "toolUse" not in block:
                        continue
                    tu = block["toolUse"]
                    yield {
                        "type": "tool_use",
                        "step": step,
                        "id": tu["toolUseId"],
                        "name": tu["name"],
                        "input": tu.get("input", {}),
                    }
                    started = time.perf_counter()
                    output = str(self._execute_tool(tu))
                    elapsed_ms = int((time.perf_counter() - started) * 1000)
                    yield {
                        "type": "tool_result",
                        "step": step,
                        "id": tu["toolUseId"],
                        "name": tu["name"],
                        "output": output,
                        "ms": elapsed_ms,
                    }
                    results.append(
                        {
                            "toolResult": {
                                "toolUseId": tu["toolUseId"],
                                "content": [{"text": output}],
                            }
                        }
                    )
                self._add("user", results)
                continue

            yield {"type": "done", "step": step}
            return

        yield {"type": "error", "message": "Reached max steps without an answer."}

    def run(self, user_input: str) -> str:
        answer = []
        for event in self.run_stream(user_input):
            if event["type"] == "text":
                answer.append(event["text"])
            elif event["type"] == "error":
                return event["message"]
        return "\n".join(answer).strip()
