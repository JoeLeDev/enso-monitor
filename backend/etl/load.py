
from datetime import datetime, timezone
from decimal import Decimal
import hashlib

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db import SessionLocal
from app.models.index import ClimateIndex
from app.models.source import Source
from app.models.data_import import DataImport
from app.models.observation import Observation

from etl.extract import NOAA_ONI_URL


SOURCE_VERSION = "ERSSTv6"


def load_oni_observations(
    observations: pd.DataFrame,
    checksum: str,
    extracted_at: datetime,
) -> dict:
    """Charge les observations ONI dans PostgreSQL."""

    if observations.empty:
        raise ValueError("Aucune observation à importer")

    expected_columns = {
        "year", "season", "season_order", "value"
    }

    if not expected_columns.issubset(observations.columns):
        raise ValueError("Colonnes d'observation manquantes")

    if len(checksum) != 64 or any(
        character not in "0123456789abcdef"
        for character in checksum
    ):
        raise ValueError("Checksum SHA-256 invalide")

    if extracted_at.tzinfo is None:
        raise ValueError("Date d'extraction sans fuseau horaire")

    # Première transaction : enregistrer l'import.
    with SessionLocal.begin() as session:
        climate_index = session.scalar(
            select(ClimateIndex).where(
                ClimateIndex.code == "ONI"
            )
        )

        if climate_index is None:
            climate_index = ClimateIndex(
                code="ONI",
                name="Oceanic Niño Index",
                unit="°C",
            )
            session.add(climate_index)
            session.flush()

        source = session.scalar(
            select(Source).where(
                Source.organization == "NOAA CPC",
                Source.url == NOAA_ONI_URL,
                Source.version == SOURCE_VERSION,
            )
        )

        if source is None:
            source = Source(
                organization="NOAA CPC",
                url=NOAA_ONI_URL,
                version=SOURCE_VERSION,
            )
            session.add(source)
            session.flush()

        data_import = DataImport(
            source_id=source.id,
            extracted_at=extracted_at,
            status="running",
            checksum=checksum,
            rows_processed=0,
        )

        session.add(data_import)
        session.flush()

        index_id = climate_index.id
        import_id = data_import.id

    # Deuxième transaction : importer les observations.
    try:
        with SessionLocal.begin() as session:
            records = [
                {
                    "index_id": index_id,
                    "import_id": import_id,
                    "year": int(row.year),
                    "season": str(row.season),
                    "season_order": int(row.season_order),
                    "value": Decimal(str(row.value)),
                }
                for row in observations.itertuples(index=False)
            ]

            # Lots pour limiter la taille des requêtes SQL.
            batch_size = 500

            for offset in range(0, len(records), batch_size):
                batch = records[offset:offset + batch_size]

                statement = insert(Observation).values(batch)

                statement = statement.on_conflict_do_update(
                    constraint="uq_observation_index_year_season",
                    set_={
                        "value": statement.excluded.value,
                        "season_order": (
                            statement.excluded.season_order
                        ),
                        "import_id": (
                            statement.excluded.import_id
                        ),
                    },
                    where=(
                        Observation.value.is_distinct_from(
                            statement.excluded.value
                        )
                        | Observation.season_order.is_distinct_from(
                            statement.excluded.season_order
                        )
                    ),
                )

                session.execute(statement)

            data_import = session.get(DataImport, import_id)
            data_import.status = "success"
            data_import.rows_processed = len(records)

    except Exception:
        # L'échec est enregistré séparément du rollback
        # des observations.
        with SessionLocal.begin() as session:
            data_import = session.get(DataImport, import_id)
            data_import.status = "failed"
            data_import.rows_processed = 0

        raise

    return {
        "import_id": import_id,
        "status": "success",
        "rows_processed": len(records),
    }
