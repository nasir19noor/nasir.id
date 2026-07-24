"""Interactive CLI for local testing. Run: python main.py"""
from agent.core import Agent
from agent.memory import Memory


def main():
    memory, conv_id = None, None
    try:
        memory = Memory()
        conv_id = memory.create_conversation("cli-session")
    except Exception:
        print("(memory disabled — could not connect to PostgreSQL)\n")

    agent = Agent(memory=memory, conversation_id=conv_id)
    print("Infra copilot ready. Type 'exit' to quit.\n")
    while True:
        try:
            user = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if user.lower() in {"exit", "quit"}:
            break
        if not user:
            continue
        print(f"\nagent> {agent.run(user)}\n")


if __name__ == "__main__":
    main()
