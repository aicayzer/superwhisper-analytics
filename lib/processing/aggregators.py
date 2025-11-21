"""Aggregators module - Aggregate recordings data into summary statistics

Centralizes ALL aggregation logic to eliminate duplication across output generators.
Pure functions with no I/O - compute once, reuse across all output formats.
"""

from typing import List, Dict, Any
from collections import Counter

from lib.core.analytics_summary import AnalyticsSummary
from lib.processing.text_analysis import extract_words, extract_ngrams


def aggregate_daily_summary(recordings: List[Dict]) -> Dict[str, Dict[str, Any]]:
    """Aggregate recordings by date

    Args:
        recordings: List of recording dictionaries

    Returns:
        Dict mapping date to daily summary statistics
    """
    daily_summary = {}
    for rec in recordings:
        date = rec["date"]
        if date not in daily_summary:
            daily_summary[date] = {
                "date": date,
                "recordings_count": 0,
                "total_duration_seconds": 0,
                "total_words": 0,
                "total_characters": 0
            }
        daily_summary[date]["recordings_count"] += 1
        daily_summary[date]["total_duration_seconds"] += rec["duration_seconds"]
        daily_summary[date]["total_words"] += rec["word_count"]
        daily_summary[date]["total_characters"] += rec["char_count"]

    return daily_summary


def aggregate_hourly_patterns(recordings: List[Dict]) -> Dict[int, Dict[str, Any]]:
    """Aggregate recordings by hour of day

    Args:
        recordings: List of recording dictionaries

    Returns:
        Dict mapping hour to hourly statistics
    """
    hourly_data = {}
    for rec in recordings:
        hour = rec["hour"]
        if hour not in hourly_data:
            hourly_data[hour] = {
                "hour": hour,
                "recordings_count": 0,
                "total_duration_seconds": 0
            }
        hourly_data[hour]["recordings_count"] += 1
        hourly_data[hour]["total_duration_seconds"] += rec["duration_seconds"]

    return hourly_data


def aggregate_word_frequency(recordings: List[Dict], top_n: int = 500) -> Counter:
    """Aggregate word frequency across all recordings

    Args:
        recordings: List of recording dictionaries
        top_n: Number of top words to return (not used in counter, but for documentation)

    Returns:
        Counter object with word frequencies
    """
    all_words = []
    for rec in recordings:
        if rec.get("transcript"):
            all_words.extend(extract_words(rec["transcript"]))

    return Counter(all_words)


def aggregate_phrase_frequency(recordings: List[Dict]) -> tuple[Counter, Counter]:
    """Aggregate phrase frequency (bigrams and trigrams)

    Args:
        recordings: List of recording dictionaries

    Returns:
        Tuple of (bigram_counter, trigram_counter)
    """
    all_bigrams = []
    all_trigrams = []

    for rec in recordings:
        if rec.get("transcript"):
            all_bigrams.extend(extract_ngrams(rec["transcript"], 2))
            all_trigrams.extend(extract_ngrams(rec["transcript"], 3))

    return Counter(all_bigrams), Counter(all_trigrams)


def aggregate_mode_usage(recordings: List[Dict]) -> Dict[str, Dict[str, Any]]:
    """Aggregate recording mode usage statistics

    Args:
        recordings: List of recording dictionaries

    Returns:
        Dict mapping mode name to usage statistics
    """
    mode_data = {}
    for rec in recordings:
        mode = rec["mode_name"]
        if mode not in mode_data:
            mode_data[mode] = {
                "mode_name": mode,
                "count": 0,
                "total_duration_seconds": 0
            }
        mode_data[mode]["count"] += 1
        mode_data[mode]["total_duration_seconds"] += rec["duration_seconds"]

    return mode_data


def aggregate_topic_distribution(recordings: List[Dict]) -> Dict[str, Dict[str, Any]]:
    """Aggregate topic distribution statistics

    Args:
        recordings: List of recording dictionaries

    Returns:
        Dict mapping topic to distribution statistics
    """
    topic_data = {}
    for rec in recordings:
        topic = rec["primary_topic"]
        if topic not in topic_data:
            topic_data[topic] = {
                "topic": topic,
                "recording_count": 0,
                "total_duration_seconds": 0
            }
        topic_data[topic]["recording_count"] += 1
        topic_data[topic]["total_duration_seconds"] += rec["duration_seconds"]

    return topic_data


