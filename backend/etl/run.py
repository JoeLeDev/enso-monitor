
from etl.extract import extract_oni_with_metadata
from etl.transform import transform_oni_table
from etl.load import load_oni_observations


def run_etl() -> dict:
    """Exécute le pipeline NOAA ONI."""

    print("[ETL] Extraction NOAA...")
    extraction = extract_oni_with_metadata()

    print("[ETL] Transformation...")
    observations = transform_oni_table(
        extraction.dataframe
    )

    print(
        f"[ETL] {len(observations)} observations validées"
    )

    print("[ETL] Chargement PostgreSQL...")
    result = load_oni_observations(
        observations=observations,
        checksum=extraction.checksum,
        extracted_at=extraction.extracted_at,
    )

    print(
        f"[ETL] Import #{result['import_id']} terminé : "
        f"{result['rows_processed']} observations traitées"
    )

    return result


if __name__ == "__main__":
    run_etl()
