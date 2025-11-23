"""CLI module - Command-line interface with Typer and Rich

Modern CLI with beautiful help, progress bars, and rich formatting.
Supports both interactive menu and direct command invocation.
"""

import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table

from lib.core.config import load_config, resolve_path, validate_config
from lib.outputs.csv import generate_csv_files
from lib.outputs.json import generate_json_file
from lib.outputs.markdown import generate_ai_prompt_file, generate_insights_report
from lib.outputs.mermaid import generate_mermaid_charts
from lib.outputs.output_manager import parse_output_selection
from lib.outputs.xlsx import generate_xlsx_file
from lib.processing.aggregators import create_analytics_summary
from lib.processing.recording_processor import process_recordings
from lib.processing.validators import validate_filter_criteria
from lib.search.search_export import export_search_results
from lib.search.search_history import add_search, clear_history, get_recent_searches
from lib.search.transcript_search import search_transcripts
from lib.utils.logger import create_progress, print_header, print_success, setup_logger
from lib.utils.timing import Timer

app = typer.Typer(
    name="analytics",
    help="Superwhisper Analytics - Analyze voice recording metadata and generate comprehensive reports",
    add_completion=False,
    no_args_is_help=False
)

console = Console()


@app.command()
def analyze(
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
    outputs: Optional[str] = typer.Option(
        None,
        "--outputs",
        help="Comma-separated list of outputs: csv,json,xlsx,mermaid,insights,all (default: csv,json,insights)"
    ),
    skip_charts: bool = typer.Option(
        False,
        "--skip-charts",
        help="Skip generating Mermaid charts (faster)"
    ),
) -> None:
    """Analyse recordings and generate comprehensive reports.

    Examples:

        # Process all recordings (default outputs: CSV, JSON, insights)
        python3 main.py analyse

        # Generate only CSV output
        python3 main.py analyse --outputs csv

        # Generate all outputs
        python3 main.py analyse --outputs all

        # Custom output selection
        python3 main.py analyse --outputs csv,json,xlsx

        # Skip charts for faster processing
        python3 main.py analyse --skip-charts

        # Filter by specific date
        python3 main.py analyse --date 2025-01-15

        # Filter by month
        python3 main.py analyse --month 2025-01

        # Filter by date range with custom outputs
        python3 main.py analyse --date-from 2025-01-01 --date-to 2025-01-31 --outputs csv,insights
    """
    # Start overall timing
    overall_timer = Timer("Analysis")
    overall_timer.__enter__()

    print_header("Superwhisper Analytics")

    # Load configuration
    script_dir = Path(__file__).parent.parent
    config = load_config(script_dir)

    # Setup logger with daily rotation
    logs_dir = script_dir / "logs"
    setup_logger(enable_file_logging=True, logs_dir=logs_dir)

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

    # Display configuration in a panel
    config_info = f"[cyan]Recordings:[/cyan] {recordings_dir}\n"
    config_info += f"[cyan]Output:[/cyan] {output_dir}"
    console.print(Panel(config_info, title="📊 Configuration", border_style="blue", padding=(1, 2)))

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

    # Parse output selection
    try:
        output_selection = parse_output_selection(outputs, skip_charts)
    except ValueError as e:
        console.print(f"\n[red]✗ {e}[/red]")
        raise typer.Exit(1) from e

    # Show what will be generated
    enabled_outputs = output_selection.get_enabled_outputs()
    console.print(f"\n[cyan]Outputs to generate:[/cyan] {', '.join(enabled_outputs)}")

    # Create analytics summary
    console.print("[cyan]Computing analytics...[/cyan]")
    summary = create_analytics_summary(recordings_data)

    # Generate outputs based on selection
    try:
        # Extract data from summary for output generators
        daily_summary = summary.daily_summary
        hourly_data = summary.hourly_data
        word_freq = summary.word_freq
        mode_data = summary.mode_data
        topic_data = summary.topic_data
        filler_data = summary.filler_data
        bigram_freq = summary.bigram_freq
        trigram_freq = summary.trigram_freq
        sentence_summary = summary.sentence_summary

        generated_outputs = []

        # Generate selected output files
        if output_selection.csv:
            console.print("[cyan]Generating CSV files...[/cyan]")
            generate_csv_files(recordings_data, summary, output_dir)
            generated_outputs.append("CSV")

        if output_selection.json:
            console.print("[cyan]Generating JSON file...[/cyan]")
            generate_json_file(
                recordings_data, daily_summary, hourly_data, word_freq, mode_data,
                topic_data, filler_data, bigram_freq, trigram_freq, sentence_summary, output_dir
            )
            generated_outputs.append("JSON")

        if output_selection.xlsx:
            console.print("[cyan]Generating XLSX file...[/cyan]")
            generate_xlsx_file(
                recordings_data, daily_summary, hourly_data, word_freq, mode_data,
                topic_data, filler_data, bigram_freq, trigram_freq, sentence_summary, output_dir
            )
            generated_outputs.append("XLSX")

        if output_selection.mermaid:
            console.print("[cyan]Generating Mermaid charts...[/cyan]")
            generate_mermaid_charts(
                recordings_data, daily_summary, word_freq, mode_data, topic_data,
                output_dir, config, hourly_data, filler_data
            )
            generated_outputs.append("Mermaid")

        if output_selection.insights:
            console.print("[cyan]Generating insights report...[/cyan]")
            generate_insights_report(recordings_data, output_dir)
            generate_ai_prompt_file(output_dir)
            generated_outputs.append("Insights")

    except Exception as e:
        console.print(f"\n[red]✗ Error generating outputs: {e}[/red]")
        raise typer.Exit(1) from e

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

    # Final success message with timing
    overall_timer.__exit__(None, None, None)
    console.print()
    print_success(f"Analysis complete! Generated: {', '.join(generated_outputs)}")
    console.print(f"[dim]Output directory: {output_dir}[/dim]")
    console.print(f"[dim]⏱️  Completed in {overall_timer.get_formatted_elapsed()}[/dim]")
    console.print()


