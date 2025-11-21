# Super Whisper Analytics

A professional, modular analytics tool for analyzing Super Whisper recordings. Generates comprehensive statistics, topic analysis, and insights from your recording metadata with a beautiful command-line interface.

## Features

### Core Analytics
- **Time-based analysis** - Daily, hourly, weekly patterns with flexible date filtering
- **Volume metrics** - Words, characters, speech rate, recording duration
- **Topic classification** - 8 categories using keyword matching
- **Mode tracking** - Usage patterns across different recording modes

### Text Analysis
- **Word frequency** - Top 500 words (excluding stop words)
- **Phrase extraction** - N-gram analysis (bigrams and trigrams)
- **Filler word detection** - 30+ patterns including multi-word phrases
- **Sentence metrics** - Comprehensive sentence-level statistics

### Technical Features
- **Modern CLI** - Typer-based interface with Rich formatting
- **Progress tracking** - Real-time progress bars during processing
- **Beautiful output** - Color-coded messages and summary tables
- **Modular architecture** - Clean separation of concerns for maintainability
- **Date filtering** - Filter by specific date, month, or date range
- **Multiple output formats** - CSV, XLSX, JSON, Markdown, Mermaid charts
- **Timestamped outputs** - Each run creates a new folder preserving history
- **Platform agnostic** - Works with any Super Whisper installation

## Requirements

- Python 3.9+
- `typer` - Modern CLI framework
- `rich` - Beautiful terminal formatting
- `openpyxl` - Excel support (optional)

### Installation

```bash
# Activate virtual environment (if not already active)
source venv/bin/activate  # macOS/Linux
# or
.\venv\Scripts\activate  # Windows

# Install dependencies
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

Run the tool from the analysis directory:

```bash
# Process all recordings
python3 main.py

# Filter by specific date
python3 main.py --date 2025-01-15

# Filter by month
python3 main.py --month 2025-01

# Filter by date range
python3 main.py --date-from 2025-01-01 --date-to 2025-01-31

# Show help
python3 main.py --help
```

The tool will:
1. Load configuration from `config.local.ini` or `config.ini`
2. Apply any date filters specified
3. Process all matching recordings with progress tracking
4. Generate comprehensive analytics outputs in a timestamped folder
5. Display a beautiful summary table with key metrics

Each recording should be in its own folder with `meta.json` and optionally `output.wav` files.

### Command Line Options

- `--date YYYY-MM-DD`: Filter recordings by specific date
- `--month YYYY-MM`: Filter recordings by month
- `--date-from YYYY-MM-DD`: Filter recordings from this date onwards
- `--date-to YYYY-MM-DD`: Filter recordings up to this date
- `--help`: Show help message with all options

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

## Architecture

The tool follows a clean, modular architecture for maintainability and extensibility:

```
analysis/
├── main.py              # Entry point
├── lib/
│   ├── core/           # Core data structures and configuration
│   │   ├── constants.py      # Topic keywords, stop words, filler words
│   │   ├── models.py         # TypedDict data models
│   │   ├── config.py         # Configuration management
│   │   └── analytics_summary.py  # Summary dataclass
│   ├── processing/     # Data processing and analysis
│   │   ├── text_analysis.py      # Text processing functions
│   │   ├── validators.py         # Input validation
│   │   ├── recording_processor.py # Recording data extraction
│   │   └── aggregators.py        # Data aggregation logic
│   ├── outputs/        # Output generation
│   │   ├── csv.py      # CSV file generation
│   │   ├── xlsx.py     # Excel file generation
│   │   ├── json.py     # JSON file generation
│   │   ├── markdown.py # Markdown reports
│   │   └── mermaid.py  # Mermaid charts
│   ├── utils/          # Utility functions
│   │   └── logger.py   # Rich-based logging
│   └── cli.py          # Typer CLI interface
├── config.ini          # Default configuration
├── config.local.ini    # Local overrides (gitignored)
└── requirements.txt    # Python dependencies
```

### Design Principles

- **Single Responsibility** - Each module has one clear purpose
- **Centralized Aggregation** - Data is aggregated once, used everywhere
- **Type Safety** - TypedDict models for structured data
- **Clean Interfaces** - Clear function signatures and return types
- **No Duplication** - Shared logic extracted to reusable functions
- **Rich Logging** - Progress bars, colored output, summary tables

## Development

### Project Structure

The codebase is organized into logical modules:

- **`lib/core/`** - Core data structures, configuration, constants
- **`lib/processing/`** - Text analysis, validation, recording processing, aggregation
- **`lib/outputs/`** - Output generators for each format (CSV, XLSX, JSON, etc.)
- **`lib/utils/`** - Logging and utility functions
- **`lib/cli.py`** - Typer-based CLI interface

### Key Design Decisions

1. **Centralized Aggregation** - All data aggregation happens once in `aggregators.py`, creating an `AnalyticsSummary` object that is passed to all output generators. This eliminates duplication and ensures consistency.

2. **TypedDict Models** - Structured data models in `models.py` provide type safety and clear interfaces without runtime overhead.

3. **Rich Integration** - The `rich` library provides beautiful progress bars, colored output, and formatted tables throughout the tool.

4. **Configuration-Driven** - Paths and parameters are configurable via INI files, making the tool portable across systems.

### Testing

Run the baseline comparison test to ensure outputs match:

```bash
# Generate baseline (one-time)
python3 main.py  # or with specific filters
cp -r outputs/<latest> tmp/baseline

# Run test
bash tests/test_outputs.sh
```

### Adding New Output Formats

1. Create a new module in `lib/outputs/`
2. Implement a generation function that accepts `recordings_data` and `summary`
3. Import and call from `lib/cli.py` main function
4. All aggregated data is available in the `AnalyticsSummary` object

## Notes

- Transcripts are extracted from the `result` or `rawResult` fields in `meta.json`
- Topic classification uses keyword matching (configurable in `lib/core/constants.py`)
- XLSX generation is optional - tool will continue if openpyxl is not installed
- All outputs are saved to timestamped folders in `outputs/` directory
- Generated outputs and virtual environments are excluded from git (see `.gitignore`)
- The tool is platform-agnostic and works with any Super Whisper installation

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

