"""Logger module - Professional logging with rich integration

Provides structured logging with colour coding, progress tracking, and rich formatting.
"""

import logging
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.logging import RichHandler
from rich.progress import BarColumn, Progress, SpinnerColumn, TaskProgressColumn, TextColumn, TimeRemainingColumn

# Global console for rich output
console = Console()

# Global logger instance
_logger: Optional[logging.Logger] = None


def setup_logger(
    name: str = "analytics",
    level: int = logging.INFO,
    log_file: Optional[Path] = None
) -> logging.Logger:
    """Setup logger with rich integration

    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional file path for file logging

    Returns:
        Configured logger instance
    """
    global _logger

    if _logger is not None:
        return _logger

    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Remove any existing handlers
    logger.handlers = []

    # Rich console handler with colour coding
    console_handler = RichHandler(
        console=console,
        show_time=False,
        show_path=False,
        markup=True,
        rich_tracebacks=True,
        tracebacks_show_locals=False
    )
    console_handler.setLevel(level)
    logger.addHandler(console_handler)

    # Optional file handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    _logger = logger
    return logger


def get_logger() -> logging.Logger:
    """Get the global logger instance

    Returns:
        Logger instance (creates one if doesn't exist)
    """
    global _logger
    if _logger is None:
        _logger = setup_logger()
    return _logger


def create_progress() -> Progress:
    """Create a rich progress bar for long-running operations

    Returns:
        Progress instance configured with spinner, bar, and time remaining
    """
    return Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        TimeRemainingColumn(),
        console=console
    )


def print_header(title: str) -> None:
    """Print a formatted header

    Args:
        title: Header title text
    """
    console.print()
    console.rule(f"[bold blue]{title}[/bold blue]")
    console.print()


def print_success(message: str) -> None:
    """Print a success message

    Args:
        message: Success message text
    """
    console.print(f"[green]✓[/green] {message}")


def print_error(message: str) -> None:
    """Print an error message

    Args:
        message: Error message text
    """
    console.print(f"[red]✗[/red] {message}")


def print_warning(message: str) -> None:
    """Print a warning message

    Args:
        message: Warning message text
    """
    console.print(f"[yellow]⚠[/yellow] {message}")


def print_info(message: str) -> None:
    """Print an info message

    Args:
        message: Info message text
    """
    console.print(f"[blue]ℹ[/blue] {message}")


def print_section(title: str) -> None:
    """Print a section header

    Args:
        title: Section title
    """
    console.print(f"\n[bold]{title}[/bold]")

