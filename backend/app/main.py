import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.predict import router as predict_router

logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="CarPricePredictor API",
    description="Predicts a realistic used-car resale price range for the Indian market.",
    version="1.0.0",
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOW_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Letting an exception propagate past this point causes Starlette's own error
    # response to skip CORSMiddleware in some cases, which then shows up in the
    # browser as a misleading "CORS blocked" error that hides the real 500 cause.
    # Returning a JSONResponse here instead ensures CORS headers are always attached.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "healthy"}


_FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if _FRONTEND_DIST.exists():
    _assets_dir = _FRONTEND_DIST / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    _FRONTEND_DIST_RESOLVED = _FRONTEND_DIST.resolve()

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        candidate = (_FRONTEND_DIST / full_path).resolve()
        # Reject anything that escapes the dist dir (e.g. "../../backend/app/main.py")
        # before ever touching the filesystem for existence/is_file checks.
        if (
            full_path
            and candidate.is_relative_to(_FRONTEND_DIST_RESOLVED)
            and candidate.is_file()
        ):
            return FileResponse(str(candidate))
        return FileResponse(str(_FRONTEND_DIST / "index.html"))
