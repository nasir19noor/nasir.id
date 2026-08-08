from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import parents, children, devices, agent, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LayarSehat API",
    description="API untuk memantau dan mengontrol aktivitas smartphone anak",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://layarsehat.nasir.id",
        "http://localhost:5005",
        "http://localhost:4321",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parents.router)
app.include_router(children.router)
app.include_router(devices.router)
app.include_router(agent.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"app": "LayarSehat API", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}
