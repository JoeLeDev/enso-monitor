from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.index import ClimateIndex
from app.models.observation import Observation


def get_observations(
    session: Session,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
) -> list[Observation]:
    statement = (
        select(Observation)
        .join(ClimateIndex)
        .where(ClimateIndex.code == "ONI")
    )

    if start_year is not None:
        statement = statement.where(Observation.year >= start_year)

    if end_year is not None:
        statement = statement.where(Observation.year <= end_year)

    statement = statement.order_by(
        Observation.year,
        Observation.season_order,
    )

    return list(session.scalars(statement).all())

