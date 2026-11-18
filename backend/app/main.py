
from fastapi import FastAPI

app = FastAPI(
    title="ENSO Monitor API",
    description="API d'exploration historique de l'indice ONI",
    version="0.1.0",
)


@app.get("/api/v1/health", tags=["Health"])
def health():
    return {"status": "ok"}
