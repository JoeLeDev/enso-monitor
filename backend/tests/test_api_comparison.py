
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.observations import get_db


@pytest.fixture
def client():
    session = MagicMock()

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def make_observation(year, season, season_order, value):
    return MagicMock(
        year=year,
        season=season,
        season_order=season_order,
        value=value,
    )


def test_compare_default_periods(client, monkeypatch):
    calls = []

    def fake_get_observations(session, start_year, end_year):
        calls.append((start_year, end_year))

        return [
            make_observation(start_year, "DJF", 1, 0.5),
            make_observation(end_year, "NDJ", 12, 1.2),
        ]

    monkeypatch.setattr(
        "app.api.comparison.get_observations",
        fake_get_observations,
    )

    response = client.get("/api/v1/compare")

    assert response.status_code == 200

    data = response.json()

    assert calls == [(1997, 1998), (2015, 2016)]
    assert data["period_1"]["total"] == 2
    assert data["period_2"]["total"] == 2
    assert data["period_1"]["start_year"] == 1997
    assert data["period_2"]["end_year"] == 2016
    assert data["period_1"]["observations"][0]["season"] == "DJF"


def test_compare_custom_periods(client, monkeypatch):
    calls = []

    def fake_get_observations(session, start_year, end_year):
        calls.append((start_year, end_year))
        return []

    monkeypatch.setattr(
        "app.api.comparison.get_observations",
        fake_get_observations,
    )

    response = client.get(
        "/api/v1/compare"
        "?start_year_1=1982&end_year_1=1983"
        "&start_year_2=1997&end_year_2=1998"
    )

    assert response.status_code == 200
    assert calls == [(1982, 1983), (1997, 1998)]
    assert response.json()["period_1"]["total"] == 0


@pytest.mark.parametrize(
    "query",
    [
        "start_year_1=2000&end_year_1=1990",
        "start_year_2=2020&end_year_2=2010",
    ],
)
def test_compare_invalid_ranges(client, query):
    response = client.get(f"/api/v1/compare?{query}")

    assert response.status_code == 422


@pytest.mark.parametrize(
    "query",
    [
        "start_year_1=1949",
        "end_year_2=2101",
        "start_year_2=abc",
    ],
)
def test_compare_invalid_parameters(client, query):
    response = client.get(f"/api/v1/compare?{query}")

    assert response.status_code == 422
