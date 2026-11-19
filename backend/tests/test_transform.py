
import pandas as pd
import pytest

from etl.transform import transform_oni_table
from etl.extract import SEASONS


def make_sample():
    return pd.DataFrame([
        {
            "Year": "1997",
            **{season: "0.5" for season in SEASONS},
        },
        {
            "Year": "2026",
            **{
                season: ("0.8" if i < 9 else None)
                for i, season in enumerate(SEASONS)
            },
        },
    ])


def test_transform_observations():
    result = transform_oni_table(make_sample())

    assert len(result) == 21
    assert result["year"].tolist()[0] == 1997
    assert result["season_order"].min() == 1
    assert result["season_order"].max() == 12


def test_missing_values_are_ignored():
    result = transform_oni_table(make_sample())

    assert len(result[result["year"] == 2026]) == 9


def test_duplicate_observations_are_rejected():
    sample = make_sample()
    duplicated = pd.concat(
        [sample, sample.iloc[[0]]],
        ignore_index=True,
    )

    with pytest.raises(ValueError, match="dupliquées"):
        transform_oni_table(duplicated)


def test_invalid_numeric_value_is_rejected():
    sample = make_sample()
    sample.loc[0, "DJF"] = "invalid"

    with pytest.raises(ValueError):
        transform_oni_table(sample)


def test_repeated_headers_are_ignored():
    sample = make_sample()

    repeated_header = pd.DataFrame(
        [{"Year": "Year", **{s: s for s in SEASONS}}]
    )

    combined = pd.concat(
        [sample, repeated_header],
        ignore_index=True,
    )

    result = transform_oni_table(combined)

    assert len(result) == 21
