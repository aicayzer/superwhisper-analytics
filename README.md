# Super Whisper Analytics

Generic analytics tool for analyzing Super Whisper recordings. Generates comprehensive statistics, topic analysis, and insights from your recording metadata.

## Requirements

- Python 3.x
- `openpyxl` library for XLSX support (optional, install with `pip install openpyxl`)
- Super Whisper recordings folder structure

### Installation

```bash
pip install -r requirements.txt
```

## Usage

Run the script from the directory containing your Super Whisper workspace:

```bash
python3 analytics.py
```

The script expects a `recordings/` folder at the workspace root (one level up from the script location). Each recording should be in its own folder with `meta.json` and optionally `output.wav` files.

## Output

The script generates all outputs in a timestamped folder: `outputs/YYYY-MM-DD_HH-MM-SS/`

### Generated Files

**CSV Files:**
- **recordings_detail.csv** - Complete data for each recording
- **daily_summary.csv** - Aggregated daily statistics
- **hourly_patterns.csv** - Activity patterns by hour
- **word_frequency.csv** - Most common words (top 500)
- **mode_usage.csv** - Distribution across recording modes
- **topic_distribution.csv** - Topic classification statistics

**Other Formats:**
- **analytics.xlsx** - Excel workbook with all data in separate sheets (requires openpyxl)
- **analytics.json** - Complete structured JSON data with metadata
- **insights_report.md** - Summary report with key insights
- **insights_prompt.md** - AI prompt file for generating enhanced insights

Each run creates a new timestamped folder, preserving historical outputs.

## Features

- Time-based analysis (daily, hourly, weekly patterns)
- Volume metrics (words, characters, speech rate)
- Topic classification (8 categories)
- Word frequency analysis
- Technical metrics (processing efficiency, mode usage)

## Features

- **Time-based analysis** - Daily, hourly, weekly patterns
- **Volume metrics** - Words, characters, speech rate
- **Topic classification** - 8 categories using keyword matching
- **Word frequency analysis** - Most common words (excluding stop words)
- **Technical metrics** - Processing efficiency, mode usage
- **Multiple output formats** - CSV, XLSX, JSON, Markdown
- **Timestamped outputs** - Each run creates a new folder with timestamp
- **AI-ready prompts** - Includes prompt file for AI-assisted analysis

## Notes

- The script processes all recordings found in the `recordings/` folder
- Transcripts are extracted from the `result` or `rawResult` fields in `meta.json`
- Topic classification uses keyword matching
- XLSX generation is optional - script will continue if openpyxl is not installed
- All outputs are saved to timestamped folders in `outputs/` directory
- Generated outputs are excluded from git (see `.gitignore`)

## Output Structure

```
outputs/
  2025-11-20_12-30-45/
    analytics.xlsx
    analytics.json
    recordings_detail.csv
    daily_summary.csv
    hourly_patterns.csv
    word_frequency.csv
    mode_usage.csv
    topic_distribution.csv
    insights_report.md
    insights_prompt.md
```

