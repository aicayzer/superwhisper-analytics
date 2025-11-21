"""Mermaid chart generators

Generates Mermaid chart files for data visualization.
"""

import configparser
from pathlib import Path
from typing import List, Dict
from collections import Counter, defaultdict
from datetime import datetime


def escape_mermaid_label(text: str) -> str:
    """Escape special characters for Mermaid chart labels."""
    # Replace problematic characters
    text = str(text).replace('/', '-')  # Slashes break Mermaid syntax
    text = text.replace('"', "'")  # Quotes need to be single quotes
    text = text.replace('\n', ' ').replace('\r', ' ')  # Newlines to spaces
    text = text.replace('[', '(').replace(']', ')')  # Brackets to parens
    # Limit length to avoid chart rendering issues
    if len(text) > 50:
        text = text[:47] + "..."
    return text


def format_date_for_chart(date_str: str, format_type: str, all_dates: List[str], config: configparser.ConfigParser) -> str:
    """Format date based on chart type and config settings.

    Args:
        date_str: ISO format date string (YYYY-MM-DD or YYYY-WXX)
        format_type: Type of formatting - 'daily', 'weekly', or 'monthly'
        all_dates: List of all dates in dataset to determine if multi-year
        config: Configuration object with chart settings

    Returns:
        Formatted date string for chart label
    """
    from datetime import datetime as dt_module

    # Get format from config with defaults
    if format_type == 'daily':
        fmt = config.get('charts', 'date_format_daily', fallback='%d-%m')
    elif format_type == 'weekly':
        fmt = config.get('charts', 'date_format_weekly', fallback='W%W')
    elif format_type == 'monthly':
        fmt = config.get('charts', 'date_format_monthly', fallback='%b')
    else:
        return date_str

    # Check if dataset spans multiple years
    years = set()
    for d in all_dates:
        try:
            # Handle both YYYY-MM-DD and YYYY-WXX formats
            if '-W' in d:
                year = int(d.split('-')[0])
            else:
                year = dt_module.fromisoformat(d).year
            years.add(year)
        except (ValueError, AttributeError):
            continue

    # Add year suffix if multiple years
    if len(years) > 1:
        fmt = fmt + " '%y"

    # Format the date
    try:
        if '-W' in date_str:
            # Weekly format: YYYY-WXX - just use the week part
            return date_str.split('-')[1]  # Returns "WXX"
        else:
            date_obj = dt_module.fromisoformat(date_str)
            return date_obj.strftime(fmt)
    except (ValueError, AttributeError):
        return date_str