# Add UK English alias for analyze command
analyse = analyze


@app.command()
def search(
    term: str = typer.Argument(..., help="Search term or phrase to find in transcripts"),
    case_sensitive: bool = typer.Option(
        False,
        "--case-sensitive",
        "-c",
        help="Perform case-sensitive search (exact mode only)"
    ),
    fuzzy: bool = typer.Option(
        False,
        "--fuzzy",
        "-f",
        help="Enable fuzzy search (tolerates typos)"
    ),
    similarity: int = typer.Option(
        80,
        "--similarity",
        "-s",
        help="Minimum similarity score for fuzzy matches (0-100)",
        min=0,
        max=100
    ),
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
    export: Optional[str] = typer.Option(
        None,
        "--export",
        "-e",
        help="Export results to file (CSV or JSON)"
    ),
    export_format: Optional[str] = typer.Option(
        None,
        "--export-format",
        help="Export format: csv or json (auto-detected from filename if not specified)"
    ),
) -> None:
    """Search transcript content across all recordings.

    Examples:

        # Basic exact search
        python3 main.py search "database"

        # Fuzzy search (catches typos)
        python3 main.py search "bigqery" --fuzzy

        # Fuzzy search with custom similarity threshold
        python3 main.py search "analitics" --fuzzy --similarity 75

        # Case-sensitive exact search
        python3 main.py search "BigQuery" --case-sensitive

        # Search with date filter
        python3 main.py search "meeting" --date 2025-01-15

        # Export search results to CSV
        python3 main.py search "database" --export results.csv

        # Export to JSON
        python3 main.py search "database" --export results.json

        # Fuzzy search with export
        python3 main.py search "project" --fuzzy --export project_matches.csv
    """
    # Start timing
    search_timer = Timer("Search")
    search_timer.__enter__()

    print_header("Transcript Search")

    # Load configuration
    script_dir = Path(__file__).parent.parent
    config = load_config(script_dir)

    # Setup logger
    logs_dir = script_dir / "logs"
    setup_logger(enable_file_logging=True, logs_dir=logs_dir)

    # Resolve paths
    recordings_dir = resolve_path(config['paths']['recordings_dir'], script_dir)

    # Validate configuration
    validate_config(config, script_dir)

    # Display search info in a panel
    search_mode = "fuzzy" if fuzzy else "exact"
    search_info = f"[cyan]Search term:[/cyan] \"{term}\"\n"
    search_info += f"[cyan]Mode:[/cyan] {search_mode}"
    if fuzzy:
        search_info += f" (similarity ≥ {similarity}%)"
    elif case_sensitive:
        search_info += " (case-sensitive)"
    search_info += f"\n[cyan]Recordings:[/cyan] {recordings_dir}"

    console.print(Panel(search_info, title="🔍 Search Configuration", border_style="blue", padding=(1, 2)))

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

    # Perform search with progress bar
    with create_progress() as progress:
        task = progress.add_task("[cyan]Searching transcripts...", total=None)

        results = search_transcripts(
            recordings_dir,
            term,
            case_sensitive=case_sensitive,
            search_mode=search_mode,
            similarity_threshold=similarity,
            date_filter=date,
            month_filter=month,
            date_from=date_from,
            date_to=date_to
        )

        progress.update(task, completed=True)

    # Display results
    if results["recordings_with_matches"] == 0:
        console.print("\n[yellow]No matches found.[/yellow]")
        if date or month or date_from or date_to:
            console.print("[dim]Try adjusting your date filters or search term.[/dim]")
        raise typer.Exit(0)

    # Summary statistics
    console.print()
    summary_table = Table(title="Search Results", show_header=True, header_style="bold magenta")
    summary_table.add_column("Metric", style="cyan", no_wrap=True)
    summary_table.add_column("Value", justify="right", style="green")

    summary_table.add_row("Total Matches", f"{results['total_matches']:,}")
    summary_table.add_row("Recordings with Matches", f"{results['recordings_with_matches']:,}")
    summary_table.add_row(
        "Avg Matches per Recording",
        f"{results['total_matches'] / results['recordings_with_matches']:.1f}"
    )

    console.print(summary_table)

    # Detailed matches table (show top 20)
    console.print()
    matches_table = Table(
        title=f"Top Matches (showing {min(20, len(results['matches']))} of {len(results['matches'])})",
        show_header=True,
        header_style="bold blue"
    )
    matches_table.add_column("Date", style="cyan", no_wrap=True)
    matches_table.add_column("Mode", style="yellow")

    # Add similarity column for fuzzy search
    if results.get("search_mode") == "fuzzy":
        matches_table.add_column("Similarity", justify="right", style="green")

    matches_table.add_column("Count", justify="right", style="green")
    matches_table.add_column("Words", justify="right", style="dim")
    matches_table.add_column("Duration", justify="right", style="dim")
    matches_table.add_column("Excerpt", style="white", max_width=60)

    for match in results["matches"][:20]:
        # Format excerpt (show first one only for table)
        excerpt = match["excerpts"][0] if match["excerpts"] else ""
        # Truncate if too long
        if len(excerpt) > 100:
            excerpt = excerpt[:97] + "..."

        # Highlight search term in excerpt (case-insensitive for display)
        if excerpt and results.get("search_mode") == "exact":
            # Use Rich markup to highlight the search term
            import re
            search_term = results.get("search_term", "")
            if search_term:
                # Create case-insensitive pattern
                pattern = re.compile(re.escape(search_term), re.IGNORECASE)
                excerpt = pattern.sub(lambda m: f"[bold yellow]{m.group()}[/bold yellow]", excerpt)

        row_data = [
            match["date"],
            match["mode"],
        ]

        # Add similarity score if fuzzy mode
        if results.get("search_mode") == "fuzzy":
            row_data.append(f"{match.get('similarity_score', 0)}%")

        row_data.extend([
            str(match["occurrence_count"]),
            str(match["word_count"]),
            f"{match['duration_seconds']:.0f}s",
            excerpt
        ])

        matches_table.add_row(*row_data)

    console.print(matches_table)

    # Add to search history
    add_search(term, search_mode, results["total_matches"])

    # Export results if requested
    if export:
        try:
            export_path = Path(export)
            export_search_results(results, export_path, export_format)
            console.print()
            print_success(f"Results exported to: {export_path}")
        except ValueError as e:
            console.print(f"\n[red]✗ Export error: {e}[/red]")
        except Exception as e:
            console.print(f"\n[red]✗ Error exporting results: {e}[/red]")

    # Final success message with timing
    search_timer.__exit__(None, None, None)
    console.print()
    print_success(f"Found {results['total_matches']:,} matches in {results['recordings_with_matches']:,} recordings")
    console.print(f"[dim]⏱️  Completed in {search_timer.get_formatted_elapsed()}[/dim]")
    console.print()


