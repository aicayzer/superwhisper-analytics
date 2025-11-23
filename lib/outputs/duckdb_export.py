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

        # Create recordings table
        con.execute("""
            CREATE TABLE recordings AS
            SELECT * FROM recordings_data
        """, {"recordings_data": recordings_data})

        # Create daily summary table
        con.execute("""
            CREATE TABLE daily_summary AS
            SELECT * FROM daily_data
        """, {"daily_data": daily_summary})

        # Create hourly patterns table
        con.execute("""
            CREATE TABLE hourly_patterns AS
            SELECT * FROM hourly_data
        """, {"hourly_data": hourly_data})

        # Create word frequency table
        word_freq_data = [{"word": word, "count": count} for word, count in word_freq]
        con.execute("""
            CREATE TABLE word_frequency AS
            SELECT * FROM word_data
        """, {"word_data": word_freq_data})

        # Create mode usage table
        con.execute("""
            CREATE TABLE mode_usage AS
            SELECT * FROM mode_data
        """, {"mode_data": mode_data})

        # Create topic distribution table
        con.execute("""
            CREATE TABLE topic_distribution AS
            SELECT * FROM topic_data
        """, {"topic_data": topic_data})

        # Create filler words table
        filler_data_list = [{"phrase": phrase, "count": count} for phrase, count in filler_data]
        con.execute("""
            CREATE TABLE filler_words AS
            SELECT * FROM filler_data
        """, {"filler_data": filler_data_list})

        # Create bigrams table
        bigram_data = [{"bigram": phrase, "count": count} for phrase, count in bigram_freq]
        con.execute("""
            CREATE TABLE bigrams AS
            SELECT * FROM bigram_data
        """, {"bigram_data": bigram_data})

        # Create trigrams table
        trigram_data = [{"trigram": phrase, "count": count} for phrase, count in trigram_freq]
        con.execute("""
            CREATE TABLE trigrams AS
            SELECT * FROM trigram_data
        """, {"trigram_data": trigram_data})

        # Create sentence metrics table (single row summary)
        sentence_data = [sentence_summary]
        con.execute("""
            CREATE TABLE sentence_metrics AS
            SELECT * FROM sentence_data
        """, {"sentence_data": sentence_data})

        # Close connection
        con.close()

        print(f"✓ DuckDB database created: {db_path}")

    except Exception as e:
        print(f"✗ Error creating DuckDB database: {e}")
        # Clean up partial file
        if db_path.exists():
            db_path.unlink()

