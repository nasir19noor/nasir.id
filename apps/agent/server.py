"""HTTP API for the deployed agent. Runs in the container on the VPS; front it
with Cloudflare DNS -> your VPS. Run: uvicorn server:app --host 0.0.0.0 --port 8000"""
from fastapi import FastAPI
from pydantic import BaseModel
from agent.core import Agent
from agent.memory import Memory

app = FastAPI(title="Nasir Infra Copilot")
memory = Memory()


class Query(BaseModel):
    message: str
    conversation_id: int | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
def chat(q: Query):
    conv_id = q.conversation_id or memory.create_conversation("api-session")
    agent = Agent(memory=memory, conversation_id=conv_id)
    return {"conversation_id": conv_id, "answer": agent.run(q.message)}
