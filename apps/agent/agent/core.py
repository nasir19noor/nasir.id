"""The agent loop. This is the heart of 'agentic' behaviour:

    user message
      -> Bedrock decides: answer directly, OR call one/more tools
      -> if tools: we execute them, feed results back, let Bedrock decide again
      -> repeat until Bedrock stops asking for tools (or we hit MAX_AGENT_STEPS)

No framework — just a while loop, so you can see exactly what happens."""
from config import MAX_AGENT_STEPS
from agent.bedrock_client import BedrockClient
from agent.tools import build_registry, build_tool_config

SYSTEM_PROMPT = """You are an infrastructure copilot for Nasir's environment
(a Contabo VPS, an AWS account, PostgreSQL, GitHub Actions CI/CD).

Rules:
- You are read-only. Use tools to gather facts before answering.
- Prefer the most specific tool. Explain what you found in plain language.
- If a task would require a write/destructive action, do NOT attempt it —
  describe the exact command the human should run instead.
- Be concise and precise. Cite the tool output you relied on.
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
            self.messages = memory.load_messages(conversation_id)

    def _add(self, role: str, content: list) -> None:
        self.messages.append({"role": role, "content": content})
        if self.memory and self.conversation_id:
            self.memory.save_message(self.conversation_id, role, content)

    def _execute_tool(self, tool_use: dict) -> str:
        tool = self.registry.get(tool_use["name"])
        if not tool:
            return f"Unknown tool: {tool_use['name']}"
        try:
            return tool.run(**tool_use.get("input", {}))
        except Exception as e:  # never let a tool crash the loop
            return f"Tool error: {e}"

    def run(self, user_input: str) -> str:
        self._add("user", [{"text": user_input}])

        for _ in range(MAX_AGENT_STEPS):
            response = self.bedrock.converse(
                messages=self.messages,
                system=SYSTEM_PROMPT,
                tool_config=self.tool_config,
            )
            message = response["output"]["message"]
            self._add(message["role"], message["content"])

            if response.get("stopReason") == "tool_use":
                tool_results = []
                for block in message["content"]:
                    if "toolUse" in block:
                        tu = block["toolUse"]
                        result = self._execute_tool(tu)
                        tool_results.append(
                            {
                                "toolResult": {
                                    "toolUseId": tu["toolUseId"],
                                    "content": [{"text": str(result)}],
                                }
                            }
                        )
                self._add("user", tool_results)
                continue  # let Bedrock reason over the tool results

            # No tool requested -> this is the final answer.
            return "".join(b["text"] for b in message["content"] if "text" in b)

        return "Reached max steps without producing a final answer."
