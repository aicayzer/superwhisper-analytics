"""Unit tests for search history module."""

from pathlib import Path

import pytest

from lib.search.search_history import (
    add_search,
    clear_history,
    get_history_file,
    get_recent_searches,
    load_history,
    save_history,
)


@pytest.fixture(autouse=True)
def clean_history(monkeypatch, tmp_path):
    """Use temporary history file for tests."""
    history_file = tmp_path / "test_history.json"

    # Patch the module-level function
    import lib.search.search_history as history_module
    monkeypatch.setattr(history_module, "get_history_file", lambda: history_file)

    yield history_file

    # Cleanup
    if history_file.exists():
        history_file.unlink()


class TestHistoryFile:
    """Tests for history file management."""

    def test_get_history_file_returns_path(self):
        """Test that get_history_file returns a Path object."""
        result = get_history_file()
        assert isinstance(result, Path)

    def test_load_history_empty_when_no_file(self):
        """Test load_history returns empty list when file doesn't exist."""
        history = load_history()
        assert history == []

    def test_save_and_load_history(self):
        """Test saving and loading history."""
        test_history = [
            {"term": "test", "mode": "exact", "result_count": 5, "timestamp": "2025-01-15T10:00:00"}
        ]

        save_history(test_history)
        loaded = load_history()

        assert len(loaded) == 1
        assert loaded[0]["term"] == "test"

    def test_load_corrupted_history(self, monkeypatch, tmp_path):
        """Test load_history handles corrupted JSON gracefully."""
        history_file = tmp_path / "corrupted.json"
        history_file.write_text("not valid json {")

        monkeypatch.setattr("lib.search.search_history.get_history_file", lambda: history_file)
        history = load_history()

        assert history == []


class TestAddSearch:
    """Tests for add_search function."""

    def test_add_search_creates_entry(self):
        """Test adding a search creates a new entry."""
        add_search("database", "exact", 5)

        history = load_history()
        assert len(history) == 1
        assert history[0]["term"] == "database"
        assert history[0]["mode"] == "exact"
        assert history[0]["result_count"] == 5

    def test_add_search_includes_timestamp(self):
        """Test that added searches include timestamp."""
        add_search("test", "fuzzy", 3)

        history = load_history()
        assert "timestamp" in history[0]

    def test_add_search_prepends_to_history(self):
        """Test that new searches are added to the beginning."""
        add_search("first", "exact", 1)
        add_search("second", "exact", 2)

        history = load_history()
        assert history[0]["term"] == "second"
        assert history[1]["term"] == "first"

    def test_add_search_limits_to_50(self):
        """Test that history is limited to 50 entries."""
        # Add 60 searches
        for i in range(60):
            add_search(f"search{i}", "exact", i)

        history = load_history()
        assert len(history) == 50
        # Most recent should be search59
        assert history[0]["term"] == "search59"
        # Oldest should be search10
        assert history[-1]["term"] == "search10"


class TestGetRecentSearches:
    """Tests for get_recent_searches function."""

    def test_get_recent_searches_default_limit(self):
        """Test getting recent searches with default limit."""
        for i in range(15):
            add_search(f"search{i}", "exact", i)

        recent = get_recent_searches()
        assert len(recent) == 10

    def test_get_recent_searches_custom_limit(self):
        """Test getting recent searches with custom limit."""
        for i in range(15):
            add_search(f"search{i}", "exact", i)

        recent = get_recent_searches(limit=5)
        assert len(recent) == 5

    def test_get_recent_searches_empty_history(self):
        """Test getting recent searches when history is empty."""
        recent = get_recent_searches()
        assert recent == []

    def test_get_recent_searches_returns_most_recent(self):
        """Test that recent searches are returned in correct order."""
        add_search("first", "exact", 1)
        add_search("second", "exact", 2)
        add_search("third", "exact", 3)

        recent = get_recent_searches(limit=2)
        assert len(recent) == 2
        assert recent[0]["term"] == "third"
        assert recent[1]["term"] == "second"


class TestClearHistory:
    """Tests for clear_history function."""

    def test_clear_history_deletes_file(self, clean_history):
        """Test that clear_history deletes the history file."""
        history_file = clean_history

        add_search("test", "exact", 1)

        # Verify file was created
        history = load_history()
        assert len(history) == 1
        assert history_file.exists()

        clear_history()

        # File should not exist after clearing
        assert not history_file.exists()

    def test_clear_history_when_no_file(self, clean_history):
        """Test clear_history is safe when no file exists."""
        history_file = clean_history

        # Ensure no file exists first
        if history_file.exists():
            history_file.unlink()

        # Should not raise even when file doesn't exist
        clear_history()

        # Verify still no file
        assert not history_file.exists()

    def test_clear_history_removes_all_entries(self):
        """Test that history is empty after clearing."""
        for i in range(10):
            add_search(f"search{i}", "exact", i)

        clear_history()
        history = load_history()

        assert history == []

