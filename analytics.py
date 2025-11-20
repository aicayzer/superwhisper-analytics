#!/usr/bin/env python3
"""Generic analytics tool for Super Whisper recordings."""
import json
import csv
import wave
import re
import sys
from pathlib import Path
from collections import Counter
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Topic keyword definitions
TOPIC_KEYWORDS = {
    "Code/Development": [
        "code", "repository", "repo", "github", "git", "commit", "function", "class",
        "python", "javascript", "typescript", "error", "bug", "fix", "implement",
        "script", "file", "module", "package", "import", "export", "test", "testing"
    ],
    "Documentation": [
        "documentation", "doc", "readme", "write", "document", "page", "section",
        "confluence", "notion", "markdown", "specification", "spec", "outline",
        "draft", "edit", "revise", "update", "content"
    ],
    "Data Engineering": [
        "bigquery", "sql", "dbt", "dataform", "query", "table", "dataset", "model",
        "staging", "mart", "intermediate", "transformation", "etl", "elt", "schema",
        "column", "field", "data", "analytics", "warehouse"
    ],
    "Project Management": [
        "ticket", "task", "todo", "epic", "story", "plan", "planning", "progress",
        "update", "meeting", "agenda", "action", "item", "deadline", "milestone",
        "sprint", "backlog", "priority"
    ],
    "Business Context": [
        "business", "banking", "customer", "lending", "savings", "account", "application",
        "product", "feature", "requirement", "stakeholder", "user", "client", "service"
    ],
    "Feedback/Instructions": [
        "please", "should", "need", "want", "think", "prefer", "suggest", "review",
        "check", "confirm", "update", "change", "modify", "improve", "better",
        "feedback", "instruction", "clarify", "understand"
    ],
    "Analysis": [
        "analyze", "analysis", "insight", "metric", "performance", "trend", "data",
        "report", "dashboard", "chart", "graph", "statistic", "measure", "evaluate",
        "review", "quarter", "q1", "q2", "q3", "q4"
    ],
    "Technical Architecture": [
        "architecture", "design", "system", "service", "api", "endpoint", "mcp",
        "server", "client", "framework", "tool", "tooling", "infrastructure",
        "deployment", "config", "configuration", "best practice", "standard"
    ]
}

# Common English stop words
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
    "do", "does", "did", "will", "would", "should", "could", "may", "might", "must",
    "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
    "me", "him", "her", "us", "them", "my", "your", "his", "her", "its", "our", "their",
    "what", "which", "who", "whom", "whose", "where", "when", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "just", "now"
}


def parse_datetime(dt_str: Optional[str], folder_timestamp: str) -> datetime:
    """Parse datetime string, fallback to folder timestamp if needed."""
    if dt_str:
        try:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            pass
    
    # Fallback to folder timestamp (Unix timestamp)
    try:
        return datetime.fromtimestamp(int(folder_timestamp))
    except (ValueError, TypeError):
        return datetime.now()


def get_wav_duration(filepath: Path) -> Optional[float]:
    """Get duration of a WAV file in seconds."""
    try:
        with wave.open(str(filepath), 'rb') as wav_file:
            frames = wav_file.getnframes()
            sample_rate = wav_file.getframerate()
            return frames / float(sample_rate)
    except Exception:
        return None


def classify_topic(text: str) -> Tuple[str, List[str]]:
    """Classify recording into primary and secondary topics."""
    if not text:
        return "Unknown", []
    
    text_lower = text.lower()
    scores = {topic: 0 for topic in TOPIC_KEYWORDS.keys()}
    
    for topic, keywords in TOPIC_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                scores[topic] += 1
    
    # Get primary topic (highest score)
    if not any(scores.values()):
        return "Unknown", []
    
    primary_topic = max(scores.items(), key=lambda x: x[1])[0]
    
    # Get secondary topics (score > 0 and not primary)
    secondary_topics = [
        topic for topic, score in scores.items()
        if score > 0 and topic != primary_topic
    ]
    
    return primary_topic, secondary_topics[:3]  # Limit to top 3 secondary topics


def clean_text(text: str) -> str:
    """Clean text for word frequency analysis."""
    # Remove punctuation and convert to lowercase
    text = re.sub(r'[^\w\s]', ' ', text.lower())
    return text


