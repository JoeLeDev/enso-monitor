
from datetime import datetime, timezone
from decimal import Decimal
import hashlib

import pandas as pd
import pytest
from sqlalchemy import select, func
from sqlalchemy.engine import make_url

from app.db import SessionLocal, settings, engine
from app.models.index import ClimateIndex
from app.models.source import Source
from app.models.data_import import DataImport
from app.models.observation import Observation
from etl.load import load_oni_observations


@pytest.fixture
def test_database():
    database = make_url(settings.database_url).database

    if database != "enso_monitor_test":
        pytest.fail(
            "Tests interdits hors de enso_monitor_test"
        )

    with engine.connect() as conn:
        actual = conn.exec_driver_sql(
            "SELECT current_database()"
        ).scalar_one()

    if actual != "enso_monitor_test":
        pytest.fail("Connexion à la mauvaise base")

    with SessionLocal() as session:
        counts = [
            session.scalar(select(func.count()).select_from(model))
            for model in (
                Observation, DataImport, ClimateIndex, Source
            )
        ]

    if any(counts):
        pytest.fail(
            "La base de test doit être vide avant les tests"
        )

    yield

    # Nettoyage uniquement après vérification de la base cible.
    with SessionLocal.begin() as session:
        session.query(Observation).delete()
        session.query(DataImport).delete()
        session.query(ClimateIndex).delete()
        session.query(Source).delete()


@pytest.fixture
def sample_data():
    return pd.DataFrame([
        {
            "year": 1997,
            "season": "DJF",
            "season_order": 1,
            "value": 0.4,
        },
        {
            "year": 1997,
            "season": "JFM",
            "season_order": 2,
            "value": 0.5,
        },
    ])


def checksum_for(value):
    return hashlib.sha256(value.encode()).hexdigest()


def import_data(data, version="initial"):
    return load_oni_observations(
        observations=data,
        checksum=checksum_for(version),
        extracted_at=datetime.now(timezone.utc),
    )


@pytest.mark.usefixtures("test_database")
def test_initial_import(sample_data):
    result = import_data(sample_data)

    assert result["status"] == "success"
    assert result["rows_processed"] == 2

    with SessionLocal() as session:
        count = session.scalar(
            select(func.count()).select_from(Observation)
        )
        assert count == 2


@pytest.mark.usefixtures("test_database")
def test_identical_import_does_not_duplicate(sample_data):
    first = import_data(sample_data)
    second = import_data(sample_data, "second")

    with SessionLocal() as session:
        observations = session.scalars(
            select(Observation)
        ).all()

        assert len(observations) == 2
        assert all(
            obs.import_id == first["import_id"]
            for obs in observations
        )

        imports_count = session.scalar(
            select(func.count()).select_from(DataImport)
        )
        assert imports_count == 2

    assert second["status"] == "success"


@pytest.mark.usefixtures("test_database")
def test_noaa_revision_updates_value(sample_data):
    first = import_data(sample_data)

    revised = sample_data.copy()
    revised.loc[
        revised["season"] == "DJF", "value"
    ] = 0.8

    second = import_data(revised, "revision")

    with SessionLocal() as session:
        observations = session.scalars(
            select(Observation).order_by(
                Observation.season_order
            )
        ).all()

        assert len(observations) == 2

        assert observations[0].value == Decimal("0.8")
        assert observations[0].import_id == second["import_id"]

        assert observations[1].value == Decimal("0.5")
        assert observations[1].import_id == first["import_id"]


@pytest.mark.usefixtures("test_database")
def test_failed_import_rolls_back(sample_data):
    invalid = sample_data.copy()

    # Première ligne valide, deuxième ligne invalide.
    invalid.loc[1, "season"] = "INVALID"

    with pytest.raises(Exception):
        import_data(invalid, "invalid")

    with SessionLocal() as session:
        count = session.scalar(
            select(func.count()).select_from(Observation)
        )
        assert count == 0

        data_import = session.scalar(
            select(DataImport)
        )

        assert data_import is not None
        assert data_import.status == "failed"
        assert data_import.rows_processed == 0
