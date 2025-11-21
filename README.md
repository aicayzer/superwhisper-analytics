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

## Configuration

The script uses configuration files for path management, making it portable across different systems.

### Setup Configuration

1. Copy the example configuration:
   ```bash
   cp config.local.ini.example config.local.ini
   ```

2. Edit `config.local.ini` to match your system:
   ```ini
   [paths]
   # Path to your recordings directory
   recordings_dir = ../recordings
   
   # Path for output files
   output_dir = ./outputs
   
   [analysis]
   default_top_words = 500
   ```

**Configuration Priority:**
- `config.local.ini` (if exists, not tracked in git)
- `config.ini` (default template)
- Built-in defaults

**Path Formats:**
- Relative paths: `../recordings` (relative to script directory)
- Absolute paths: `/path/to/recordings`

## Usage

Run the script from the analysis directory:

```bash
python3 analytics.py
```

The script will:
1. Load configuration from `config.local.ini` or `config.ini`
2. Process all recordings in the configured recordings directory
3. Generate outputs in a timestamped folder

Each recording should be in its own folder with `meta.json` and optionally `output.wav` files.

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
  2025-01-15_14-30-45/
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

## Example Recording Structure

Your recordings directory should follow this structure:

```
recordings/
  1640000000/
    meta.json
    output.wav
  1640000123/
    meta.json
    output.wav
  ...
```

Each folder is named with a Unix timestamp and contains:
- `meta.json`: Metadata including transcript, mode, datetime, etc.
- `output.wav`: Audio file (optional, used for duration validation)