def generate_mermaid_charts(recordings_data: List[Dict], daily_summary: Dict,
                            word_freq: Counter, mode_data: Dict, topic_data: Dict,
                            output_dir: Path, config: configparser.ConfigParser,
                            hourly_data: Dict = None, filler_data: Counter = None):
    """Generate Mermaid chart files for visualizations.

    Args:
        recordings_data: List of recording dictionaries
        daily_summary: Daily aggregated data
        word_freq: Word frequency Counter
        mode_data: Mode usage statistics
        topic_data: Topic distribution data
        output_dir: Output directory path
        config: Configuration object
        hourly_data: Optional hourly patterns data
        filler_data: Optional filler word Counter
    """
    print("\nGenerating Mermaid charts...")

    # Get chart config with defaults
    top_words = int(config.get('charts', 'top_words_count', fallback='20'))
    top_topics = int(config.get('charts', 'top_topics_count', fallback='5'))
    top_fillers = int(config.get('charts', 'top_fillers_count', fallback='10'))

    # 1. Daily Activity Timeline
    if daily_summary:
        dates = sorted(daily_summary.keys())
        days_count = len(dates)

        # Auto-aggregate to weekly if more than 30 days
        if days_count > 30:
            # Aggregate by week
            from datetime import datetime as dt_module
            weekly_data = {}
            for date_str in dates:
                date_obj = dt_module.fromisoformat(date_str)
                week_key = date_obj.strftime("%Y-W%W")  # Year-WeekNumber
                if week_key not in weekly_data:
                    weekly_data[week_key] = {"recordings": 0, "duration": 0}
                weekly_data[week_key]["recordings"] += daily_summary[date_str]["recordings_count"]
                weekly_data[week_key]["duration"] += daily_summary[date_str]["total_duration_seconds"] / 3600

            weeks = sorted(weekly_data.keys())
            formatted_weeks = [format_date_for_chart(w, 'weekly', weeks, config) for w in weeks]
            max_count = max(w["recordings"] for w in weekly_data.values())
            chart_type = config.get('charts', 'weekly_chart_type', fallback='bar')

            timeline_chart = "xychart-beta\n"
            timeline_chart += '    title "Weekly Recording Activity"\n'
            timeline_chart += "    x-axis [" + ", ".join([f'"{w}"' for w in formatted_weeks]) + "]\n"
            timeline_chart += f'    y-axis "Recordings Count" 0 --> {max_count + 5}\n'
            timeline_chart += f"    {chart_type} [" + ", ".join([str(weekly_data[w]["recordings"]) for w in weeks]) + "]\n"
        else:
            # Daily timeline
            formatted_dates = [format_date_for_chart(d, 'daily', dates, config) for d in dates]
            max_count = max(daily_summary[d]["recordings_count"] for d in dates)
            chart_type = config.get('charts', 'daily_chart_type', fallback='line')

            timeline_chart = "xychart-beta\n"
            timeline_chart += '    title "Daily Recording Activity"\n'
            timeline_chart += "    x-axis [" + ", ".join([f'"{d}"' for d in formatted_dates]) + "]\n"
            timeline_chart += f'    y-axis "Recordings Count" 0 --> {max_count + 5}\n'
            timeline_chart += f"    {chart_type} [" + ", ".join([str(daily_summary[d]["recordings_count"]) for d in dates]) + "]\n"

        timeline_file = output_dir / "timeline_activity.mmd"
        with open(timeline_file, 'w', encoding='utf-8') as f:
            f.write(timeline_chart)
        print(f"  ✓ {timeline_file.name}")

    # 2. Topic Distribution Over Time
    if recordings_data and len(recordings_data) > 10:
        # Group by date and topic
        from datetime import datetime as dt_module
        from collections import defaultdict

        date_topic_counts = defaultdict(lambda: defaultdict(int))
        for rec in recordings_data:
            date = rec["date"]
            topic = rec["primary_topic"]
            date_topic_counts[date][topic] += 1

        dates = sorted(date_topic_counts.keys())
        all_topics = set()
        for topics_dict in date_topic_counts.values():
            all_topics.update(topics_dict.keys())

        # Get top N topics by total count (from config)
        topic_totals = Counter()
        for topics_dict in date_topic_counts.values():
            topic_totals.update(topics_dict)
        top_topics_list = [t for t, _ in topic_totals.most_common(top_topics)]

        # Aggregate if more than 30 days
        if len(dates) > 30:
            weekly_topic_data = defaultdict(lambda: defaultdict(int))
            for date_str in dates:
                date_obj = dt_module.fromisoformat(date_str)
                week_key = date_obj.strftime("%Y-W%W")
                for topic, count in date_topic_counts[date_str].items():
                    if topic in top_topics_list:
                        weekly_topic_data[week_key][topic] += count

            weeks = sorted(weekly_topic_data.keys())
            formatted_weeks = [format_date_for_chart(w, 'weekly', weeks, config) for w in weeks]

            topic_timeline = "xychart-beta\n"
            topic_timeline += f'    title "Weekly Topic Distribution (Top {top_topics})"\n'
            topic_timeline += "    x-axis [" + ", ".join([f'"{w}"' for w in formatted_weeks]) + "]\n"
            topic_timeline += '    y-axis "Recording Count"\n'

            for topic in top_topics_list:
                counts = [weekly_topic_data[w].get(topic, 0) for w in weeks]
                topic_timeline += f'    line "{escape_mermaid_label(topic)}" [' + ", ".join([str(c) for c in counts]) + "]\n"
        else:
            formatted_dates = [format_date_for_chart(d, 'daily', dates, config) for d in dates]

            topic_timeline = "xychart-beta\n"
            topic_timeline += f'    title "Daily Topic Distribution (Top {top_topics})"\n'
            topic_timeline += "    x-axis [" + ", ".join([f'"{d}"' for d in formatted_dates]) + "]\n"
            topic_timeline += '    y-axis "Recording Count"\n'

            for topic in top_topics_list:
                counts = [date_topic_counts[d].get(topic, 0) for d in dates]
                topic_timeline += f'    line "{escape_mermaid_label(topic)}" [' + ", ".join([str(c) for c in counts]) + "]\n"

        topic_timeline_file = output_dir / "timeline_topics.mmd"
        with open(topic_timeline_file, 'w', encoding='utf-8') as f:
            f.write(topic_timeline)
        print(f"  ✓ {topic_timeline_file.name}")

    # 3. Top Words Bar Chart
    if word_freq:
        top_words_data = word_freq.most_common(top_words)
        if top_words_data:
            max_freq = max(c for _, c in top_words_data)
            words_chart = "xychart-beta horizontal\n"
            words_chart += f'    title "Top {top_words} Most Common Words"\n'
            words_chart += "    x-axis [" + ", ".join([f'"{escape_mermaid_label(w)}"' for w, _ in top_words_data]) + "]\n"
            words_chart += f'    y-axis "Frequency" 0 --> {max_freq + 100}\n'
            words_chart += "    bar [" + ", ".join([str(c) for _, c in top_words_data]) + "]\n"

            words_file = output_dir / "chart_top_words.mmd"
            with open(words_file, 'w', encoding='utf-8') as f:
                f.write(words_chart)
            print(f"  ✓ {words_file.name}")

    # 4. Mode Usage Bar Chart
    if mode_data:
        sorted_modes = sorted(mode_data.items(), key=lambda x: x[1]["count"], reverse=True)
        if sorted_modes:
            max_count = max(data["count"] for _, data in sorted_modes)
            mode_chart = "xychart-beta horizontal\n"
            mode_chart += '    title "Recording Mode Usage"\n'
            mode_chart += "    x-axis [" + ", ".join([f'"{escape_mermaid_label(mode)}"' for mode, _ in sorted_modes]) + "]\n"
            mode_chart += f'    y-axis "Number of Recordings" 0 --> {max_count + 10}\n'
            mode_chart += "    bar [" + ", ".join([str(data["count"]) for _, data in sorted_modes]) + "]\n"

            mode_file = output_dir / "chart_mode_usage.mmd"
            with open(mode_file, 'w', encoding='utf-8') as f:
                f.write(mode_chart)
            print(f"  ✓ {mode_file.name}")

    # 5. Topic Distribution Bar Chart
    if topic_data:
        sorted_topics = sorted(topic_data.items(), key=lambda x: x[1]["recording_count"], reverse=True)
        if sorted_topics:
            max_count = max(data["recording_count"] for _, data in sorted_topics)
            topic_chart = "xychart-beta horizontal\n"
            topic_chart += '    title "Topic Distribution"\n'
            topic_chart += "    x-axis [" + ", ".join([f'"{escape_mermaid_label(topic)}"' for topic, _ in sorted_topics]) + "]\n"
            topic_chart += f'    y-axis "Number of Recordings" 0 --> {max_count + 20}\n'
            topic_chart += "    bar [" + ", ".join([str(data["recording_count"]) for _, data in sorted_topics]) + "]\n"

            topic_file = output_dir / "chart_topic_distribution.mmd"
            with open(topic_file, 'w', encoding='utf-8') as f:
                f.write(topic_chart)
            print(f"  ✓ {topic_file.name}")

    # 6. Hourly Activity Pattern
    if hourly_data:
        hours = sorted(hourly_data.keys())
        if hours:
            max_count = max(hourly_data[h]["recordings_count"] for h in hours)
            hourly_chart = "xychart-beta\n"
            hourly_chart += '    title "Recording Activity by Hour of Day"\n'
            hourly_chart += "    x-axis [" + ", ".join([f'"{h:02d}:00"' for h in hours]) + "]\n"
            hourly_chart += f'    y-axis "Recordings" 0 --> {max_count + 5}\n'
            hourly_chart += "    bar [" + ", ".join([str(hourly_data[h]["recordings_count"]) for h in hours]) + "]\n"

            hourly_file = output_dir / "chart_hourly_activity.mmd"
            with open(hourly_file, 'w', encoding='utf-8') as f:
                f.write(hourly_chart)
            print(f"  ✓ {hourly_file.name}")

    # 7. Speaking Rate Distribution
    if recordings_data:
        from collections import defaultdict
        wpm_buckets = defaultdict(int)
        for rec in recordings_data:
            if rec.get("words_per_minute", 0) > 0:
                # Bucket into 25 WPM increments
                bucket = int(rec["words_per_minute"] // 25) * 25
                wpm_buckets[bucket] += 1

        if wpm_buckets:
            sorted_buckets = sorted(wpm_buckets.keys())
            max_count = max(wpm_buckets.values())
            wpm_chart = "xychart-beta\n"
            wpm_chart += '    title "Speaking Rate Distribution"\n'
            wpm_chart += "    x-axis [" + ", ".join([f'"{b}-{b+24}"' for b in sorted_buckets]) + "]\n"
            wpm_chart += f'    y-axis "Recordings" 0 --> {max_count + 5}\n'
            wpm_chart += "    bar [" + ", ".join([str(wpm_buckets[b]) for b in sorted_buckets]) + "]\n"

            wpm_file = output_dir / "chart_speaking_rate.mmd"
            with open(wpm_file, 'w', encoding='utf-8') as f:
                f.write(wpm_chart)
            print(f"  ✓ {wpm_file.name}")

    # 8. Top Filler Words
    if filler_data:
        top_filler_data = filler_data.most_common(top_fillers)
        if top_filler_data:
            max_count = max(c for _, c in top_filler_data)
            filler_chart = "xychart-beta horizontal\n"
            filler_chart += f'    title "Top {top_fillers} Most Common Filler Words"\n'
            filler_chart += "    x-axis [" + ", ".join([f'"{escape_mermaid_label(f)}"' for f, _ in top_filler_data]) + "]\n"
            filler_chart += f'    y-axis "Count" 0 --> {max_count + 10}\n'
            filler_chart += "    bar [" + ", ".join([str(c) for _, c in top_filler_data]) + "]\n"

            filler_file = output_dir / "chart_filler_words.mmd"
            with open(filler_file, 'w', encoding='utf-8') as f:
                f.write(filler_chart)
            print(f"  ✓ {filler_file.name}")

