"""DuckDB Export module - Generate DuckDB database with all analytics data

Creates a DuckDB database file with all recordings and analytics in queryable tables.
"""

from pathlib import Path

try:
    import duckdb
    DUCKDB_AVAILABLE = True
except ImportError:
    DUCKDB_AVAILABLE = False


def generate_duckdb_file(
    recordings_data: list[dict],
    daily_summary: list[dict],
    hourly_data: list[dict],
    word_freq: list[tuple[str, int]],
    mode_data: list[dict],
    topic_data: list[dict],
    filler_data: list[tuple[str, int]],
    bigram_freq: list[tuple[str, int]],
    trigram_freq: list[tuple[str, int]],
    sentence_summary: dict,
    output_dir: Path,
) -> None:
    """Generate DuckDB database file with all analytics data.

    Args:
        recordings_data: List of recording dictionaries
        daily_summary: Daily aggregated data
        hourly_data: Hourly pattern data
        word_freq: Word frequency data
        mode_data: Mode usage data
        topic_data: Topic distribution data
        filler_data: Filler word analysis data
        bigram_freq: Bigram frequency data
        trigram_freq: Trigram frequency data
        sentence_summary: Sentence-level metrics
        output_dir: Output directory path
    """
    if not DUCKDB_AVAILABLE:
        print("⚠️  DuckDB not available. Install with: pip install duckdb>=0.9.0")
        return

    db_path = output_dir / "analytics.duckdb"

    try:
        # Create connection
        con = duckdb.connect(str(db_path))

        # Create recordings table using DuckDB's from_records API
        if recordings_data:
            con.from_records(recordings_data).create("recordings")

        # Create daily summary table
        if daily_summary:
            con.from_records(daily_summary).create("daily_summary")

        # Create hourly patterns table
        if hourly_data:
            con.from_records(hourly_data).create("hourly_patterns")

        # Create word frequency table
        if word_freq:
            word_freq_data = [{"word": word, "count": count} for word, count in word_freq]
            con.from_records(word_freq_data).create("word_frequency")

        # Create mode usage table
        if mode_data:
            con.from_records(mode_data).create("mode_usage")

        # Create topic distribution table
        if topic_data:
            con.from_records(topic_data).create("topic_distribution")

        # Create filler words table
        if filler_data:
            filler_data_list = [{"phrase": phrase, "count": count} for phrase, count in filler_data]
            con.from_records(filler_data_list).create("filler_words")

        # Create bigrams table
        if bigram_freq:
            bigram_data = [{"bigram": phrase, "count": count} for phrase, count in bigram_freq]
            con.from_records(bigram_data).create("bigrams")

        # Create trigrams table
        if trigram_freq:
            trigram_data = [{"trigram": phrase, "count": count} for phrase, count in trigram_freq]
            con.from_records(trigram_data).create("trigrams")

        # Create sentence metrics table (single row summary)
        if sentence_summary:
            sentence_data = [sentence_summary]
            con.from_records(sentence_data).create("sentence_metrics")

        # Close connection
        con.close()

        print(f"✓ DuckDB database created: {db_path}")

    except Exception as e:
        print(f"✗ Error creating DuckDB database: {e}")
        # Clean up partial file
        if db_path.exists():
            db_path.unlink()

