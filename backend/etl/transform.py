
import pandas as pd

from etl.extract import SEASONS


def transform_oni_table(df: pd.DataFrame) -> pd.DataFrame:
    """Transforme le tableau NOAA en observations ONI validées."""
    required_columns = {"Year", *SEASONS}

    if not required_columns.issubset(df.columns):
        raise ValueError("Colonnes NOAA manquantes")

    # Ne conserver que les lignes dont l'année est valide.
    data = df.copy()
    years = pd.to_numeric(data["Year"], errors="coerce")
    data = data.loc[years.notna()].copy()
    data["year"] = years.loc[data.index].astype(int)

    if data.empty:
        raise ValueError("Aucune observation NOAA valide")

    if not data["year"].between(1950, 2100).all():
        raise ValueError("Année hors des limites autorisées")

    # Passer du format large au format long.
    observations = data.melt(
        id_vars=["year"],
        value_vars=list(SEASONS),
        var_name="season",
        value_name="value",
    )

    # Les saisons non encore publiées peuvent être absentes.
    observations["value"] = observations["value"].replace(
        {"": None, "None": None}
    )
    observations = observations.dropna(subset=["value"])

    # Une valeur non numérique publiée doit provoquer une erreur.
    observations["value"] = pd.to_numeric(
        observations["value"],
        errors="raise",
    )

    if not observations["value"].between(-9.9, 9.9).all():
        raise ValueError("Valeur ONI hors limites")

    # Vérifier la précision attendue par NUMERIC(4,1).
    if not (
        (observations["value"] * 10).round(6) % 1 == 0
    ).all():
        raise ValueError("Précision ONI invalide")

    season_orders = {
        season: order
        for order, season in enumerate(SEASONS, start=1)
    }

    observations["season_order"] = (
        observations["season"].map(season_orders).astype(int)
    )

    if observations.duplicated(
        subset=["year", "season"]
    ).any():
        raise ValueError("Observations NOAA dupliquées")

    return (
        observations[
            ["year", "season", "season_order", "value"]
        ]
        .sort_values(["year", "season_order"])
        .reset_index(drop=True)
    )


if __name__ == "__main__":
    from etl.extract import extract_oni_table

    raw = extract_oni_table()
    transformed = transform_oni_table(raw)

    print("Observations :", len(transformed))
    print(transformed.head(15).to_string(index=False))
    print(transformed.tail(15).to_string(index=False))
    print("Doublons :", transformed.duplicated(
        ["year", "season"]
    ).sum())
