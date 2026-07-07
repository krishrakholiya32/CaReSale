"""
Loads the trained model artifacts once at startup and serves predictions.

Real sellers don't know their car's exact engine CC / max power / torque off-hand, so
those are auto-filled from a per-model (falling back to per-brand, falling back to
overall) median spec lookup built from the training data, rather than asked directly.
"""

from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models"

_quantile_models = joblib.load(ARTIFACTS_DIR / "price_model_quantiles.joblib")
_encoder = joblib.load(ARTIFACTS_DIR / "categorical_encoder.joblib")
_spec_lookup = joblib.load(ARTIFACTS_DIR / "spec_lookup.joblib")
_cleaned = pd.read_parquet(ARTIFACTS_DIR / "cleaned_listings.parquet")
KNOWN_CAR_NAMES: list[str] = joblib.load(ARTIFACTS_DIR / "known_car_names.joblib")
KNOWN_BRANDS: list[str] = joblib.load(ARTIFACTS_DIR / "known_brands.joblib")

CATEGORICAL_COLS = ["brand", "fuel", "seller_type", "transmission", "owner"]
SPEC_COLS = ["mileage_kmpl", "engine_cc", "max_power_bhp", "torque_nm", "seats"]

# Trust the model's own recorded training column order rather than assuming it —
# avoids silently mis-ordering features if the notebook's column order ever changes.
_FEATURE_ORDER = list(_quantile_models[0.5].feature_name_)

CURRENT_YEAR = int(_cleaned["year"].max()) + 1


def _resolve_specs(name: str, brand: str, seats_override: Optional[int]) -> dict:
    model_specs = _spec_lookup["model_specs"]
    brand_specs = _spec_lookup["brand_specs"]
    overall_specs = _spec_lookup["overall_specs"]

    # A model name existing in the lookup doesn't guarantee every spec column is
    # non-NaN — some models only ever appeared in the spec-less `basic` dataset, so
    # individual columns can still be NaN even though the model itself is "known".
    # Fall back per-column (model -> brand -> overall) rather than per-row, otherwise
    # a partially-missing model silently produces a NaN that breaks JSON serialization.
    specs = {}
    for col in SPEC_COLS:
        value = model_specs.loc[name, col] if name in model_specs.index else float("nan")
        if pd.isna(value):
            value = brand_specs.loc[brand, col] if brand in brand_specs.index else float("nan")
        if pd.isna(value):
            value = overall_specs[col]
        specs[col] = value

    if seats_override is not None:
        specs["seats"] = seats_override
    return specs


def predict(
    name: str,
    year: int,
    km_driven: int,
    fuel: str,
    seller_type: str,
    transmission: str,
    owner: str,
    seats_override: Optional[int] = None,
) -> dict:
    brand = name.split()[0].title() if name else ""
    specs = _resolve_specs(name, brand, seats_override)
    car_age = CURRENT_YEAR - year

    row = {
        "brand": brand,
        "fuel": fuel,
        "seller_type": seller_type,
        "transmission": transmission,
        "owner": owner,
        "car_age": car_age,
        "km_driven": km_driven,
        **specs,
    }
    row_df = pd.DataFrame([row])
    row_df[CATEGORICAL_COLS] = _encoder.transform(row_df[CATEGORICAL_COLS].astype(str))
    row_df = row_df[_FEATURE_ORDER]

    low = float(_quantile_models[0.1].predict(row_df)[0])
    mid = float(_quantile_models[0.5].predict(row_df)[0])
    high = float(_quantile_models[0.9].predict(row_df)[0])

    price_low = float(np.expm1(low))
    price_median = float(np.expm1(mid))
    price_high = float(np.expm1(high))
    # Quantile models are trained independently, so ordering isn't mathematically
    # guaranteed. Sort defensively so the range is never displayed backwards.
    price_low, price_median, price_high = sorted([price_low, price_median, price_high])

    similar = find_similar_listings(brand, car_age, km_driven)

    return {
        "price_low": round(price_low, -3),
        "price_median": round(price_median, -3),
        "price_high": round(price_high, -3),
        "specs_used": {k: (round(v, 1) if isinstance(v, float) else v) for k, v in specs.items()},
        "car_age": car_age,
        "similar_listings": similar,
    }


def find_similar_listings(brand: str, car_age: int, km_driven: int, limit: int = 5) -> list[dict]:
    candidates = _cleaned[_cleaned["brand"] == brand].copy()
    if candidates.empty:
        return []
    # ~25% of rows are exact re-listings of the same car (scraped across multiple
    # sources) — dedupe first, otherwise "similar listings" can show the same car
    # repeated instead of genuinely different comparables.
    candidates = candidates.drop_duplicates(subset=["name", "year", "km_driven", "selling_price"])
    candidates["current_year_local"] = CURRENT_YEAR
    candidates["age_diff"] = (candidates["current_year_local"] - candidates["year"] - car_age).abs()
    candidates["km_diff"] = (candidates["km_driven"] - km_driven).abs()
    candidates["score"] = candidates["age_diff"] * 50000 + candidates["km_diff"]
    top = candidates.sort_values("score").head(limit)
    return top[["name", "year", "km_driven", "fuel", "transmission", "owner", "selling_price"]].to_dict("records")


def search_car_names(query: str, brand: Optional[str] = None, limit: int = 20) -> list[str]:
    query_lower = query.lower()
    matches = [n for n in KNOWN_CAR_NAMES if query_lower in n.lower()]
    if brand:
        matches = [n for n in matches if n.lower().startswith(brand.lower())]
        # Listing every model for a brand (empty query) is a dropdown, not a
        # ranked search result, so it should read alphabetically.
        if not query:
            matches = sorted(matches)
    return matches[:limit]
