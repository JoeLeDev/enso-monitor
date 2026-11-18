
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[int] = mapped_column(primary_key=True)
    index_id: Mapped[int] = mapped_column(ForeignKey("indices.id"))
    import_id: Mapped[int] = mapped_column(ForeignKey("imports.id"))
    year: Mapped[int] = mapped_column(SmallInteger)
    season: Mapped[str] = mapped_column(String(3))
    season_order: Mapped[int] = mapped_column(SmallInteger)
    value: Mapped[Decimal] = mapped_column(Numeric(4, 1))

    climate_index: Mapped["ClimateIndex"] = relationship(
        back_populates="observations"
    )
    data_import: Mapped["DataImport"] = relationship(
        back_populates="observations"
    )

    __table_args__ = (
        UniqueConstraint(
            "index_id", "year", "season",
            name="uq_observation_index_year_season",
        ),
        CheckConstraint(
            "year BETWEEN 1950 AND 2100",
            name="ck_observation_year",
        ),
        CheckConstraint(
            "season IN ('DJF','JFM','FMA','MAM','AMJ','MJJ',"
            "'JJA','JAS','ASO','SON','OND','NDJ')",
            name="ck_observation_season",
        ),
        CheckConstraint(
            "season_order BETWEEN 1 AND 12",
            name="ck_observation_season_order",
        ),
        Index(
            "idx_observations_period",
            "year",
            "season_order",
        ),
        CheckConstraint(
            """season_order = CASE season
                WHEN 'DJF' THEN 1
                WHEN 'JFM' THEN 2
                WHEN 'FMA' THEN 3
                WHEN 'MAM' THEN 4
                WHEN 'AMJ' THEN 5
                WHEN 'MJJ' THEN 6
                WHEN 'JJA' THEN 7
                WHEN 'JAS' THEN 8
                WHEN 'ASO' THEN 9
                WHEN 'SON' THEN 10
                WHEN 'OND' THEN 11
                WHEN 'NDJ' THEN 12
            END""",
            name="ck_observation_season_mapping",
        ),
    )
