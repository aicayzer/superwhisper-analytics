"""Search History module - Track and manage search history

Provides functionality to track recent searches and retrieve search history.
"""

import contextlib
import json
from datetime import datetime
from pathlib import Path


def get_history_file() -> Path:
    """Get the path to the search history file

    Returns:
        Path to history file in user's home directory
    """
    return Path.home() / ".superwhisper_analytics_history.json"


def load_history() -> list[dict]:
    """Load search history from file

    Returns:
        List of search history entries (most recent first)
    """
    history_file = get_history_file()

    if not history_file.exists():
        return []

    try:
        with open(history_file, encoding="utf-8") as f:
            history = json.load(f)
            return history if isinstance(history, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_history(history: list[dict]) -> None:
    """Save search history to file

    Args:
        history: List of search history entries
    """
    history_file = get_history_file()

    try:
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except OSError:
        # Silently fail if we can't write the history file
        pass


def add_search(term: str, mode: str, result_count: int) -> None:
    """Add a search to the history

    Args:
        term: Search term used
        mode: Search mode ('exact' or 'fuzzy')
        result_count: Number of results found
    """
    history = load_history()

    # Create new entry
    entry = {
        "term": term,
        "mode": mode,
        "result_count": result_count,
        "timestamp": datetime.now().isoformat(),
    }

    # Add to beginning of history
    history.insert(0, entry)

    # Keep only last 50 searches
    history = history[:50]

    save_history(history)


def get_recent_searches(limit: int = 10) -> list[dict]:
    """Get recent searches

    Args:
        limit: Maximum number of searches to return

    Returns:
        List of recent search entries
    """
    history = load_history()
    return history[:limit]


def clear_history() -> None:
    """Clear all search history"""
    history_file = get_history_file()

    if history_file.exists():
        with contextlib.suppress(OSError):
            history_file.unlink()

