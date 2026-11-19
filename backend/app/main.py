
from fastapi import FastAPI

from app.api.observations import router as observations_router
from app.api.comparison import router as comparison_router

app = FastAPI(
    title="ENSO Monitor API",
    description="API d'exploration historique de l'indice ONI",
    version="0.1.0",
)


@app.get("/api/v1/health", tags=["Health"])
def health():
    return {"status": "ok"}


app.include_router(observations_router)
app.include_router(comparison_router)