def extract_words(text: str) -> List[str]:
    """Extract words from text, excluding stop words."""
    words = clean_text(text).split()
    return [w for w in words if w and w not in STOP_WORDS and len(w) > 2]


def process_recordings(recordings_dir: Path) -> List[Dict]:
    """Process all recordings and extract data."""
    recordings_data = []
    recordings_folders = sorted([d for d in recordings_dir.iterdir() if d.is_dir()])
    
    total = len(recordings_folders)
    print(f"Processing {total} recordings...")
    
    for idx, folder in enumerate(recordings_folders, 1):
        if idx % 100 == 0:
            print(f"Processed {idx}/{total} recordings...", end='\r')
        
        meta_file = folder / "meta.json"
        wav_file = folder / "output.wav"
        
        if not meta_file.exists():
            continue
        
        try:
            with open(meta_file, 'r', encoding='utf-8') as f:
                meta = json.load(f)
        except Exception as e:
            print(f"\nError reading {meta_file}: {e}", file=sys.stderr)
            continue
        
        # Extract basic info
        recording_id = folder.name
        datetime_str = meta.get("datetime", "")
        duration_ms = meta.get("duration", 0)
        duration_seconds = duration_ms / 1000.0 if duration_ms else 0
        
        # Verify duration with WAV file if available
        if wav_file.exists() and duration_seconds == 0:
            wav_duration = get_wav_duration(wav_file)
            if wav_duration:
                duration_seconds = wav_duration
                duration_ms = int(wav_duration * 1000)
        
        # Parse datetime
        dt = parse_datetime(datetime_str, recording_id)
        date = dt.date()
        hour = dt.hour
        day_of_week = dt.strftime("%A")
        
        # Extract transcript
        result = meta.get("result", "") or meta.get("rawResult", "")
        has_transcript = bool(result and result.strip())
        
        # Calculate word and character counts
        word_count = len(result.split()) if result else 0
        char_count = len(result) if result else 0
        words_per_minute = (word_count / duration_seconds * 60) if duration_seconds > 0 else 0
        
        # Topic classification
        primary_topic, secondary_topics = classify_topic(result)
        secondary_topics_str = ", ".join(secondary_topics) if secondary_topics else ""
        
        # Extract other metadata
        mode_name = meta.get("modeName", "Unknown")
        model_name = meta.get("modelName", "")
        app_version = meta.get("appVersion", "")
        processing_time_ms = meta.get("processingTime", 0)
        segments = meta.get("segments", [])
        segment_count = len(segments) if isinstance(segments, list) else 0
        
        recordings_data.append({
            "recording_id": recording_id,
            "datetime": dt.isoformat(),
            "date": date.isoformat(),
            "hour": hour,
            "day_of_week": day_of_week,
            "duration_seconds": round(duration_seconds, 2),
            "duration_ms": duration_ms,
            "has_transcript": has_transcript,
            "word_count": word_count,
            "char_count": char_count,
            "words_per_minute": round(words_per_minute, 2),
            "mode_name": mode_name,
            "model_name": model_name,
            "app_version": app_version,
            "processing_time_ms": processing_time_ms,
            "segment_count": segment_count,
            "folder_name": recording_id,
            "primary_topic": primary_topic,
            "secondary_topics": secondary_topics_str,
            "transcript": result  # Keep for word frequency analysis
        })
    
    print(f"\nProcessed {len(recordings_data)} recordings successfully.")
    return recordings_data