@app.command()
def history(
    clear: bool = typer.Option(
        False,
        "--clear",
        help="Clear all search history"
    ),
) -> None:
    """Show recent search history.

    Examples:

        # View recent searches
        python3 main.py history

        # Clear search history
        python3 main.py history --clear
    """
    print_header("Search History")

    if clear:
        clear_history()
        print_success("Search history cleared")
        return

    recent = get_recent_searches(limit=20)

    if not recent:
        console.print("\n[yellow]No search history found.[/yellow]")
        console.print("[dim]Your searches will be saved here automatically.[/dim]\n")
        return

    # Display history table
    console.print()
    history_table = Table(
        title=f"Recent Searches (showing {len(recent)})",
        show_header=True,
        header_style="bold magenta"
    )
    history_table.add_column("Date", style="cyan", no_wrap=True)
    history_table.add_column("Time", style="cyan", no_wrap=True)
    history_table.add_column("Term", style="white")
    history_table.add_column("Mode", style="yellow")
    history_table.add_column("Results", justify="right", style="green")

    for entry in recent:
        # Parse timestamp
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(entry["timestamp"])
            date_str = dt.strftime("%Y-%m-%d")
            time_str = dt.strftime("%H:%M")
        except (ValueError, KeyError):
            date_str = "Unknown"
            time_str = ""

        history_table.add_row(
            date_str,
            time_str,
            entry.get("term", ""),
            entry.get("mode", "exact"),
            f"{entry.get('result_count', 0):,}"
        )

    console.print(history_table)
    console.print()