def aggregate_filler_words(recordings: List[Dict]) -> Counter:
    """Aggregate filler word usage across all recordings

    Args:
        recordings: List of recording dictionaries

    Returns:
        Counter object with filler word frequencies
    """
    all_fillers = Counter()
    for rec in recordings:
        if rec.get("filler_breakdown"):
            all_fillers.update(rec["filler_breakdown"])

    return all_fillers


def aggregate_sentence_metrics(recordings: List[Dict]) -> Dict[str, float]:
    """Aggregate sentence-level metrics across all recordings

    Args:
        recordings: List of recording dictionaries

    Returns:
        Dict with aggregate sentence statistics
    """
    recordings_with_sentences = [r for r in recordings if r.get("sentence_count", 0) > 0]

    if recordings_with_sentences:
        sentence_lengths = []
        words_per_sentence_all = []
        chars_per_sentence_all = []

        for rec in recordings_with_sentences:
            sentence_count = rec.get("sentence_count", 0)
            if sentence_count > 0:
                sentence_lengths.append(sentence_count)
                words_per_sentence_all.append(rec.get("avg_words_per_sentence", 0))
                chars_per_sentence_all.append(rec.get("avg_chars_per_sentence", 0))

        # Calculate aggregate statistics
        return {
            "total_recordings_analyzed": len(recordings_with_sentences),
            "total_sentences": sum(sentence_lengths),
            "avg_sentences_per_recording": round(sum(sentence_lengths) / len(sentence_lengths), 2) if sentence_lengths else 0,
            "min_sentences_per_recording": min(sentence_lengths) if sentence_lengths else 0,
            "max_sentences_per_recording": max(sentence_lengths) if sentence_lengths else 0,
            "avg_words_per_sentence": round(sum(words_per_sentence_all) / len(words_per_sentence_all), 2) if words_per_sentence_all else 0,
            "min_words_per_sentence": round(min(words_per_sentence_all), 2) if words_per_sentence_all else 0,
            "max_words_per_sentence": round(max(words_per_sentence_all), 2) if words_per_sentence_all else 0,
            "avg_chars_per_sentence": round(sum(chars_per_sentence_all) / len(chars_per_sentence_all), 2) if chars_per_sentence_all else 0,
        }
    else:
        return {
            "total_recordings_analyzed": 0,
            "total_sentences": 0,
            "avg_sentences_per_recording": 0,
            "min_sentences_per_recording": 0,
            "max_sentences_per_recording": 0,
            "avg_words_per_sentence": 0,
            "min_words_per_sentence": 0,
            "max_words_per_sentence": 0,
            "avg_chars_per_sentence": 0,
        }


def create_analytics_summary(recordings: List[Dict]) -> AnalyticsSummary:
    """Create complete analytics summary from recordings

    Wrapper function that runs all aggregations and returns clean summary object.
    This is the main entry point for aggregation - compute once, use everywhere.

    Args:
        recordings: List of recording dictionaries

    Returns:
        AnalyticsSummary object containing all aggregated data
    """
    # Run all aggregations
    daily_summary = aggregate_daily_summary(recordings)
    hourly_data = aggregate_hourly_patterns(recordings)
    word_freq = aggregate_word_frequency(recordings)
    bigram_freq, trigram_freq = aggregate_phrase_frequency(recordings)
    mode_data = aggregate_mode_usage(recordings)
    topic_data = aggregate_topic_distribution(recordings)
    filler_data = aggregate_filler_words(recordings)
    sentence_summary = aggregate_sentence_metrics(recordings)

    # Return clean summary object
    return AnalyticsSummary(
        daily_summary=daily_summary,
        hourly_data=hourly_data,
        word_freq=word_freq,
        bigram_freq=bigram_freq,
        trigram_freq=trigram_freq,
        mode_data=mode_data,
        topic_data=topic_data,
        filler_data=filler_data,
        sentence_summary=sentence_summary
    )

