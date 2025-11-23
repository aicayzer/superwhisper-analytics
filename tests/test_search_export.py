"""Unit tests for search export module."""

import json
from pathlib import Path

import pytest

from lib.search.search_export import export_search_results


@pytest.fixture
def sample_search_results():
    """Sample search results for testing."""
    return {
        "search_term": "database",
        "search_mode": "exact",
        "case_sensitive": False,
        "similarity_threshold": None,
        "total_matches": 5,
        "recordings_with_matches": 2,
        "matches": [
            {
                "recording_id": "1234567890",
                "date": "2025-01-15",
                "datetime": "2025-01-15T10:30:00",
                "mode": "Chat",
                "duration_seconds": 45.2,
                "word_count": 150,
                "occurrence_count": 3,
                "excerpts": ["...talking about the database system..."],
            },
            {
                "recording_id": "1234567891",
                "date": "2025-01-16",
                "datetime": "2025-01-16T14:20:00",
                "mode": "Dictation",
                "duration_seconds": 30.5,
                "word_count": 100,
                "occurrence_count": 2,
                "excerpts": ["...database query performance..."],
            },
        ],
    }


@pytest.fixture
def sample_fuzzy_results():
    """Sample fuzzy search results for testing."""
    return {
        "search_term": "bigqery",
        "search_mode": "fuzzy",
        "case_sensitive": False,
        "similarity_threshold": 80,
        "total_matches": 2,
        "recordings_with_matches": 2,
        "matches": [
            {
                "recording_id": "1234567890",
                "date": "2025-01-15",
                "datetime": "2025-01-15T10:30:00",
                "mode": "Chat",
                "duration_seconds": 45.2,
                "word_count": 150,
                "occurrence_count": 1,
                "similarity_score": 85,
                "excerpts": ["...using BigQuery for analytics..."],
            },
            {
                "recording_id": "1234567891",
                "date": "2025-01-16",
                "datetime": "2025-01-16T14:20:00",
                "mode": "Dictation",
                "duration_seconds": 30.5,
                "word_count": 100,
                "occurrence_count": 1,
                "similarity_score": 82,
                "excerpts": ["...BigQuery table schema..."],
            },
        ],
    }


class TestExportSearchResults:
    """Tests for export_search_results function."""

    def test_export_to_csv_auto_detect(self, sample_search_results, tmp_path):
        """Test CSV export with auto-detected format."""
        output_file = tmp_path / "results.csv"
        export_search_results(sample_search_results, output_file)

        assert output_file.exists()
        content = output_file.read_text()
        assert "database" in content.lower()
        assert "1234567890" in content

    def test_export_to_json_auto_detect(self, sample_search_results, tmp_path):
        """Test JSON export with auto-detected format."""
        output_file = tmp_path / "results.json"
        export_search_results(sample_search_results, output_file)

        assert output_file.exists()
        with open(output_file) as f:
            data = json.load(f)

        assert data["search_metadata"]["search_term"] == "database"
        assert len(data["matches"]) == 2

    def test_export_csv_explicit_format(self, sample_search_results, tmp_path):
        """Test CSV export with explicit format."""
        output_file = tmp_path / "results.txt"
        export_search_results(sample_search_results, output_file, format="csv")

        assert output_file.exists()

    def test_export_json_explicit_format(self, sample_search_results, tmp_path):
        """Test JSON export with explicit format."""
        output_file = tmp_path / "results.txt"
        export_search_results(sample_search_results, output_file, format="json")

        assert output_file.exists()
        with open(output_file) as f:
            json.load(f)  # Should not raise

    def test_export_invalid_format(self, sample_search_results, tmp_path):
        """Test that invalid format raises ValueError."""
        output_file = tmp_path / "results.txt"
        with pytest.raises(ValueError, match="Unsupported export format"):
            export_search_results(sample_search_results, output_file, format="xml")

    def test_export_unknown_extension(self, sample_search_results, tmp_path):
        """Test that unknown extension raises ValueError."""
        output_file = tmp_path / "results.xyz"
        with pytest.raises(ValueError, match="Cannot determine format"):
            export_search_results(sample_search_results, output_file)

    def test_csv_includes_similarity_score(self, sample_fuzzy_results, tmp_path):
        """Test CSV export includes similarity score for fuzzy results."""
        output_file = tmp_path / "results.csv"
        export_search_results(sample_fuzzy_results, output_file)

        content = output_file.read_text()
        assert "similarity_score" in content
        assert "85" in content

    def test_json_preserves_metadata(self, sample_fuzzy_results, tmp_path):
        """Test JSON export preserves all metadata."""
        output_file = tmp_path / "results.json"
        export_search_results(sample_fuzzy_results, output_file)

        with open(output_file) as f:
            data = json.load(f)

        metadata = data["search_metadata"]
        assert metadata["search_mode"] == "fuzzy"
        assert metadata["similarity_threshold"] == 80
        assert metadata["total_matches"] == 2

