
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.schemas.observation import ObservationListResponse
from app.services.observations import get_observations


router = APIRouter(
    prefix="/api/v1/observations",
    tags=["Observations"],
)


def get_db():
    with SessionLocal() as session:
        yield session


@router.get("", response_model=ObservationListResponse)
def list_observations(
    session: Annotated[Session, Depends(get_db)],
    start_year: Annotated[
        Optional[int],
        Query(ge=1950, le=2100),
    ] = None,
    end_year: Annotated[
        Optional[int],
        Query(ge=1950, le=2100),
    ] = None,
):
    if (
        start_year is not None
        and end_year is not None
        and start_year > end_year
    ):
        raise HTTPException(
            status_code=422,
            detail="start_year doit être inférieur ou égal à end_year",
        )

    observations = get_observations(
        session=session,
        start_year=start_year,
        end_year=end_year,
    )

    return {
        "total": len(observations),
        "observations": observations,
    }
