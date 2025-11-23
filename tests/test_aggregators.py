"""Unit tests for aggregation module."""

from collections import Counter

import pytest

from lib.processing.aggregators import (
    aggregate_daily_summary,
    aggregate_filler_words,
    aggregate_hourly_patterns,
    aggregate_mode_usage,
    aggregate_phrase_frequency,
    aggregate_sentence_metrics,
    aggregate_topic_distribution,
    aggregate_word_frequency,
)


@pytest.fixture
def sample_recordings():
    """Sample recording data for testing."""
    return [
        {
            "recording_id": "1",
            "date": "2025-01-01",
            "hour": 9,
            "duration_seconds": 120.0,
            "word_count": 50,
            "char_count": 250,
            "has_transcript": True,
            "transcript": "hello world test data",
            "mode_name": "Default",
            "primary_topic": "Code/Development",
            "filler_breakdown": {"um": 2, "uh": 1},
            "sentence_count": 3,
            "avg_words_per_sentence": 5.0,
            "avg_chars_per_sentence": 25.0,
        },
        {
            "recording_id": "2",
            "date": "2025-01-01",
            "hour": 14,
            "duration_seconds": 180.0,
            "word_count": 75,
            "char_count": 375,
            "has_transcript": True,
            "transcript": "more test data here",
            "mode_name": "Default",
            "primary_topic": "Documentation",
            "filler_breakdown": {"um": 1, "like": 3},
            "sentence_count": 4,
            "avg_words_per_sentence": 6.0,
            "avg_chars_per_sentence": 30.0,
        },
        {
            "recording_id": "3",
            "date": "2025-01-02",
            "hour": 9,
            "duration_seconds": 60.0,
            "word_count": 30,
            "char_count": 150,
            "has_transcript": True,
            "transcript": "final test entry",
            "mode_name": "Quick Note",
            "primary_topic": "Code/Development",
            "filler_breakdown": {"uh": 2},
            "sentence_count": 2,
            "avg_words_per_sentence": 4.0,
            "avg_chars_per_sentence": 20.0,
        },
    ]


class TestAggregateDailySummary:
    """Tests for aggregate_daily_summary function."""

    def test_basic_aggregation(self, sample_recordings):
        summary = aggregate_daily_summary(sample_recordings)
        assert "2025-01-01" in summary
        assert "2025-01-02" in summary
        assert summary["2025-01-01"]["recordings_count"] == 2
        assert summary["2025-01-02"]["recordings_count"] == 1

    def test_duration_totals(self, sample_recordings):
        summary = aggregate_daily_summary(sample_recordings)
        assert summary["2025-01-01"]["total_duration_seconds"] == 300.0
        assert summary["2025-01-02"]["total_duration_seconds"] == 60.0

    def test_word_totals(self, sample_recordings):
        summary = aggregate_daily_summary(sample_recordings)
        assert summary["2025-01-01"]["total_words"] == 125
        assert summary["2025-01-02"]["total_words"] == 30

    def test_derived_fields(self, sample_recordings):
        summary = aggregate_daily_summary(sample_recordings)
        day_data = summary["2025-01-01"]
        assert "total_duration_hours" in day_data
        assert "avg_duration_seconds" in day_data
        assert "avg_words_per_recording" in day_data
        assert day_data["avg_duration_seconds"] == 150.0

    def test_empty_recordings(self):
        summary = aggregate_daily_summary([])
        assert summary == {}


class TestAggregateHourlyPatterns:
    """Tests for aggregate_hourly_patterns function."""

    def test_basic_aggregation(self, sample_recordings):
        hourly = aggregate_hourly_patterns(sample_recordings)
        assert 9 in hourly
        assert 14 in hourly
        assert hourly[9]["recordings_count"] == 2
        assert hourly[14]["recordings_count"] == 1

    def test_duration_totals(self, sample_recordings):
        hourly = aggregate_hourly_patterns(sample_recordings)
        assert hourly[9]["total_duration_seconds"] == 180.0
        assert hourly[14]["total_duration_seconds"] == 180.0

    def test_derived_fields(self, sample_recordings):
        hourly = aggregate_hourly_patterns(sample_recordings)
        assert "avg_duration_seconds" in hourly[9]
        assert hourly[9]["avg_duration_seconds"] == 90.0

    def test_empty_recordings(self):
        hourly = aggregate_hourly_patterns([])
        assert hourly == {}


