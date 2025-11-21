"""CLI module - Command-line interface with Typer and Rich

Modern CLI with beautiful help, progress bars, and rich formatting.
"""

import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from lib.core.config import load_config, resolve_path, validate_config
from lib.core.analytics_summary import AnalyticsSummary
from lib.processing.validators import validate_filter_criteria
from lib.processing.recording_processor import process_recordings
from lib.processing.aggregators import create_analytics_summary
from lib.outputs.csv import generate_csv_files
from lib.utils.logger import print_header, print_success, print_info, create_progress

app = typer.Typer(
    name="analytics",
    help="Super Whisper Analytics - Analyze voice recording metadata and generate comprehensive reports",
    add_completion=False
)

console = Console()


@app.command()
def main(
    date: Optional[str] = typer.Option(
        None,
        "--date",
        help="Filter recordings by specific date (YYYY-MM-DD format)"
    ),
    month: Optional[str] = typer.Option(
        None,
        "--month",
        help="Filter recordings by month (YYYY-MM format)"
    ),
    date_from: Optional[str] = typer.Option(
        None,
        "--date-from",
        help="Filter recordings from this date onwards (YYYY-MM-DD format)"
    ),
    date_to: Optional[str] = typer.Option(
        None,
        "--date-to",
        help="Filter recordings up to this date (YYYY-MM-DD format)"
    ),
) -> None:
    """Process Super Whisper recordings and generate analytics reports.
    
    Examples:
    
        # Process all recordings
        python3 main.py
        
        # Filter by specific date
        python3 main.py --date 2025-01-15
        
        # Filter by month
        python3 main.py --month 2025-01
        
        # Filter by date range
        python3 main.py --date-from 2025-01-01 --date-to 2025-01-31
    """
    
    print_header("Super Whisper Analytics")
    
    # Load configuration
    script_dir = Path(__file__).parent.parent
    config = load_config(script_dir)
    
    # Resolve paths
    recordings_dir = resolve_path(config['paths']['recordings_dir'], script_dir)
    outputs_base = resolve_path(config['paths']['output_dir'], script_dir)
    
    # Validate configuration
    validate_config(config, script_dir)
    
    # Create timestamped output folder
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    outputs_base.mkdir(exist_ok=True)
    output_dir = outputs_base / timestamp
    output_dir.mkdir(exist_ok=True)
    
    # Display configuration
    console.print(f"[blue]📁 Recordings:[/blue] {recordings_dir}")
    console.print(f"[blue]📊 Output:[/blue] {output_dir}")
    
    # Display active filters
    if date or month or date_from or date_to:
        console.print("\n[yellow]Active filters:[/yellow]")
        if date:
            console.print(f"  • Date: {date}")
        if month:
            console.print(f"  • Month: {month}")
        if date_from:
            console.print(f"  • From: {date_from}")
        if date_to:
            console.print(f"  • To: {date_to}")
    
    console.print()
    
    # Validate filters
    filter_criteria = {}
    if date:
        filter_criteria['date'] = date
    if month:
        filter_criteria['month'] = month
    if date_from:
        filter_criteria['date_from'] = date_from
    if date_to:
        filter_criteria['date_to'] = date_to
    
    if filter_criteria:
        validate_filter_criteria(filter_criteria)
    
    # Process recordings with progress bar
    with create_progress() as progress:
        task = progress.add_task("[cyan]Processing recordings...", total=None)
        
        recordings_data = process_recordings(
            recordings_dir,
            date_filter=date,
            month_filter=month,
            date_from=date_from,
            date_to=date_to
        )
        
        progress.update(task, completed=True)
    
    if not recordings_data:
        console.print("\n[red]✗[/red] No recordings found matching the specified criteria!")
        if date or month or date_from or date_to:
            console.print("[yellow]Try adjusting your date filters or removing them to see all recordings.[/yellow]")
        raise typer.Exit(1)
    
    print_success(f"Processed {len(recordings_data):,} recordings")
    
    # Create analytics summary
    console.print("\n[cyan]Computing analytics...[/cyan]")
    summary = create_analytics_summary(recordings_data)
    
    # Generate outputs
    try:
        # CSV files
        generate_csv_files(recordings_data, summary, output_dir)
        
        # For now, call the old functions for other outputs
        # TODO: Extract these to dedicated modules
        from analytics import (
            generate_insights_report,
            generate_xlsx_file,
            generate_json_file,
            generate_mermaid_charts,
            generate_ai_prompt_file
        )
        
        # Extract data from summary for old functions
        daily_summary = summary.daily_summary
        hourly_data = summary.hourly_data
        word_freq = summary.word_freq
        mode_data = summary.mode_data
        topic_data = summary.topic_data
        filler_data = summary.filler_data
        bigram_freq = summary.bigram_freq
        trigram_freq = summary.trigram_freq
        sentence_summary = summary.sentence_summary
        
        generate_insights_report(recordings_data, output_dir)
        generate_xlsx_file(recordings_data, daily_summary, hourly_data, word_freq, mode_data, topic_data, filler_data, bigram_freq, trigram_freq, sentence_summary, output_dir)
        generate_json_file(recordings_data, daily_summary, hourly_data, word_freq, mode_data, topic_data, filler_data, bigram_freq, trigram_freq, sentence_summary, output_dir)
        generate_mermaid_charts(recordings_data, daily_summary, word_freq, mode_data, topic_data, output_dir)
        generate_ai_prompt_file(output_dir)
    except Exception as e:
        console.print(f"\n[red]✗ Error generating outputs: {e}[/red]")
        raise typer.Exit(1)
    
    # Summary table
    console.print()
    table = Table(title="Analytics Summary", show_header=True, header_style="bold magenta")
    table.add_column("Metric", style="cyan", no_wrap=True)
    table.add_column("Value", justify="right", style="green")
    
    total_duration = sum(r["duration_seconds"] for r in recordings_data)
    total_words = sum(r["word_count"] for r in recordings_data)
    
    table.add_row("Total Recordings", f"{len(recordings_data):,}")
    table.add_row("Total Duration", f"{total_duration/3600:.1f} hours")
    table.add_row("Total Words", f"{total_words:,}")
    table.add_row("Unique Words", f"{len(summary.word_freq):,}")
    table.add_row("Topics Found", f"{len(summary.topic_data)}")
    table.add_row("Modes Used", f"{len(summary.mode_data)}")
    
    console.print(table)
    
    # Final success message
    console.print()
    print_success(f"Analytics complete! Output saved to: {output_dir}")
    console.print()


if __name__ == "__main__":
    app()

