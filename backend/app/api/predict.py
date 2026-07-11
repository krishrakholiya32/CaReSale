from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field, field_validator

from app.services import predictor

router = APIRouter(prefix="/api")


class PredictRequest(BaseModel):
    name: str = Field(..., description="Car model name, e.g. 'Maruti Swift Dzire VDI'")
    year: int = Field(..., ge=1990, le=2030)
    km_driven: int = Field(..., ge=0)
    fuel: str
    seller_type: str
    transmission: str
    owner: str
    seats: Optional[int] = Field(None, ge=2, le=14)

    @field_validator("fuel", "seller_type", "transmission", "owner")
    @classmethod
    def _known_category(cls, v: str, info) -> str:
        known = predictor.KNOWN_CATEGORIES[info.field_name]
        if v not in known:
            raise ValueError(f"must be one of {known}")
        return v


@router.post("/predict")
def predict_price(req: PredictRequest):
    return predictor.predict(
        name=req.name,
        year=req.year,
        km_driven=req.km_driven,
        fuel=req.fuel,
        seller_type=req.seller_type,
        transmission=req.transmission,
        owner=req.owner,
        seats_override=req.seats,
    )


@router.get("/brands")
def get_brands():
    return predictor.KNOWN_BRANDS


@router.get("/models")
def search_models(
    q: str = Query("", min_length=0),
    brand: Optional[str] = None,
    limit: int = Query(20, ge=1, le=1000),
):
    return predictor.search_car_names(q, brand=brand, limit=limit)
