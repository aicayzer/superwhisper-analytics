"""Logger module - Professional logging with rich integration

Provides structured logging with colour coding, progress tracking, and rich formatting.
Supports daily log file rotation for persistent error tracking.
"""

import logging
from datetime import datetime
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
    log_file: Optional[Path] = None,
    enable_file_logging: bool = True,
    logs_dir: Optional[Path] = None
) -> logging.Logger:
    """Setup logger with rich integration and daily log rotation

    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional specific file path for file logging (overrides daily rotation)
        enable_file_logging: Enable file-based logging with daily rotation
        logs_dir: Directory for log files (defaults to ./logs)

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

    # File handler with daily rotation
    if enable_file_logging or log_file:
        if log_file:
            # Use specific log file path
            log_path = log_file
        else:
            # Use daily log file in logs directory
            if logs_dir is None:
                # Default to logs directory relative to project root
                logs_dir = Path(__file__).parent.parent.parent / "logs"
            
            logs_dir.mkdir(exist_ok=True)
            
            # Create daily log file
            today = datetime.now().strftime("%Y-%m-%d")
            log_path = logs_dir / f"{today}.log"
        
        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
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


def reset_logger() -> None:
    """Reset the global logger instance
    
    Useful for testing or reconfiguration.
    """
    global _logger
    if _logger is not None:
        # Remove all handlers
        for handler in _logger.handlers[:]:
            handler.close()
            _logger.removeHandler(handler)
        _logger = None


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

