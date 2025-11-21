"""CSV Output Generator - Generate all CSV output files

Generates detailed recordings data and various aggregated CSV files.
"""

import csv
from pathlib import Path
from typing import List, Dict

from lib.core.analytics_summary import AnalyticsSummary


def generate_csv_files(recordings_data: List[Dict], summary: AnalyticsSummary, output_dir: Path) -> None:
    """Generate all CSV output files

    Args:
        recordings_data: List of recording dictionaries
        summary: AnalyticsSummary object with all aggregations
        output_dir: Output directory path
    """
    print("\nGenerating CSV files...")

    # Extract from summary
    daily_summary = summary.daily_summary
    hourly_data = summary.hourly_data
    word_freq = summary.word_freq
    bigram_freq = summary.bigram_freq
    trigram_freq = summary.trigram_freq
    mode_data = summary.mode_data
    topic_data = summary.topic_data
    all_fillers = summary.filler_data
    sentence_metrics_summary = summary.sentence_summary

    # 1. Recordings detail
    detail_file = output_dir / "recordings_detail.csv"
    detail_fields = [
        "recording_id", "datetime", "date", "hour", "day_of_week",
        "duration_seconds", "duration_ms", "has_transcript", "word_count",
        "char_count", "words_per_minute", "filler_word_count", "filler_word_percentage",
        "sentence_count", "avg_words_per_sentence", "avg_chars_per_sentence",
        "mode_name", "model_name", "app_version", "processing_time_ms", "segment_count",
        "folder_name", "primary_topic", "secondary_topics"
    ]

    with open(detail_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=detail_fields)
        writer.writeheader()
        for rec in recordings_data:
            writer.writerow({k: rec.get(k, "") for k in detail_fields})
    print(f"  ✓ {detail_file.name}")

    # 2. Daily summary
    daily_file = output_dir / "daily_summary.csv"
    with open(daily_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "date", "recordings_count", "total_duration_seconds",
            "total_duration_hours", "total_words", "total_characters",
            "avg_duration_seconds", "avg_words_per_recording"
        ])
        writer.writeheader()
        for date in sorted(daily_summary.keys()):
            data = daily_summary[date].copy()
            data["total_duration_hours"] = round(data["total_duration_seconds"] / 3600, 2)
            data["avg_duration_seconds"] = round(
                data["total_duration_seconds"] / data["recordings_count"], 2
            ) if data["recordings_count"] > 0 else 0
            data["avg_words_per_recording"] = round(
                data["total_words"] / data["recordings_count"], 2
            ) if data["recordings_count"] > 0 else 0
            writer.writerow(data)
    print(f"  ✓ {daily_file.name}")

    # 3. Hourly patterns
    hourly_file = output_dir / "hourly_patterns.csv"
    with open(hourly_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "hour", "recordings_count", "total_duration_seconds", "avg_duration_seconds"
        ])
        writer.writeheader()
        for hour in sorted(hourly_data.keys()):
            data = hourly_data[hour].copy()
            data["avg_duration_seconds"] = round(
                data["total_duration_seconds"] / data["recordings_count"], 2
            ) if data["recordings_count"] > 0 else 0
            writer.writerow(data)
    print(f"  ✓ {hourly_file.name}")

    # 4. Word frequency
    total_words = sum(word_freq.values())
    word_file = output_dir / "word_frequency.csv"
    with open(word_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["word", "frequency", "percentage"])
        writer.writeheader()
        for word, freq in word_freq.most_common(500):  # Top 500 words
            percentage = round((freq / total_words * 100), 4) if total_words > 0 else 0
            writer.writerow({"word": word, "frequency": freq, "percentage": percentage})
    print(f"  ✓ {word_file.name}")

    # 5. Phrase frequency
    phrase_file = output_dir / "phrase_frequency.csv"
    with open(phrase_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["phrase", "type", "frequency", "percentage"])
        writer.writeheader()

        # Write bigrams
        total_bigrams = sum(bigram_freq.values())
        for phrase, freq in bigram_freq.most_common(100):  # Top 100 bigrams
            percentage = round((freq / total_bigrams * 100), 4) if total_bigrams > 0 else 0
            writer.writerow({"phrase": phrase, "type": "2-gram", "frequency": freq, "percentage": percentage})

        # Write trigrams
        total_trigrams = sum(trigram_freq.values())
        for phrase, freq in trigram_freq.most_common(50):  # Top 50 trigrams
            percentage = round((freq / total_trigrams * 100), 4) if total_trigrams > 0 else 0
            writer.writerow({"phrase": phrase, "type": "3-gram", "frequency": freq, "percentage": percentage})

    print(f"  ✓ {phrase_file.name}")

    # 6. Mode usage
    total_recordings = len(recordings_data)
    mode_file = output_dir / "mode_usage.csv"
    with open(mode_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "mode_name", "count", "percentage", "total_duration_seconds"
        ])
        writer.writeheader()
        for mode in sorted(mode_data.keys()):
            data = mode_data[mode].copy()
            data["percentage"] = round((data["count"] / total_recordings * 100), 2) if total_recordings > 0 else 0
            writer.writerow(data)
    print(f"  ✓ {mode_file.name}")

    # 7. Topic distribution
    total_duration = sum(rec["duration_seconds"] for rec in recordings_data)
    topic_file = output_dir / "topic_distribution.csv"
    with open(topic_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "topic", "recording_count", "total_duration_seconds",
            "percentage_of_recordings", "percentage_of_time"
        ])
        writer.writeheader()
        for topic in sorted(topic_data.keys(), key=lambda x: topic_data[x]["recording_count"], reverse=True):
            data = topic_data[topic].copy()
            data["percentage_of_recordings"] = round(
                (data["recording_count"] / total_recordings * 100), 2
            ) if total_recordings > 0 else 0
            data["percentage_of_time"] = round(
                (data["total_duration_seconds"] / total_duration * 100), 2
            ) if total_duration > 0 else 0
            writer.writerow(data)
    print(f"  ✓ {topic_file.name}")

    # 8. Filler word analysis
    total_fillers = sum(all_fillers.values())
    filler_file = output_dir / "filler_word_analysis.csv"
    with open(filler_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["filler_phrase", "count", "percentage"])
        writer.writeheader()
        for filler, count in all_fillers.most_common():
            percentage = round((count / total_fillers * 100), 2) if total_fillers > 0 else 0
            writer.writerow({"filler_phrase": filler, "count": count, "percentage": percentage})
    print(f"  ✓ {filler_file.name}")

    # 9. Sentence metrics
    sentence_file = output_dir / "sentence_metrics.csv"
    with open(sentence_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=sentence_metrics_summary.keys())
        writer.writeheader()
        writer.writerow(sentence_metrics_summary)
    print(f"  ✓ {sentence_file.name}")

