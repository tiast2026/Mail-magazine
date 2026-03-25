from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import clients, generation, newsletters, products, templates

app = FastAPI(
    title="Mail Magazine Generator",
    description="Newsletter auto-generation API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(newsletters.router, prefix="/api/newsletters", tags=["newsletters"])
app.include_router(generation.router, prefix="/api/generate", tags=["generation"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