class TestAggregateWordFrequency:
    """Tests for aggregate_word_frequency function."""

    def test_basic_counting(self, sample_recordings):
        freq = aggregate_word_frequency(sample_recordings)
        assert isinstance(freq, Counter)
        assert "test" in freq
        assert "data" in freq
        assert freq["test"] >= 2

    def test_empty_recordings(self):
        freq = aggregate_word_frequency([])
        assert isinstance(freq, Counter)
        assert len(freq) == 0

    def test_top_n_limit(self, sample_recordings):
        freq = aggregate_word_frequency(sample_recordings, top_n=2)
        assert isinstance(freq, Counter)
        # Should still return all words, Counter doesn't limit


class TestAggregatePhraseFrequency:
    """Tests for aggregate_phrase_frequency function."""

    def test_returns_two_counters(self, sample_recordings):
        bigrams, trigrams = aggregate_phrase_frequency(sample_recordings)
        assert isinstance(bigrams, Counter)
        assert isinstance(trigrams, Counter)

    def test_bigram_extraction(self, sample_recordings):
        bigrams, _ = aggregate_phrase_frequency(sample_recordings)
        assert "test data" in bigrams
        assert bigrams["test data"] >= 2

    def test_empty_recordings(self):
        bigrams, trigrams = aggregate_phrase_frequency([])
        assert len(bigrams) == 0
        assert len(trigrams) == 0


class TestAggregateModeUsage:
    """Tests for aggregate_mode_usage function."""

    def test_basic_aggregation(self, sample_recordings):
        modes = aggregate_mode_usage(sample_recordings)
        assert "Default" in modes
        assert "Quick Note" in modes
        assert modes["Default"]["count"] == 2
        assert modes["Quick Note"]["count"] == 1

    def test_percentage_calculation(self, sample_recordings):
        modes = aggregate_mode_usage(sample_recordings)
        assert "percentage" in modes["Default"]
        # 2 out of 3 = 66.67%
        assert abs(modes["Default"]["percentage"] - 66.67) < 0.1

    def test_duration_totals(self, sample_recordings):
        modes = aggregate_mode_usage(sample_recordings)
        assert modes["Default"]["total_duration_seconds"] == 300.0

    def test_empty_recordings(self):
        modes = aggregate_mode_usage([])
        assert modes == {}


class TestAggregateTopicDistribution:
    """Tests for aggregate_topic_distribution function."""

    def test_basic_aggregation(self, sample_recordings):
        topics = aggregate_topic_distribution(sample_recordings)
        assert "Code/Development" in topics
        assert "Documentation" in topics
        assert topics["Code/Development"]["recording_count"] == 2
        assert topics["Documentation"]["recording_count"] == 1

    def test_percentage_calculations(self, sample_recordings):
        topics = aggregate_topic_distribution(sample_recordings)
        code_topic = topics["Code/Development"]
        assert "percentage_of_recordings" in code_topic
        assert "percentage_of_time" in code_topic
        # 2 out of 3 recordings = 66.67%
        assert abs(code_topic["percentage_of_recordings"] - 66.67) < 0.1

    def test_empty_recordings(self):
        topics = aggregate_topic_distribution([])
        assert topics == {}


class TestAggregateFillerWords:
    """Tests for aggregate_filler_words function."""

    def test_basic_aggregation(self, sample_recordings):
        fillers = aggregate_filler_words(sample_recordings)
        assert isinstance(fillers, Counter)
        assert "um" in fillers
        assert "uh" in fillers
        assert "like" in fillers

    def test_counts(self, sample_recordings):
        fillers = aggregate_filler_words(sample_recordings)
        assert fillers["um"] == 3  # 2 + 1
        assert fillers["uh"] == 3  # 1 + 2
        assert fillers["like"] == 3

    def test_empty_recordings(self):
        fillers = aggregate_filler_words([])
        assert len(fillers) == 0


class TestAggregateSentenceMetrics:
    """Tests for aggregate_sentence_metrics function."""

    def test_basic_metrics(self, sample_recordings):
        metrics = aggregate_sentence_metrics(sample_recordings)
        assert metrics["total_recordings_analyzed"] == 3
        assert metrics["total_sentences"] == 9  # 3 + 4 + 2
        assert "avg_sentences_per_recording" in metrics
        assert "avg_words_per_sentence" in metrics

    def test_empty_recordings(self):
        metrics = aggregate_sentence_metrics([])
        assert metrics["total_recordings_analyzed"] == 0
        assert metrics["total_sentences"] == 0

    def test_recordings_without_sentences(self):
        recordings = [
            {
                "recording_id": "1",
                "sentence_count": 0,
                "has_transcript": False,
            }
        ]
        metrics = aggregate_sentence_metrics(recordings)
        assert metrics["total_recordings_analyzed"] == 0

