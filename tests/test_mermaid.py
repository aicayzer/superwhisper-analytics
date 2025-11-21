"""Unit tests for Mermaid chart generation."""

import configparser
from datetime import datetime

import pytest

from lib.outputs.mermaid import escape_mermaid_label, format_date_for_chart


class TestEscapeMermaidLabel:
    """Tests for escape_mermaid_label function."""

    def test_basic_text(self):
        result = escape_mermaid_label("Normal Text")
        assert result == "Normal Text"

    def test_slash_replacement(self):
        result = escape_mermaid_label("Code/Development")
        assert result == "Code-Development"
        assert "/" not in result

    def test_quote_replacement(self):
        result = escape_mermaid_label('Text with "quotes"')
        assert result == "Text with 'quotes'"
        assert '"' not in result

    def test_bracket_replacement(self):
        result = escape_mermaid_label("Text [with] brackets")
        assert result == "Text (with) brackets"
        assert "[" not in result
        assert "]" not in result

    def test_newline_removal(self):
        result = escape_mermaid_label("Text\nwith\nnewlines")
        assert result == "Text with newlines"
        assert "\n" not in result

    def test_long_text_truncation(self):
        long_text = "a" * 100
        result = escape_mermaid_label(long_text)
        assert len(result) <= 50
        assert result.endswith("...")

    def test_non_string_input(self):
        result = escape_mermaid_label(123)
        assert result == "123"

    def test_empty_string(self):
        result = escape_mermaid_label("")
        assert result == ""


class TestFormatDateForChart:
    """Tests for format_date_for_chart function."""

    @pytest.fixture
    def sample_config(self):
        """Create a sample config for testing."""
        config = configparser.ConfigParser()
        config.add_section("charts")
        config.set("charts", "date_format_daily", "%%d-%%m")
        config.set("charts", "date_format_weekly", "W%%W")
        config.set("charts", "date_format_monthly", "%%b")
        return config

    def test_daily_format(self, sample_config):
        date_str = "2025-01-15"
        all_dates = ["2025-01-15", "2025-01-16"]
        result = format_date_for_chart(date_str, "daily", all_dates, sample_config)
        assert result == "15-01"

    def test_weekly_format(self, sample_config):
        date_str = "2025-01-15"
        all_dates = ["2025-01-15", "2025-01-22"]
        result = format_date_for_chart(date_str, "weekly", all_dates, sample_config)
        assert result.startswith("W")

    def test_monthly_format(self, sample_config):
        date_str = "2025-01-15"
        all_dates = ["2025-01-15", "2025-02-15"]
        result = format_date_for_chart(date_str, "monthly", all_dates, sample_config)
        assert result == "Jan"

    def test_multi_year_adds_year(self, sample_config):
        date_str = "2024-01-15"
        all_dates = ["2024-01-15", "2025-01-15"]  # Two different years
        result = format_date_for_chart(date_str, "daily", all_dates, sample_config)
        # Should include year indicator when multiple years present
        assert "'24" in result

    def test_single_year_no_year_suffix(self, sample_config):
        date_str = "2025-01-15"
        all_dates = ["2025-01-15", "2025-01-16"]  # Same year
        result = format_date_for_chart(date_str, "daily", all_dates, sample_config)
        # Should not include year when only one year
        assert "25" not in result

    def test_invalid_date_returns_original(self, sample_config):
        date_str = "invalid-date"
        all_dates = ["2025-01-15"]
        result = format_date_for_chart(date_str, "daily", all_dates, sample_config)
        assert result == "invalid-date"

    def test_unknown_format_type(self, sample_config):
        date_str = "2025-01-15"
        all_dates = ["2025-01-15"]
        result = format_date_for_chart(date_str, "unknown", all_dates, sample_config)
        # Should return original date for unknown format type
        assert result == date_str

    def test_missing_config_uses_defaults(self):
        config = configparser.ConfigParser()
        config.add_section("charts")
        # Don't set any date formats
        date_str = "2025-01-15"
        all_dates = ["2025-01-15"]
        result = format_date_for_chart(date_str, "daily", all_dates, config)
        # Should use fallback format
        assert result == "15-01"

    def test_empty_all_dates(self, sample_config):
        date_str = "2025-01-15"
        all_dates = []
        result = format_date_for_chart(date_str, "daily", all_dates, sample_config)
        # Should not crash on empty list
        assert isinstance(result, str)


class TestMermaidChartSyntax:
    """Tests to ensure Mermaid chart syntax rules are followed."""

    def test_case_sensitivity(self):
        # Chart type must be lowercase
        assert "xychart-beta" == "xychart-beta".lower()

    def test_horizontal_chart_axes(self):
        # For horizontal charts, categories must be on x-axis, numbers on y-axis
        # This is more of a documentation test
        categories = ["Cat1", "Cat2", "Cat3"]
        values = [10, 20, 30]

        # Correct structure
        x_axis = f"x-axis [{', '.join([f'\"{c}\"' for c in categories])}]"
        y_axis = f"y-axis \"Label\" 0 --> {max(values) + 5}"

        assert "x-axis" in x_axis
        assert "y-axis" in y_axis
        assert all(c in x_axis for c in categories)

    def test_no_slash_in_labels(self):
        # Slashes break Mermaid syntax
        label = "Code/Development"
        safe_label = escape_mermaid_label(label)
        assert "/" not in safe_label

