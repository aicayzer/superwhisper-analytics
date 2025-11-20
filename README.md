# Super Whisper Analytics

Generic analytics tool for analyzing Super Whisper recordings. Generates comprehensive statistics, topic analysis, and insights from your recording metadata.

## Requirements

- Python 3.x (no external dependencies required)
- Super Whisper recordings folder structure

## Usage

Run the script from the directory containing your Super Whisper workspace:

```bash
python3 analytics.py
```

The script expects a `recordings/` folder at the workspace root (one level up from the script location). Each recording should be in its own folder with `meta.json` and optionally `output.wav` files.

## Output

The script generates the following files in the same directory:

- **recordings_detail.csv** - Complete data for each recording
- **daily_summary.csv** - Aggregated daily statistics
- **hourly_patterns.csv** - Activity patterns by hour
- **word_frequency.csv** - Most common words (top 500)
- **mode_usage.csv** - Distribution across recording modes
- **topic_distribution.csv** - Topic classification statistics
- **insights_report.md** - Summary report with key insights

## Features

- Time-based analysis (daily, hourly, weekly patterns)
- Volume metrics (words, characters, speech rate)
- Topic classification (8 categories)
- Word frequency analysis
- Technical metrics (processing efficiency, mode usage)

## Notes

- The script processes all recordings found in the `recordings/` folder
- Transcripts are extracted from the `result` or `rawResult` fields in `meta.json`
- Topic classification uses keyword matching
- Generated CSV files and reports are excluded from git (see `.gitignore`)

