"""JSON output generator

Generates JSON files with complete analytics data.
"""

import json
from collections import Counter
from pathlib import Path


def generate_json_file(
    recordings_data: list[dict],
    daily_summary: dict,
    hourly_data: dict,
    word_freq: Counter,
    mode_data: dict,
    topic_data: dict,
    filler_data: Counter,
    bigram_freq: Counter,
    trigram_freq: Counter,
    sentence_summary: dict,
    output_dir: Path,
):
    """Generate JSON file with all analytics data."""
    print("\nGenerating JSON file...")

    # Convert Counter objects to lists for JSON serialization
    word_freq_list = [{"word": word, "frequency": freq} for word, freq in word_freq.most_common(500)]
    bigram_freq_list = [{"phrase": phrase, "frequency": freq} for phrase, freq in bigram_freq.most_common(100)]
    trigram_freq_list = [{"phrase": phrase, "frequency": freq} for phrase, freq in trigram_freq.most_common(50)]
    filler_data_list = [{"filler_phrase": filler, "count": count} for filler, count in filler_data.most_common()]

    # Build complete data structure
    analytics_data = {
        "metadata": {
            "generated_at": __import__('datetime').datetime.now().isoformat(),
            "total_recordings": len(recordings_data),
            "recordings_with_transcripts": sum(1 for r in recordings_data if r.get("has_transcript", False)),
        },
        "recordings": recordings_data,
        "daily_summary": [
            {**daily_summary[date], "date": date}
            for date in sorted(daily_summary.keys())
        ],
        "hourly_patterns": [
            {**hourly_data[hour], "hour": hour}
            for hour in sorted(hourly_data.keys())
        ],
        "word_frequency": word_freq_list,
        "phrase_frequency": {
            "bigrams": bigram_freq_list,
            "trigrams": trigram_freq_list
        },
        "filler_word_analysis": filler_data_list,
        "sentence_metrics": sentence_summary,
        "mode_usage": [
            {**mode_data[mode], "mode_name": mode}
            for mode in sorted(mode_data.keys())
        ],
        "topic_distribution": [
            {**topic_data[topic], "topic": topic}
            for topic in sorted(topic_data.keys(), key=lambda x: topic_data[x]["recording_count"], reverse=True)
        ],
    }

    json_file = output_dir / "analytics.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(analytics_data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ {json_file.name}")
