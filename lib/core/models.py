"""Models module - Data structures and type definitions

Defines TypedDict structures for recordings, summaries, and filter criteria.
"""

from typing import Optional, TypedDict


class FilterCriteria(TypedDict, total=False):
    """Criteria for filtering recordings by date"""
    date: Optional[str]  # YYYY-MM-DD format
    month: Optional[str]  # YYYY-MM format
    date_from: Optional[str]  # YYYY-MM-DD format
    date_to: Optional[str]  # YYYY-MM-DD format


class Recording(TypedDict):
    """Complete recording data structure"""
    recording_id: str
    datetime: str
    date: str
    hour: int
    day_of_week: str
    duration_seconds: float
    duration_ms: int
    has_transcript: bool
    word_count: int
    char_count: int
    words_per_minute: float
    filler_word_count: int
    filler_word_percentage: float
    sentence_count: int
    avg_words_per_sentence: float
    avg_chars_per_sentence: float
    mode_name: str
    model_name: str
    app_version: str
    processing_time_ms: int
    segment_count: int
    folder_name: str
    primary_topic: str
    secondary_topics: str
    transcript: str
    filler_breakdown: dict[str, int]


class DailySummary(TypedDict):
    """Daily aggregation summary"""
    date: str
    recordings_count: int
    total_duration_seconds: float
    total_words: int
    total_characters: int


class HourlyPattern(TypedDict):
    """Hourly pattern aggregation"""
    hour: int
    recordings_count: int
    total_duration_seconds: float


class ModeUsage(TypedDict):
    """Mode usage statistics"""
    mode_name: str
    count: int
    total_duration_seconds: float


class TopicDistribution(TypedDict):
    """Topic distribution statistics"""
    topic: str
    recording_count: int
    total_duration_seconds: float


class SentenceMetrics(TypedDict):
    """Sentence-level metrics"""
    total_recordings_analyzed: int
    total_sentences: int
    avg_sentences_per_recording: float
    min_sentences_per_recording: int
    max_sentences_per_recording: int
    avg_words_per_sentence: float
    min_words_per_sentence: float
    max_words_per_sentence: float
    avg_chars_per_sentence: float

