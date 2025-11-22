"""Unit tests for transcript search module."""

import json
from pathlib import Path
from tempfile import TemporaryDirectory

from lib.search.transcript_search import search_transcripts


class TestSearchTranscripts:
    """Tests for search_transcripts function."""

    def create_test_recording(self, tmpdir: Path, timestamp: str, transcript: str, mode: str = "Default") -> None:
        """Helper to create a test recording folder with meta.json."""
        folder = tmpdir / timestamp
        folder.mkdir()
        meta = {
            "result": transcript,
            "datetime": "2025-01-15T10:00:00Z",
            "duration": 60000,  # 60 seconds
            "modeName": mode,
        }
        with open(folder / "meta.json", "w", encoding="utf-8") as f:
            json.dump(meta, f)

    def test_basic_search(self):
        """Test basic search functionality."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create test recordings
            self.create_test_recording(tmpdir_path, "1640000000", "This is a test recording about databases")
            self.create_test_recording(tmpdir_path, "1640000100", "Another recording mentioning database systems")
            self.create_test_recording(tmpdir_path, "1640000200", "No matching content here")

            results = search_transcripts(tmpdir_path, "database")

            assert results["search_term"] == "database"
            assert results["total_matches"] == 2
            assert results["recordings_with_matches"] == 2
            assert len(results["matches"]) == 2

    def test_case_sensitive_search(self):
        """Test case-sensitive search."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            self.create_test_recording(tmpdir_path, "1640000000", "BigQuery is great")
            self.create_test_recording(tmpdir_path, "1640000100", "bigquery is also good")
            self.create_test_recording(tmpdir_path, "1640000200", "BIGQUERY works too")

            # Case-insensitive should find all
            results_insensitive = search_transcripts(tmpdir_path, "bigquery", case_sensitive=False)
            assert results_insensitive["total_matches"] == 3

            # Case-sensitive should find only exact match
            results_sensitive = search_transcripts(tmpdir_path, "bigquery", case_sensitive=True)
            assert results_sensitive["total_matches"] == 1

    def test_multiple_occurrences_in_one_recording(self):
        """Test counting multiple occurrences in single recording."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            self.create_test_recording(
                tmpdir_path,
                "1640000000",
                "Python is great. Python is versatile. I love Python programming."
            )

            results = search_transcripts(tmpdir_path, "Python")

            assert results["total_matches"] == 3
            assert results["recordings_with_matches"] == 1
            assert results["matches"][0]["occurrence_count"] == 3

    def test_phrase_search(self):
        """Test searching for multi-word phrases."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            self.create_test_recording(tmpdir_path, "1640000000", "The data warehouse is ready")
            self.create_test_recording(tmpdir_path, "1640000100", "We have data and a warehouse")

            results = search_transcripts(tmpdir_path, "data warehouse")

            assert results["total_matches"] == 1
            assert results["recordings_with_matches"] == 1

    def test_no_matches(self):
        """Test search with no matches."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            self.create_test_recording(tmpdir_path, "1640000000", "Some content here")
            self.create_test_recording(tmpdir_path, "1640000100", "Different content")

            results = search_transcripts(tmpdir_path, "nonexistent")

            assert results["total_matches"] == 0
            assert results["recordings_with_matches"] == 0
            assert len(results["matches"]) == 0

    def test_excerpts_extraction(self):
        """Test that excerpts are extracted with context."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            long_text = (
                "This is a long piece of text. " * 5 +
                "KEYWORD here in the middle. " +
                "This is more text after. " * 5
            )
            self.create_test_recording(tmpdir_path, "1640000000", long_text)

            results = search_transcripts(tmpdir_path, "KEYWORD")

            assert len(results["matches"]) == 1
            match = results["matches"][0]
            assert len(match["excerpts"]) == 1
            excerpt = match["excerpts"][0]

            # Excerpt should contain the keyword
            assert "KEYWORD" in excerpt
            # Excerpt should have context (ellipsis if truncated)
            assert "..." in excerpt

    def test_sorting_by_occurrence_count(self):
        """Test that results are sorted by occurrence count."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            self.create_test_recording(tmpdir_path, "1640000000", "test")
            self.create_test_recording(tmpdir_path, "1640000100", "test test")
            self.create_test_recording(tmpdir_path, "1640000200", "test test test")

            results = search_transcripts(tmpdir_path, "test")

            assert len(results["matches"]) == 3
            # Should be sorted in descending order
            assert results["matches"][0]["occurrence_count"] == 3
            assert results["matches"][1]["occurrence_count"] == 2
            assert results["matches"][2]["occurrence_count"] == 1

    def test_skips_corrupt_json(self):
        """Test that corrupt JSON files are skipped gracefully."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create valid recording
            self.create_test_recording(tmpdir_path, "1640000000", "valid content")

            # Create corrupt recording
            corrupt_folder = tmpdir_path / "1640000100"
            corrupt_folder.mkdir()
            with open(corrupt_folder / "meta.json", "w") as f:
                f.write("{ invalid json }")

            results = search_transcripts(tmpdir_path, "content")

            # Should find the valid one, skip the corrupt one
            assert results["total_matches"] == 1
            assert results["recordings_with_matches"] == 1

    def test_skips_missing_transcript(self):
        """Test that recordings without transcripts are skipped."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create recording with transcript
            self.create_test_recording(tmpdir_path, "1640000000", "has content")

            # Create recording without transcript
            empty_folder = tmpdir_path / "1640000100"
            empty_folder.mkdir()
            meta = {"datetime": "2025-01-15T10:00:00Z", "duration": 60000}
            with open(empty_folder / "meta.json", "w", encoding="utf-8") as f:
                json.dump(meta, f)

            results = search_transcripts(tmpdir_path, "content")

            assert results["total_matches"] == 1
            assert results["recordings_with_matches"] == 1

    def test_match_metadata_included(self):
        """Test that match results include all metadata."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            self.create_test_recording(tmpdir_path, "1640000000", "test content", mode="Quick Note")

            results = search_transcripts(tmpdir_path, "test")

            assert len(results["matches"]) == 1
            match = results["matches"][0]

            assert "recording_id" in match
            assert "date" in match
            assert "datetime" in match
            assert match["mode"] == "Quick Note"
            assert match["duration_seconds"] == 60.0
            assert "word_count" in match
            assert "occurrence_count" in match
            assert "excerpts" in match

    def test_special_characters_in_search(self):
        """Test searching for terms with special regex characters."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            self.create_test_recording(tmpdir_path, "1640000000", "Cost is $100 (approximately)")

            # Should escape regex characters
            results = search_transcripts(tmpdir_path, "$100")

            assert results["total_matches"] == 1

    def test_empty_recordings_directory(self):
        """Test search in empty directory."""
        with TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            results = search_transcripts(tmpdir_path, "anything")

            assert results["total_matches"] == 0
            assert results["recordings_with_matches"] == 0
            assert len(results["matches"]) == 0

