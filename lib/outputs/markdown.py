"""Markdown output generators

Generates insights reports and AI analysis prompts in Markdown format.
"""

from datetime import datetime
from pathlib import Path


def generate_insights_report(recordings_data: list[dict], output_dir: Path):
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
    avg_wpm = (
        sum(r["words_per_minute"] for r in recordings_data if r["duration_seconds"] > 0)
        / recordings_with_transcripts
        if recordings_with_transcripts > 0
        else 0
    )

    # Date range
    dates = sorted({r["date"] for r in recordings_data})
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
    longest_by_words = sorted(
        [r for r in recordings_data if r["has_transcript"]], key=lambda x: x["word_count"], reverse=True
    )[:5]

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
        report += (
            f"{i}. {rec['recording_id']}: {rec['duration_seconds']/60:.1f} minutes ({rec['word_count']} words) - "
            f"{rec['primary_topic']}\n"
        )

    report += """
### Longest Recordings (by word count)
"""

    for i, rec in enumerate(longest_by_words, 1):
        report += (
            f"{i}. {rec['recording_id']}: {rec['word_count']} words ({rec['duration_seconds']/60:.1f} minutes) - "
            f"{rec['primary_topic']}\n"
        )

    report += """
## Topic Distribution

### Primary Topics
"""

    for topic, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_recordings * 100) if total_recordings > 0 else 0
        report += f"- **{topic}**: {count} recordings ({percentage:.1f}%)\n"

    report += """
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
        avg_processing_ratio = (
            sum(r["processing_time_ms"] / r["duration_ms"] for r in recordings_with_processing if r["duration_ms"] > 0)
            / len(recordings_with_processing)
        )
        report += (
            f"- **Average Processing Time Ratio**: {avg_processing_ratio*100:.2f}% (processing time / recording duration)\n"
        )

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


def generate_ai_prompt_file(output_dir: Path):
    """Generate AI prompt file for insights generation."""
    print("\nGenerating AI prompt file...")

    prompt = """# AI Insights Generation Prompt

You are analyzing Super Whisper recording analytics data. The following files are available in this directory:

## Available Data Files

### Structured Data
1. **analytics.json** - Complete structured data with all metrics including new text analysis
2. **analytics.xlsx** - Excel workbook with multiple sheets:
   - Recordings Detail (with filler words and sentence metrics)
   - Daily Summary
   - Hourly Patterns
   - Word Frequency
   - Phrase Frequency (bigrams and trigrams)
   - Filler Word Analysis
   - Sentence Metrics
   - Mode Usage
   - Topic Distribution

### CSV Files
3. **recordings_detail.csv** - Full detailed data for each recording
4. **daily_summary.csv** - Aggregated daily statistics
5. **hourly_patterns.csv** - Activity patterns by hour
6. **word_frequency.csv** - Most common words (top 500)
7. **phrase_frequency.csv** - Common 2-grams and 3-grams (top 150)
8. **filler_word_analysis.csv** - Filler word/phrase usage breakdown
9. **sentence_metrics.csv** - Aggregate sentence-level statistics
10. **mode_usage.csv** - Distribution across recording modes
11. **topic_distribution.csv** - Topic classification statistics

### Visualisations
12. **timeline_activity.mmd** - Daily/weekly recording activity timeline (Mermaid)
13. **timeline_topics.mmd** - Topic distribution over time (Mermaid)
14. **chart_top_words.mmd** - Top words bar chart (Mermaid, configurable count)
15. **chart_mode_usage.mmd** - Mode usage bar chart (Mermaid)
16. **chart_topic_distribution.mmd** - Topic distribution bar chart (Mermaid)
17. **chart_hourly_activity.mmd** - Hourly activity pattern bar chart (Mermaid)
18. **chart_speaking_rate.mmd** - Speaking rate (WPM) distribution (Mermaid)
19. **chart_filler_words.mmd** - Top filler words bar chart (Mermaid, configurable count)

### Reports
20. **insights_report.md** - Basic summary report (may need enhancement)

## Analysis Tasks

Please analyze the data and provide insights on:

### 1. Time Patterns
- Identify peak activity periods (hours, days of week)
- Analyze trends over time (increasing/decreasing activity)
- Identify any anomalies or unusual patterns
- Correlate activity with day of week

### 2. Content Analysis
- Review word frequency for domain-specific terminology
- Analyze phrase patterns (bigrams/trigrams) for common expressions
- Identify filler word usage patterns and speaking habits
- Examine sentence structure (length, complexity)
- Identify common themes from top words and phrases
- Analyze topic distribution patterns
- Look for correlations between topics and time patterns

### 3. Usage Patterns
- Analyze mode usage trends
- Identify most common use cases
- Review recording length distributions
- Examine speech rate patterns
- Compare filler word usage across different contexts

### 4. Communication Insights
- Analyze sentence structure trends (simple vs complex)
- Identify speaking patterns from filler word analysis
- Review phrase usage for common expressions or jargon
- Examine how communication style varies by topic or time

### 5. Insights Generation
- Provide actionable insights
- Identify interesting patterns or anomalies
- Suggest areas for further analysis
- Highlight key findings
- Note any communication improvements (filler word reduction, clearer sentences)
- Identify productivity patterns from timeline charts

## Output Format

Please generate an enhanced insights report that includes:
- Executive summary with key findings
- Detailed analysis sections
- Visualizations suggestions (if applicable)
- Recommendations or observations
- Any notable patterns or trends

## Data Structure Notes

- Recordings are identified by Unix timestamp folder names
- Duration is in seconds (duration_ms / 1000)
- Topics are classified using keyword matching (8 categories)
- Word frequency excludes common stop words (70+ words)
- Phrase frequency includes bigrams (2-word) and trigrams (3-word)
- Filler words include 30+ patterns (single and multi-word phrases)
- Sentence metrics calculated with abbreviation handling
- All dates are in ISO format (YYYY-MM-DD)
- Mermaid charts use xychart-beta syntax
- Timeline charts auto-aggregate to weekly when >30 days

## Instructions

1. Load and examine the JSON file first for overall structure
2. Use CSV files for detailed analysis or specific queries
3. Review Mermaid charts for visual patterns (view .mmd files in Markdown viewer)
4. Cross-reference data across different files
5. Generate comprehensive insights beyond what's in the basic report
6. Be specific with numbers and percentages
7. Identify trends and patterns
8. Analyze text quality metrics (filler words, sentence structure)
9. Look for correlations between different metrics
10. Provide context-aware analysis

## New Analytics Features

This analysis includes enhanced text analysis:
- **Filler Word Detection**: Identifies verbal fillers like "um", "uh", "you know", "I mean"
- **Phrase Analysis**: Common 2-word and 3-word expressions
- **Sentence Metrics**: Average sentence length, complexity indicators
- **Timeline Visualisations**: Activity and topic trends over time

Consider these new dimensions when generating insights.

Begin your analysis now.
"""

    prompt_file = output_dir / "insights_prompt.md"
    with open(prompt_file, 'w', encoding='utf-8') as f:
        f.write(prompt)
    print(f"  ✓ {prompt_file.name}")

