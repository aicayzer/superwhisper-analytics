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
# Process all recordings
python3 analytics.py

# Filter by specific date
python3 analytics.py --date 2025-01-15

# Filter by month
python3 analytics.py --month 2025-01

# Filter by date range
python3 analytics.py --date-from 2025-01-01 --date-to 2025-01-31
```

The script will:
1. Load configuration from `config.local.ini` or `config.ini`
2. Apply any date filters specified
3. Process all matching recordings
4. Generate comprehensive analytics outputs in a timestamped folder

Each recording should be in its own folder with `meta.json` and optionally `output.wav` files.

### Command Line Options

- `--date YYYY-MM-DD`: Filter recordings by specific date
- `--month YYYY-MM`: Filter recordings by month
- `--date-from YYYY-MM-DD`: Filter recordings from this date onwards
- `--date-to YYYY-MM-DD`: Filter recordings up to this date

Filters can be combined (e.g., `--month 2025-01 --date-from 2025-01-15`).

## Output

The script generates all outputs in a timestamped folder: `outputs/YYYY-MM-DD_HH-MM-SS/`

### Generated Files

**CSV Files:**
- **recordings_detail.csv** - Complete data for each recording (includes filler words, sentence metrics)
- **daily_summary.csv** - Aggregated daily statistics
- **hourly_patterns.csv** - Activity patterns by hour
- **word_frequency.csv** - Most common words (top 500)
- **phrase_frequency.csv** - Common 2-grams and 3-grams (top 150)
- **filler_word_analysis.csv** - Filler word/phrase usage breakdown
- **sentence_metrics.csv** - Aggregate sentence-level statistics
- **mode_usage.csv** - Distribution across recording modes
- **topic_distribution.csv** - Topic classification statistics

**Mermaid Visualisations:**
- **timeline_activity.mmd** - Daily/weekly recording activity timeline
- **timeline_topics.mmd** - Topic distribution over time (top 5 topics)
- **chart_top_words.mmd** - Top 20 most common words (horizontal bar chart)
- **chart_mode_usage.mmd** - Recording mode usage (horizontal bar chart)
- **chart_topic_distribution.mmd** - Topic distribution (horizontal bar chart)

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

### Core Analytics
- **Time-based analysis** - Daily, hourly, weekly patterns with configurable date filtering
- **Volume metrics** - Words, characters, speech rate, recording duration
- **Topic classification** - 8 categories using keyword matching
- **Mode tracking** - Usage patterns across different recording modes

### Text Analysis
- **Word frequency** - Top 500 words (excluding stop words)
- **Phrase extraction** - N-gram analysis (bigrams and trigrams)
- **Filler word detection** - 30+ patterns including multi-word phrases ("you know", "I mean", etc.)
- **Sentence metrics** - Sentence count, average words per sentence, average characters per sentence

### Visualisations
- **Timeline charts** - Activity and topic trends over time (auto-aggregates to weekly for large datasets)
- **Bar charts** - Word frequency, mode usage, topic distribution
- **Mermaid format** - Renders in Markdown viewers and documentation platforms

### Technical Features
- **Date filtering** - Filter by specific date, month, or date range
- **Configurable paths** - Platform-agnostic configuration system
- **Multiple output formats** - CSV, XLSX, JSON, Markdown, Mermaid
- **Timestamped outputs** - Each run creates a new folder preserving history
- **No external dependencies** - Uses only Python standard library (openpyxl optional for Excel)
- **AI-ready prompts** - Includes prompt file for AI-assisted deeper analysis

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
    # CSV Files
    recordings_detail.csv
    daily_summary.csv
    hourly_patterns.csv
    word_frequency.csv
    phrase_frequency.csv
    filler_word_analysis.csv
    sentence_metrics.csv
    mode_usage.csv
    topic_distribution.csv
    
    # Mermaid Charts
    timeline_activity.mmd
    timeline_topics.mmd
    chart_top_words.mmd
    chart_mode_usage.mmd
    chart_topic_distribution.mmd
    
    # Other Formats
    analytics.xlsx
    analytics.json
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

