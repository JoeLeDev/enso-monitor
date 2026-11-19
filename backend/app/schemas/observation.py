
from pydantic import BaseModel, ConfigDict, Field


class ObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    year: int
    season: str
    season_order: int
    value: float


class ObservationListResponse(BaseModel):
    total: int = Field(ge=0)
    observations: list[ObservationResponse]



class ComparisonPeriod(BaseModel):
    start_year: int
    end_year: int
    total: int = Field(ge=0)
    observations: list[ObservationResponse]


class ComparisonResponse(BaseModel):
    period_1: ComparisonPeriod
    period_2: ComparisonPeriod