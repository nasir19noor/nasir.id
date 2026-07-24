"""api.agent.nasir.id — FastAPI front door for the Bedrock agent.

Endpoints
  GET  /health              liveness + dependency status
  GET  /tools               what the agent can do
  POST /chat                run the loop, return the final answer
  POST /chat/stream         run the loop, stream every step as SSE
  GET  /conversations/{id}  replay a stored conversation
"""
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from config import CORS_ORIGINS, BEDROCK_MODEL_ID, AWS_REGION
from agent.core import Agent
from agent.memory import Memory
from agent.tools import build_registry

app = FastAPI(title="Nasir Infra Copilot", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

memory = Memory()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: int | None = None


def _new_conversation(title: str) -> int | None:
    """Memory is best-effort: if PostgreSQL is down the agent still answers,
    it just won't remember anything."""
    try:
        return memory.create_conversation(title)
    except Exception:
        return None


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "region": AWS_REGION,
        "model": BEDROCK_MODEL_ID,
        "memory": "up" if memory.healthy() else "down",
    }


@app.get("/tools")
def tools():
    return {
        "tools": [
            {"name": t.name, "description": t.description}
            for t in build_registry().values()
        ]
    }


@app.post("/chat")
def chat(req: ChatRequest):
    conversation_id = req.conversation_id or _new_conversation("api")
    agent = Agent(memory=memory, conversation_id=conversation_id)
    return {"conversation_id": conversation_id, "answer": agent.run(req.message)}


@app.post("/chat/stream")
def chat_stream(req: ChatRequest):
    conversation_id = req.conversation_id or _new_conversation("web")
    agent = Agent(memory=memory, conversation_id=conversation_id)

    def events():
        yield _sse({"type": "start", "conversation_id": conversation_id})
        try:
            for event in agent.run_stream(req.message):
                yield _sse(event)
        except Exception as e:  # surface the failure to the UI, don't hang it
            yield _sse({"type": "error", "message": str(e)})
        yield _sse({"type": "end"})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # stop nginx from buffering the stream
        },
    )


@app.get("/conversations/{conversation_id}")
def conversation(conversation_id: int):
    try:
        return {
            "conversation_id": conversation_id,
            "messages": memory.load_messages(conversation_id),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Memory unavailable: {e}")
