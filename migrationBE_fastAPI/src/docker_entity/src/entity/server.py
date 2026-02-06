from fastapi import FastAPI
from routers.router import router

app = FastAPI(title="noteboard-api")
app.include_router(router)