def generate_csv_files(recordings_data: List[Dict], output_dir: Path):
    """Generate all CSV output files."""
    print("\nGenerating CSV files...")
    
    # 1. Recordings detail
    detail_file = output_dir / "recordings_detail.csv"
    detail_fields = [
        "recording_id", "datetime", "date", "hour", "day_of_week",
        "duration_seconds", "duration_ms", "has_transcript", "word_count",
        "char_count", "words_per_minute", "mode_name", "model_name",
        "app_version", "processing_time_ms", "segment_count", "folder_name",
        "primary_topic", "secondary_topics"
    ]
    
    with open(detail_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=detail_fields)
        writer.writeheader()
        for rec in recordings_data:
            writer.writerow({k: rec.get(k, "") for k in detail_fields})
    print(f"  ✓ {detail_file.name}")
    
    # 2. Daily summary
    daily_summary = {}
    for rec in recordings_data:
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
    
    daily_file = output_dir / "daily_summary.csv"
    with open(daily_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "date", "recordings_count", "total_duration_seconds",
            "total_duration_hours", "total_words", "total_characters",
            "avg_duration_seconds", "avg_words_per_recording"
        ])
        writer.writeheader()
        for date in sorted(daily_summary.keys()):
            data = daily_summary[date]
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
    hourly_data = {}
    for rec in recordings_data:
        hour = rec["hour"]
        if hour not in hourly_data:
            hourly_data[hour] = {
                "hour": hour,
                "recordings_count": 0,
                "total_duration_seconds": 0
            }
        hourly_data[hour]["recordings_count"] += 1
        hourly_data[hour]["total_duration_seconds"] += rec["duration_seconds"]
    
    hourly_file = output_dir / "hourly_patterns.csv"
    with open(hourly_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "hour", "recordings_count", "total_duration_seconds", "avg_duration_seconds"
        ])
        writer.writeheader()
        for hour in sorted(hourly_data.keys()):
            data = hourly_data[hour]
            data["avg_duration_seconds"] = round(
                data["total_duration_seconds"] / data["recordings_count"], 2
            ) if data["recordings_count"] > 0 else 0
            writer.writerow(data)
    print(f"  ✓ {hourly_file.name}")
    
    # 4. Word frequency
    all_words = []
    for rec in recordings_data:
        if rec["transcript"]:
            all_words.extend(extract_words(rec["transcript"]))
    
    word_freq = Counter(all_words)
    total_words = sum(word_freq.values())
    
    word_file = output_dir / "word_frequency.csv"
    with open(word_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["word", "frequency", "percentage"])
        writer.writeheader()
        for word, freq in word_freq.most_common(500):  # Top 500 words
            percentage = round((freq / total_words * 100), 4) if total_words > 0 else 0
            writer.writerow({"word": word, "frequency": freq, "percentage": percentage})
    print(f"  ✓ {word_file.name}")
    
    # 5. Mode usage
    mode_data = {}
    for rec in recordings_data:
        mode = rec["mode_name"]
        if mode not in mode_data:
            mode_data[mode] = {
                "mode_name": mode,
                "count": 0,
                "total_duration_seconds": 0
            }
        mode_data[mode]["count"] += 1
        mode_data[mode]["total_duration_seconds"] += rec["duration_seconds"]
    
    total_recordings = len(recordings_data)
    mode_file = output_dir / "mode_usage.csv"
    with open(mode_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "mode_name", "count", "percentage", "total_duration_seconds"
        ])
        writer.writeheader()
        for mode in sorted(mode_data.keys()):
            data = mode_data[mode]
            data["percentage"] = round((data["count"] / total_recordings * 100), 2) if total_recordings > 0 else 0
            writer.writerow(data)
    print(f"  ✓ {mode_file.name}")
    
    # 6. Topic distribution
    topic_data = {}
    for rec in recordings_data:
        topic = rec["primary_topic"]
        if topic not in topic_data:
            topic_data[topic] = {
                "topic": topic,
                "recording_count": 0,
                "total_duration_seconds": 0
            }
        topic_data[topic]["recording_count"] += 1
        topic_data[topic]["total_duration_seconds"] += rec["duration_seconds"]
    
    total_duration = sum(rec["duration_seconds"] for rec in recordings_data)
    topic_file = output_dir / "topic_distribution.csv"
    with open(topic_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "topic", "recording_count", "total_duration_seconds",
            "percentage_of_recordings", "percentage_of_time"
        ])
        writer.writeheader()
        for topic in sorted(topic_data.keys(), key=lambda x: topic_data[x]["recording_count"], reverse=True):
            data = topic_data[topic]
            data["percentage_of_recordings"] = round(
                (data["recording_count"] / total_recordings * 100), 2
            ) if total_recordings > 0 else 0
            data["percentage_of_time"] = round(
                (data["total_duration_seconds"] / total_duration * 100), 2
            ) if total_duration > 0 else 0
            writer.writerow(data)
    print(f"  ✓ {topic_file.name}")
    
    return recordings_data