def show_interactive_menu() -> None:
    """Display interactive menu for choosing actions."""
    print_header("Superwhisper Analytics")

    # Welcome panel
    welcome_text = (
        "[cyan]Welcome to Superwhisper Analytics![/cyan]\n\n"
        "Choose an option below to get started:"
    )
    console.print(Panel(welcome_text, border_style="blue", padding=(1, 2)))
    console.print()

    # Menu options
    menu_table = Table(show_header=False, box=None, padding=(0, 2))
    menu_table.add_column("Option", style="bold cyan", no_wrap=True)
    menu_table.add_column("Description", style="white")

    menu_table.add_row("1", "Quick analyse (CSV + insights, fastest)")
    menu_table.add_row("2", "Full analyse (all outputs)")
    menu_table.add_row("3", "Custom analyse (choose outputs)")
    menu_table.add_row("4", "Search transcripts")
    menu_table.add_row("5", "Exit")

    console.print(menu_table)
    console.print()

    # Get user choice
    choice = Prompt.ask(
        "[bold]Select an option[/bold]",
        choices=["1", "2", "3", "4", "5"],
        default="1"
    )

    console.print()

    if choice in ["1", "2", "3"]:
        # Determine output selection based on choice
        if choice == "1":
            # Quick analysis
            outputs_str = "csv,insights"
            skip_charts = True
            console.print("[cyan]Mode:[/cyan] Quick analyse (CSV + insights)")
        elif choice == "2":
            # Full analysis
            outputs_str = "all"
            skip_charts = False
            console.print("[cyan]Mode:[/cyan] Full analyse (all outputs)")
        else:
            # Custom analysis
            console.print("[cyan]Mode:[/cyan] Custom analyse")
            console.print("\n[dim]Select which outputs to generate:[/dim]")

            # Ask for each output type
            want_csv = Prompt.ask("Generate CSV files?", choices=["y", "n"], default="y")
            want_json = Prompt.ask("Generate JSON file?", choices=["y", "n"], default="y")
            want_xlsx = Prompt.ask("Generate XLSX file?", choices=["y", "n"], default="n")
            want_mermaid = Prompt.ask("Generate Mermaid charts?", choices=["y", "n"], default="n")
            want_insights = Prompt.ask("Generate insights report?", choices=["y", "n"], default="y")

            want_csv = want_csv == "y"
            want_json = want_json == "y"
            want_xlsx = want_xlsx == "y"
            want_mermaid = want_mermaid == "y"
            want_insights = want_insights == "y"

            # Build outputs string
            selected_outputs = []
            if want_csv:
                selected_outputs.append("csv")
            if want_json:
                selected_outputs.append("json")
            if want_xlsx:
                selected_outputs.append("xlsx")
            if want_mermaid:
                selected_outputs.append("mermaid")
            if want_insights:
                selected_outputs.append("insights")

            outputs_str = ",".join(selected_outputs) if selected_outputs else "csv"
            skip_charts = not want_mermaid

        # Ask for date filters
        console.print()
        use_filters = Prompt.ask(
            "Apply date filters?",
            choices=["y", "n"],
            default="n"
        )

        if use_filters == "y":
            console.print("\n[dim]Leave blank to skip a filter[/dim]")
            date = Prompt.ask("Filter by date (YYYY-MM-DD)", default="")
            month = Prompt.ask("Filter by month (YYYY-MM)", default="")
            date_from = Prompt.ask("Filter from date (YYYY-MM-DD)", default="")
            date_to = Prompt.ask("Filter to date (YYYY-MM-DD)", default="")

            # Convert empty strings to None
            date = date if date else None
            month = month if month else None
            date_from = date_from if date_from else None
            date_to = date_to if date_to else None
        else:
            date = month = date_from = date_to = None

        console.print()
        analyze(
            date=date,
            month=month,
            date_from=date_from,
            date_to=date_to,
            outputs=outputs_str,
            skip_charts=skip_charts
        )

    elif choice == "2":
        # Search transcripts
        search_term = Prompt.ask("[bold]Enter search term[/bold]")

        case_sensitive = Prompt.ask(
            "Case-sensitive search?",
            choices=["y", "n"],
            default="n"
        )

        use_filters = Prompt.ask(
            "Apply date filters?",
            choices=["y", "n"],
            default="n"
        )

        if use_filters == "y":
            console.print("\n[dim]Leave blank to skip a filter[/dim]")
            date = Prompt.ask("Filter by date (YYYY-MM-DD)", default="")
            month = Prompt.ask("Filter by month (YYYY-MM)", default="")
            date_from = Prompt.ask("Filter from date (YYYY-MM-DD)", default="")
            date_to = Prompt.ask("Filter to date (YYYY-MM-DD)", default="")

            # Convert empty strings to None
            date = date if date else None
            month = month if month else None
            date_from = date_from if date_from else None
            date_to = date_to if date_to else None
        else:
            date = month = date_from = date_to = None

        console.print()
        search(
            term=search_term,
            case_sensitive=(case_sensitive == "y"),
            date=date,
            month=month,
            date_from=date_from,
            date_to=date_to
        )

    elif choice == "5":
        console.print("[yellow]Goodbye![/yellow]")
        raise typer.Exit(0)


@app.callback(invoke_without_command=True)
def main_callback(ctx: typer.Context) -> None:
    """Main entry point - shows interactive menu if no command specified."""
    # If a subcommand is being invoked, let it handle execution
    if ctx.invoked_subcommand is not None:
        return

    # If arguments are provided but no command, show help
    if len(sys.argv) > 1:
        console.print("[red]Error: Please specify a command (analyze or search)[/red]")
        console.print("\nAvailable commands:")
        console.print("  [cyan]analyze[/cyan]  - Run full analytics on recordings")
        console.print("  [cyan]search[/cyan]   - Search transcript content")
        console.print("\nRun with --help for more information")
        raise typer.Exit(1)

    # No command and no arguments - show interactive menu
    show_interactive_menu()


if __name__ == "__main__":
    app()

