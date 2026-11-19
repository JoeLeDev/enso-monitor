
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.observations import get_db
from app.schemas.observation import ComparisonResponse
from app.services.observations import get_observations


router = APIRouter(
    prefix="/api/v1",
    tags=["Comparison"],
)


@router.get("/compare", response_model=ComparisonResponse)
def compare_periods(
    session: Annotated[Session, Depends(get_db)],
    start_year_1: Annotated[int, Query(ge=1950, le=2100)] = 1997,
    end_year_1: Annotated[int, Query(ge=1950, le=2100)] = 1998,
    start_year_2: Annotated[int, Query(ge=1950, le=2100)] = 2015,
    end_year_2: Annotated[int, Query(ge=1950, le=2100)] = 2016,
):
    if start_year_1 > end_year_1 or start_year_2 > end_year_2:
        raise HTTPException(
            status_code=422,
            detail="Les années de début doivent précéder les années de fin",
        )

    observations_1 = get_observations(
        session=session,
        start_year=start_year_1,
        end_year=end_year_1,
    )

    observations_2 = get_observations(
        session=session,
        start_year=start_year_2,
        end_year=end_year_2,
    )

    return {
        "period_1": {
            "start_year": start_year_1,
            "end_year": end_year_1,
            "total": len(observations_1),
            "observations": observations_1,
        },
        "period_2": {
            "start_year": start_year_2,
            "end_year": end_year_2,
            "total": len(observations_2),
            "observations": observations_2,
        },
    }
