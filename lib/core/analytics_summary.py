"""Analytics Summary module - Clean dataclass for aggregation results

Replaces tuple returns with a structured object containing all aggregation results.
"""

from collections import Counter
from dataclasses import dataclass
from typing import Any


@dataclass
class AnalyticsSummary:
    """Container for all analytics aggregation results

    This replaces the previous approach of returning multiple values as a tuple.
    Provides clean, named access to all aggregated data.
    """

    # Daily aggregations
    daily_summary: dict[str, dict[str, Any]]

    # Hourly patterns
    hourly_data: dict[int, dict[str, Any]]

    # Word and phrase frequency
    word_freq: Counter
    bigram_freq: Counter
    trigram_freq: Counter

    # Mode usage
    mode_data: dict[str, dict[str, Any]]

    # Topic distribution
    topic_data: dict[str, dict[str, Any]]

    # Filler words
    filler_data: Counter

    # Sentence metrics
    sentence_summary: dict[str, float]

    def __repr__(self) -> str:
        """Readable representation of summary"""
        return (
            f"AnalyticsSummary("
            f"days={len(self.daily_summary)}, "
            f"unique_words={len(self.word_freq)}, "
            f"modes={len(self.mode_data)}, "
            f"topics={len(self.topic_data)})"
        )

