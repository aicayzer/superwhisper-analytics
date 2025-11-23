"""Unit tests for output manager module."""

import pytest

from lib.outputs.output_manager import (
    OutputSelection,
    get_default_selection,
    get_full_selection,
    get_quick_selection,
    parse_output_selection,
)


class TestOutputSelection:
    """Tests for OutputSelection dataclass."""

    def test_should_generate_csv(self):
        """Test should_generate for CSV."""
        selection = OutputSelection(csv=True, json=False, xlsx=False, mermaid=False, insights=False)
        assert selection.should_generate('csv') is True
        assert selection.should_generate('json') is False

    def test_should_generate_case_insensitive(self):
        """Test should_generate is case-insensitive."""
        selection = OutputSelection(csv=True, json=False, xlsx=False, mermaid=False, insights=False)
        assert selection.should_generate('CSV') is True
        assert selection.should_generate('CsV') is True

    def test_should_generate_invalid_type(self):
        """Test should_generate with invalid type returns False."""
        selection = OutputSelection()
        assert selection.should_generate('invalid') is False

    def test_get_enabled_outputs(self):
        """Test get_enabled_outputs returns correct list."""
        selection = OutputSelection(csv=True, json=True, xlsx=False, mermaid=False, insights=True)
        enabled = selection.get_enabled_outputs()
        assert enabled == ['csv', 'json', 'insights']

    def test_get_enabled_outputs_none(self):
        """Test get_enabled_outputs with all disabled."""
        selection = OutputSelection(csv=False, json=False, xlsx=False, mermaid=False, insights=False)
        enabled = selection.get_enabled_outputs()
        assert enabled == []

    def test_get_enabled_outputs_all(self):
        """Test get_enabled_outputs with all enabled."""
        selection = OutputSelection(csv=True, json=True, xlsx=True, mermaid=True, insights=True)
        enabled = selection.get_enabled_outputs()
        assert enabled == ['csv', 'json', 'xlsx', 'mermaid', 'insights']

    def test_count_enabled(self):
        """Test count_enabled returns correct count."""
        selection = OutputSelection(csv=True, json=True, xlsx=False, mermaid=False, insights=True)
        assert selection.count_enabled() == 3

    def test_count_enabled_none(self):
        """Test count_enabled with none enabled."""
        selection = OutputSelection(csv=False, json=False, xlsx=False, mermaid=False, insights=False)
        assert selection.count_enabled() == 0


class TestParseOutputSelection:
    """Tests for parse_output_selection function."""

    def test_parse_none_uses_defaults(self):
        """Test that None input uses default selection."""
        selection = parse_output_selection(None, False)
        assert selection.csv is True
        assert selection.json is True
        assert selection.xlsx is False
        assert selection.mermaid is False
        assert selection.insights is True

    def test_parse_none_with_skip_charts(self):
        """Test None input with skip_charts flag."""
        selection = parse_output_selection(None, True)
        assert selection.mermaid is False

    def test_parse_all(self):
        """Test parsing 'all' keyword."""
        selection = parse_output_selection('all', False)
        assert selection.csv is True
        assert selection.json is True
        assert selection.xlsx is True
        assert selection.mermaid is True
        assert selection.insights is True

    def test_parse_all_with_skip_charts(self):
        """Test 'all' with skip_charts overrides mermaid."""
        selection = parse_output_selection('all', True)
        assert selection.csv is True
        assert selection.json is True
        assert selection.xlsx is True
        assert selection.mermaid is False
        assert selection.insights is True

    def test_parse_single_output(self):
        """Test parsing single output type."""
        selection = parse_output_selection('csv', False)
        assert selection.csv is True
        assert selection.json is False
        assert selection.xlsx is False
        assert selection.mermaid is False
        assert selection.insights is False

    def test_parse_multiple_outputs(self):
        """Test parsing comma-separated list."""
        selection = parse_output_selection('csv,json,xlsx', False)
        assert selection.csv is True
        assert selection.json is True
        assert selection.xlsx is True
        assert selection.mermaid is False
        assert selection.insights is False

    def test_parse_with_spaces(self):
        """Test parsing handles spaces around commas."""
        selection = parse_output_selection('csv, json, insights', False)
        assert selection.csv is True
        assert selection.json is True
        assert selection.insights is True

    def test_parse_case_insensitive(self):
        """Test parsing is case-insensitive."""
        selection = parse_output_selection('CSV,JSON,XLSX', False)
        assert selection.csv is True
        assert selection.json is True
        assert selection.xlsx is True

    def test_parse_invalid_output_raises_error(self):
        """Test invalid output type raises ValueError."""
        with pytest.raises(ValueError, match="Invalid output types: invalid"):
            parse_output_selection('csv,invalid,json', False)

    def test_parse_multiple_invalid_outputs(self):
        """Test multiple invalid outputs listed in error."""
        with pytest.raises(ValueError, match="invalid1, invalid2"):
            parse_output_selection('csv,invalid1,invalid2', False)

    def test_parse_mermaid_with_skip_charts(self):
        """Test explicit mermaid is overridden by skip_charts."""
        selection = parse_output_selection('csv,mermaid', True)
        assert selection.csv is True
        assert selection.mermaid is False


class TestPresetSelections:
    """Tests for preset selection functions."""

    def test_get_default_selection(self):
        """Test default selection includes fast essentials."""
        selection = get_default_selection()
        assert selection.csv is True
        assert selection.json is True
        assert selection.xlsx is False
        assert selection.mermaid is False
        assert selection.insights is True

    def test_get_quick_selection(self):
        """Test quick selection is minimal."""
        selection = get_quick_selection()
        assert selection.csv is True
        assert selection.json is False
        assert selection.xlsx is False
        assert selection.mermaid is False
        assert selection.insights is True

    def test_get_full_selection(self):
        """Test full selection enables everything."""
        selection = get_full_selection()
        assert selection.csv is True
        assert selection.json is True
        assert selection.xlsx is True
        assert selection.mermaid is True
        assert selection.insights is True