def generate_insights_report(recordings_data: List[Dict], output_dir: Path):
    """Generate markdown insights report."""
    print("\nGenerating insights report...")
    
    total_recordings = len(recordings_data)
    recordings_with_transcripts = sum(1 for r in recordings_data if r["has_transcript"])
    total_duration_seconds = sum(r["duration_seconds"] for r in recordings_data)
    total_duration_hours = total_duration_seconds / 3600
    total_words = sum(r["word_count"] for r in recordings_data)
    total_characters = sum(r["char_count"] for r in recordings_data)
    
    avg_duration = total_duration_seconds / total_recordings if total_recordings > 0 else 0
    avg_words = total_words / recordings_with_transcripts if recordings_with_transcripts > 0 else 0
    avg_wpm = sum(r["words_per_minute"] for r in recordings_data if r["duration_seconds"] > 0) / recordings_with_transcripts if recordings_with_transcripts > 0 else 0
    
    # Date range
    dates = sorted(set(r["date"] for r in recordings_data))
    first_date = dates[0] if dates else "Unknown"
    last_date = dates[-1] if dates else "Unknown"
    
    # Daily averages
    days_covered = len(dates)
    avg_recordings_per_day = total_recordings / days_covered if days_covered > 0 else 0
    avg_duration_per_day = total_duration_hours / days_covered if days_covered > 0 else 0
    
    # Hourly patterns
    hourly_counts = {}
    for r in recordings_data:
        hour = r["hour"]
        hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
    peak_hour = max(hourly_counts.items(), key=lambda x: x[1])[0] if hourly_counts else None
    
    # Day of week patterns
    dow_counts = {}
    for r in recordings_data:
        dow = r["day_of_week"]
        dow_counts[dow] = dow_counts.get(dow, 0) + 1
    
    # Topic distribution
    topic_counts = {}
    for r in recordings_data:
        topic = r["primary_topic"]
        topic_counts[topic] = topic_counts.get(topic, 0) + 1
    
    # Mode distribution
    mode_counts = {}
    for r in recordings_data:
        mode = r["mode_name"]
        mode_counts[mode] = mode_counts.get(mode, 0) + 1
    
    # Longest recordings
    longest_by_duration = sorted(recordings_data, key=lambda x: x["duration_seconds"], reverse=True)[:5]
    longest_by_words = sorted([r for r in recordings_data if r["has_transcript"]], key=lambda x: x["word_count"], reverse=True)[:5]
    
    report = f"""# Super Whisper Recordings Analytics Report

Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Executive Summary

- **Total Recordings**: {total_recordings:,}
- **Recordings with Transcripts**: {recordings_with_transcripts:,} ({recordings_with_transcripts/total_recordings*100:.1f}%)
- **Total Recording Time**: {total_duration_hours:.1f} hours ({total_duration_seconds/60:.0f} minutes)
- **Total Words Transcribed**: {total_words:,}
- **Total Characters**: {total_characters:,}
- **Date Range**: {first_date} to {last_date} ({days_covered} days)
- **Average Recordings per Day**: {avg_recordings_per_day:.1f}
- **Average Duration per Day**: {avg_duration_per_day:.2f} hours

## Time Distribution Analysis

### Daily Patterns
- **Average Recordings per Day**: {avg_recordings_per_day:.1f}
- **Average Duration per Day**: {avg_duration_per_day:.2f} hours
- **Total Days Active**: {days_covered} days

### Hourly Patterns
- **Peak Hour**: {peak_hour}:00 ({hourly_counts.get(peak_hour, 0)} recordings)
- **Most Active Hours**: {', '.join([f"{h}:00 ({c})" for h, c in sorted(hourly_counts.items(), key=lambda x: x[1], reverse=True)[:5]])}

### Day of Week Patterns
"""
    
    for dow in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
        count = dow_counts.get(dow, 0)
        percentage = (count / total_recordings * 100) if total_recordings > 0 else 0
        report += f"- **{dow}**: {count} recordings ({percentage:.1f}%)\n"
    
    report += f"""
## Volume Metrics

- **Average Duration per Recording**: {avg_duration/60:.1f} minutes ({avg_duration:.1f} seconds)
- **Average Words per Recording**: {avg_words:.0f} words
- **Average Words per Minute**: {avg_wpm:.1f} WPM
- **Average Characters per Recording**: {total_characters/recordings_with_transcripts:.0f} characters

### Longest Recordings (by duration)
"""
    
    for i, rec in enumerate(longest_by_duration, 1):
        report += f"{i}. {rec['recording_id']}: {rec['duration_seconds']/60:.1f} minutes ({rec['word_count']} words) - {rec['primary_topic']}\n"
    
    report += f"""
### Longest Recordings (by word count)
"""
    
    for i, rec in enumerate(longest_by_words, 1):
        report += f"{i}. {rec['recording_id']}: {rec['word_count']} words ({rec['duration_seconds']/60:.1f} minutes) - {rec['primary_topic']}\n"
    
    report += f"""
## Topic Distribution

### Primary Topics
"""
    
    for topic, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_recordings * 100) if total_recordings > 0 else 0
        report += f"- **{topic}**: {count} recordings ({percentage:.1f}%)\n"
    
    report += f"""
## Mode Usage

"""
    
    for mode, count in sorted(mode_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_recordings * 100) if total_recordings > 0 else 0
        report += f"- **{mode}**: {count} recordings ({percentage:.1f}%)\n"
    
    report += f"""
## Technical Metrics

- **Recordings with Transcripts**: {recordings_with_transcripts:,} ({recordings_with_transcripts/total_recordings*100:.1f}%)
- **Recordings without Transcripts**: {total_recordings - recordings_with_transcripts:,} ({(total_recordings - recordings_with_transcripts)/total_recordings*100:.1f}%)

### Processing Efficiency
"""
    
    recordings_with_processing = [r for r in recordings_data if r["processing_time_ms"] > 0]
    if recordings_with_processing:
        avg_processing_ratio = sum(
            r["processing_time_ms"] / r["duration_ms"] 
            for r in recordings_with_processing if r["duration_ms"] > 0
        ) / len(recordings_with_processing)
        report += f"- **Average Processing Time Ratio**: {avg_processing_ratio*100:.2f}% (processing time / recording duration)\n"
    
    report += f"""
## Notable Patterns and Trends

### Recording Activity
- The dataset spans {days_covered} days with an average of {avg_recordings_per_day:.1f} recordings per day
- Peak activity occurs around {peak_hour}:00
- Most recordings are made during weekdays

### Content Patterns
- Average speech rate: {avg_wpm:.1f} words per minute
- {recordings_with_transcripts/total_recordings*100:.1f}% of recordings have transcripts
- Most common topic: {max(topic_counts.items(), key=lambda x: x[1])[0] if topic_counts else "Unknown"}

## Manual Analysis Section

*This section will be populated with deeper insights after manual review of the CSV data.*

### Key Observations
- Review the `recordings_detail.csv` file for detailed patterns
- Check `topic_distribution.csv` for topic trends over time
- Analyze `hourly_patterns.csv` for work schedule insights
- Examine `word_frequency.csv` for common terminology

### Suggested Further Analysis
1. Cross-reference topic distribution with time patterns
2. Identify correlations between recording length and topic
3. Analyze trends in mode usage over time
4. Review longest recordings for common themes
5. Examine word frequency for domain-specific terminology

---

*Report generated from {total_recordings:,} recordings*
"""
    
    report_file = output_dir / "insights_report.md"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"  ✓ {report_file.name}")


def main():
    """Main execution function."""
    script_dir = Path(__file__).parent
    workspace_root = script_dir.parent
    recordings_dir = workspace_root / "recordings"
    output_dir = script_dir
    
    if not recordings_dir.exists():
        print(f"Error: {recordings_dir} does not exist")
        print(f"Expected recordings folder at: {recordings_dir}")
        sys.exit(1)
    
    print("=" * 60)
    print("Super Whisper Recordings Analytics")
    print("=" * 60)
    
    # Process recordings
    recordings_data = process_recordings(recordings_dir)
    
    if not recordings_data:
        print("No recordings data found!")
        sys.exit(1)
    
    # Generate CSV files
    generate_csv_files(recordings_data, output_dir)
    
    # Generate insights report
    generate_insights_report(recordings_data, output_dir)
    
    print("\n" + "=" * 60)
    print("Analytics generation complete!")
    print(f"Output files saved to: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()

