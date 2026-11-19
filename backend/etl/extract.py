
import pandas as pd
import requests
from bs4 import BeautifulSoup
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib


NOAA_ONI_URL = (
    "https://www.cpc.ncep.noaa.gov/products/"
    "analysis_monitoring/enso/oni/v6/index.php"
)

SEASONS = (
    "DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ",
    "JJA", "JAS", "ASO", "SON", "OND", "NDJ",
)

HEADERS = ["Year", *SEASONS]
@dataclass
class ExtractionResult:
    dataframe: pd.DataFrame
    checksum: str
    extracted_at: datetime


def parse_oni_table(content: bytes) -> pd.DataFrame:
    """Extrait le tableau ONI ERSSTv6 depuis la NOAA."""
    soup = BeautifulSoup(content, "html.parser")

    for table in soup.find_all("table"):
        rows = table.find_all("tr")

        extracted_rows = []

        for row in rows:
            cells = [
                cell.get_text(" ", strip=True)
                for cell in row.find_all(
                    ["th", "td"], recursive=False
                )
            ]

            if len(cells) == 13:
                extracted_rows.append(cells)


            elif (
                2 <= len(cells) < 13
                and cells[0].strip().isdigit()
                and len(cells[0].strip()) == 4
            ):
                extracted_rows.append(
                    cells + [None] * (13 - len(cells))
                )

        if not extracted_rows:
            continue

        # On sélectionne le tableau dont la première
        # ligne structurée correspond aux saisons ONI.
        if extracted_rows[0] != HEADERS:
            continue

        return pd.DataFrame(
            extracted_rows[1:],
            columns=HEADERS,
        )

    raise ValueError("Tableau ONI introuvable sur la page NOAA")

    
def extract_oni_with_metadata() -> ExtractionResult:
    """Télécharge NOAA et retourne les données avec leur provenance."""
    response = requests.get(NOAA_ONI_URL, timeout=20)
    response.raise_for_status()

    extracted_at = datetime.now(timezone.utc)

    checksum = hashlib.sha256(
        response.content
    ).hexdigest()

    dataframe = parse_oni_table(response.content)

    return ExtractionResult(
        dataframe=dataframe,
        checksum=checksum,
        extracted_at=extracted_at,
    )


def extract_oni_table() -> pd.DataFrame:
    """Interface simplifiée conservée pour les tests."""
    return extract_oni_with_metadata().dataframe


if __name__ == "__main__":
    df = extract_oni_table()

    print("Dimensions :", df.shape)
    print(df.head())
    print(df.tail())
