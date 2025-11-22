"""Unit tests for logger module."""

import logging
from pathlib import Path
from tempfile import TemporaryDirectory

from lib.utils.logger import get_logger, reset_logger, setup_logger


class TestSetupLogger:
    """Tests for setup_logger function."""

    def teardown_method(self):
        """Clean up logger after each test."""
        reset_logger()

    def test_basic_setup(self):
        """Test basic logger setup without file logging."""
        logger = setup_logger(enable_file_logging=False)
        assert logger is not None
        assert logger.name == "analytics"
        assert logger.level == logging.INFO

    def test_logger_is_singleton(self):
        """Test that setup_logger returns the same instance."""
        logger1 = setup_logger(enable_file_logging=False)
        logger2 = setup_logger(enable_file_logging=False)
        assert logger1 is logger2

    def test_file_logging_with_specific_path(self):
        """Test logger with specific log file path."""
        with TemporaryDirectory() as tmpdir:
            log_file = Path(tmpdir) / "test.log"
            logger = setup_logger(log_file=log_file)

            # Write a test message
            logger.info("Test message")

            # Verify file was created and contains message
            assert log_file.exists()
            content = log_file.read_text()
            assert "Test message" in content
            assert "INFO" in content

    def test_daily_log_rotation(self):
        """Test daily log rotation creates properly named files."""
        with TemporaryDirectory() as tmpdir:
            logs_dir = Path(tmpdir)
            logger = setup_logger(enable_file_logging=True, logs_dir=logs_dir)

            # Write a test message
            logger.warning("Test warning")

            # Find the log file (should be named YYYY-MM-DD.log)
            log_files = list(logs_dir.glob("*.log"))
            assert len(log_files) == 1

            log_file = log_files[0]
            # Verify filename format (YYYY-MM-DD.log)
            assert len(log_file.stem) == 10  # YYYY-MM-DD
            assert log_file.suffix == ".log"

            # Verify content
            content = log_file.read_text()
            assert "Test warning" in content
            assert "WARNING" in content

    def test_log_levels(self):
        """Test that different log levels are written correctly."""
        with TemporaryDirectory() as tmpdir:
            log_file = Path(tmpdir) / "test.log"
            logger = setup_logger(level=logging.DEBUG, log_file=log_file)

            logger.debug("Debug message")
            logger.info("Info message")
            logger.warning("Warning message")
            logger.error("Error message")

            content = log_file.read_text()
            assert "Debug message" in content
            assert "Info message" in content
            assert "Warning message" in content
            assert "Error message" in content
            assert "DEBUG" in content
            assert "INFO" in content
            assert "WARNING" in content
            assert "ERROR" in content

    def test_log_format(self):
        """Test that log entries have correct format."""
        with TemporaryDirectory() as tmpdir:
            log_file = Path(tmpdir) / "test.log"
            logger = setup_logger(log_file=log_file)

            logger.info("Formatted message")

            content = log_file.read_text()
            # Check format: YYYY-MM-DD HH:MM:SS - analytics - LEVEL - message
            assert " - analytics - INFO - Formatted message" in content


class TestGetLogger:
    """Tests for get_logger function."""

    def teardown_method(self):
        """Clean up logger after each test."""
        reset_logger()

    def test_get_logger_creates_default(self):
        """Test that get_logger creates a default logger if none exists."""
        logger = get_logger()
        assert logger is not None
        assert logger.name == "analytics"

    def test_get_logger_returns_existing(self):
        """Test that get_logger returns existing logger."""
        logger1 = setup_logger(enable_file_logging=False)
        logger2 = get_logger()
        assert logger1 is logger2


class TestResetLogger:
    """Tests for reset_logger function."""

    def test_reset_logger_clears_instance(self):
        """Test that reset_logger clears the global instance and handlers."""
        logger1 = setup_logger(enable_file_logging=False)
        assert logger1 is not None
        handler_count_before = len(logger1.handlers)

        reset_logger()

        logger2 = setup_logger(enable_file_logging=False)
        assert logger2 is not None
        # Handlers should be reset (old handlers removed, new ones added)
        # After reset, we should have fresh handlers
        assert len(logger2.handlers) == handler_count_before

    def test_reset_logger_removes_handlers(self):
        """Test that reset_logger removes all handlers."""
        with TemporaryDirectory() as tmpdir:
            log_file = Path(tmpdir) / "test.log"
            logger = setup_logger(log_file=log_file)

            # Should have at least console handler
            initial_handler_count = len(logger.handlers)
            assert initial_handler_count > 0

            # Reset should remove handlers
            reset_logger()

            # Get the logger instance directly (not through our wrapper)
            import logging
            raw_logger = logging.getLogger("analytics")
            # After reset, handlers should be cleared
            assert len(raw_logger.handlers) == 0

    def test_reset_logger_safe_when_none(self):
        """Test that reset_logger is safe to call when no logger exists."""
        reset_logger()  # Should not raise any errors

        # Can still create logger after
        logger = setup_logger(enable_file_logging=False)
        assert logger is not None

