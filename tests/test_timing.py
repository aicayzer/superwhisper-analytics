"""Unit tests for timing utilities."""

import time

import pytest

from lib.utils.timing import Timer, format_duration, time_operation


class TestFormatDuration:
    """Tests for format_duration function."""

    def test_format_seconds_only(self):
        """Test formatting durations less than 1 minute."""
        assert format_duration(0.5) == "0.5s"
        assert format_duration(15.0) == "15.0s"
        assert format_duration(59.9) == "59.9s"

    def test_format_minutes_and_seconds(self):
        """Test formatting durations between 1 minute and 1 hour."""
        assert format_duration(60.0) == "1m 0.0s"
        assert format_duration(65.3) == "1m 5.3s"
        assert format_duration(125.8) == "2m 5.8s"
        assert format_duration(3599.0) == "59m 59.0s"

    def test_format_hours_minutes_seconds(self):
        """Test formatting durations 1 hour or more."""
        assert format_duration(3600.0) == "1h 0m 0.0s"
        assert format_duration(3665.3) == "1h 1m 5.3s"
        assert format_duration(7325.4) == "2h 2m 5.4s"

    def test_format_edge_cases(self):
        """Test edge cases."""
        assert format_duration(0.0) == "0.0s"
        assert format_duration(0.01) == "0.0s"  # Rounding


class TestTimer:
    """Tests for Timer class."""

    def test_timer_context_manager(self):
        """Test Timer as a context manager."""
        timer = Timer("Test Operation")

        with timer:
            time.sleep(0.01)  # Sleep for 10ms

        assert timer.elapsed is not None
        assert timer.elapsed >= 0.01
        assert timer.elapsed < 0.1  # Should be much less than 100ms

    def test_get_elapsed(self):
        """Test get_elapsed method."""
        timer = Timer()

        with timer:
            time.sleep(0.01)

        elapsed = timer.get_elapsed()
        assert elapsed >= 0.01
        assert elapsed < 0.1

    def test_get_elapsed_before_completion_raises(self):
        """Test that get_elapsed raises before timer completes."""
        timer = Timer()

        with pytest.raises(RuntimeError, match="Timer hasn't completed yet"):
            timer.get_elapsed()

    def test_get_formatted_elapsed(self):
        """Test get_formatted_elapsed method."""
        timer = Timer()

        with timer:
            time.sleep(0.01)

        formatted = timer.get_formatted_elapsed()
        assert "s" in formatted
        assert formatted.endswith("s")

    def test_get_formatted_elapsed_before_completion_raises(self):
        """Test that get_formatted_elapsed raises before timer completes."""
        timer = Timer()

        with pytest.raises(RuntimeError):
            timer.get_formatted_elapsed()

    def test_timer_name(self):
        """Test timer stores the provided name."""
        timer = Timer("Custom Operation")
        assert timer.name == "Custom Operation"

    def test_timer_default_name(self):
        """Test timer has a default name."""
        timer = Timer()
        assert timer.name == "Operation"


class TestTimeOperation:
    """Tests for time_operation context manager."""

    def test_time_operation_context_manager(self):
        """Test time_operation as a context manager."""
        with time_operation("Test") as timer:
            time.sleep(0.01)

        assert timer.elapsed is not None
        assert timer.elapsed >= 0.01
        assert timer.elapsed < 0.1

    def test_time_operation_yields_timer(self):
        """Test that time_operation yields a Timer instance."""
        with time_operation() as timer:
            assert isinstance(timer, Timer)
            time.sleep(0.01)

        # Timer should be completed after context exits
        elapsed = timer.get_elapsed()
        assert elapsed >= 0.01

    def test_time_operation_custom_name(self):
        """Test time_operation with custom name."""
        with time_operation("Custom") as timer:
            assert timer.name == "Custom"
            time.sleep(0.01)

        assert timer.elapsed >= 0.01

