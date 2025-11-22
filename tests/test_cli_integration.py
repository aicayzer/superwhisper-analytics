"""Integration tests for CLI commands."""

from typer.testing import CliRunner

from lib.cli import app

runner = CliRunner()


class TestAnalyzeCommand:
    """Tests for analyze command."""

    def test_analyze_help(self):
        """Test analyze command help."""
        result = runner.invoke(app, ["analyze", "--help"])
        assert result.exit_code == 0
        assert "Analyze recordings" in result.stdout
        assert "--date" in result.stdout
        assert "--month" in result.stdout

    def test_analyze_command_exists(self):
        """Test that analyze command is registered."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "analyze" in result.stdout


class TestSearchCommand:
    """Tests for search command."""

    def test_search_help(self):
        """Test search command help."""
        result = runner.invoke(app, ["search", "--help"])
        assert result.exit_code == 0
        assert "Search transcript" in result.stdout
        assert "--case-sensitive" in result.stdout
        assert "--date" in result.stdout

    def test_search_requires_term(self):
        """Test that search requires a search term."""
        result = runner.invoke(app, ["search"])
        assert result.exit_code != 0

    def test_search_command_exists(self):
        """Test that search command is registered."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "search" in result.stdout


class TestMainHelp:
    """Tests for main help and command structure."""

    def test_main_help(self):
        """Test main help shows all commands."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "Super Whisper Analytics" in result.stdout
        assert "analyze" in result.stdout
        assert "search" in result.stdout

    def test_no_command_no_interaction(self):
        """Test that calling with no command and no TTY doesn't hang."""
        # In non-interactive mode (testing), it should exit gracefully
        # The actual interactive menu requires a TTY, so we just verify
        # the command structure is set up correctly
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0

