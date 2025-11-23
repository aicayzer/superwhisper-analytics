"""Timing utilities for performance tracking and feedback."""

import time
from contextlib import contextmanager
from typing import Any, Callable


def format_duration(seconds: float) -> str:
    """Format duration in a human-readable format.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted duration string

    Examples:
        >>> format_duration(0.5)
        '0.5s'
        >>> format_duration(45.2)
        '45.2s'
        >>> format_duration(125.8)
        '2m 5.8s'
        >>> format_duration(3725.4)
        '1h 2m 5.4s'
    """
    if seconds < 60:
        return f"{seconds:.1f}s"

    minutes = int(seconds // 60)
    remaining_seconds = seconds % 60

    if minutes < 60:
        return f"{minutes}m {remaining_seconds:.1f}s"

    hours = int(minutes // 60)
    remaining_minutes = minutes % 60

    return f"{hours}h {remaining_minutes}m {remaining_seconds:.1f}s"


class Timer:
    """Context manager and decorator for timing operations."""

    def __init__(self, name: str = "Operation"):
        """Initialize timer.

        Args:
            name: Name of the operation being timed
        """
        self.name = name
        self.start_time: float | None = None
        self.end_time: float | None = None
        self.elapsed: float | None = None

    def __enter__(self) -> 'Timer':
        """Start the timer."""
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, *args: Any) -> None:
        """Stop the timer and calculate elapsed time."""
        self.end_time = time.perf_counter()
        if self.start_time is not None:
            self.elapsed = self.end_time - self.start_time

    def get_elapsed(self) -> float:
        """Get elapsed time in seconds.

        Returns:
            Elapsed time in seconds

        Raises:
            RuntimeError: If timer hasn't been used yet
        """
        if self.elapsed is None:
            raise RuntimeError("Timer hasn't completed yet")
        return self.elapsed

    def get_formatted_elapsed(self) -> str:
        """Get formatted elapsed time.

        Returns:
            Human-readable elapsed time string

        Raises:
            RuntimeError: If timer hasn't been used yet
        """
        return format_duration(self.get_elapsed())

    def __call__(self, func: Callable[..., Any]) -> Callable[..., Any]:
        """Use as a decorator.

        Args:
            func: Function to time

        Returns:
            Wrapped function
        """
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            with self:
                result = func(*args, **kwargs)
            return result
        return wrapper


@contextmanager
def time_operation(name: str = "Operation"):
    """Context manager for timing operations with automatic reporting.

    Args:
        name: Name of the operation

    Yields:
        Timer instance

    Example:
        >>> with time_operation("Processing") as timer:
        ...     # Do work
        ...     pass
        >>> print(f"Took {timer.get_formatted_elapsed()}")
    """
    timer = Timer(name)
    with timer:
        yield timer

