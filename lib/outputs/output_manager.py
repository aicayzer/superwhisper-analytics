"""Output Manager module - Controls which outputs to generate

Provides clean interface for selecting and controlling output generation,
allowing users to choose exactly what they need.
"""

from dataclasses import dataclass


@dataclass
class OutputSelection:
    """Tracks which outputs should be generated"""

    csv: bool = True
    json: bool = True
    xlsx: bool = False
    duckdb: bool = False
    mermaid: bool = False
    insights: bool = True

    def should_generate(self, output_type: str) -> bool:
        """Check if a specific output type should be generated

        Args:
            output_type: One of 'csv', 'json', 'xlsx', 'duckdb', 'mermaid', 'insights'

        Returns:
            True if this output should be generated
        """
        return getattr(self, output_type.lower(), False)

    def get_enabled_outputs(self) -> list[str]:
        """Get list of enabled output types

        Returns:
            List of output type names that are enabled
        """
        outputs = []
        for output_type in ['csv', 'json', 'xlsx', 'duckdb', 'mermaid', 'insights']:
            if getattr(self, output_type):
                outputs.append(output_type)
        return outputs

    def count_enabled(self) -> int:
        """Count how many outputs are enabled

        Returns:
            Number of enabled outputs
        """
        return len(self.get_enabled_outputs())


def parse_output_selection(outputs_str: str | None, skip_charts: bool = False) -> OutputSelection:
    """Parse output selection from command-line argument

    Args:
        outputs_str: Comma-separated list of outputs or 'all'
        skip_charts: If True, disable mermaid charts

    Returns:
        OutputSelection with appropriate flags set

    Examples:
        >>> parse_output_selection('csv,json', False)
        OutputSelection(csv=True, json=True, xlsx=False, mermaid=False, insights=False)

        >>> parse_output_selection('all', True)
        OutputSelection(csv=True, json=True, xlsx=True, mermaid=False, insights=True)
    """
    # If no specific outputs requested, use defaults
    if outputs_str is None:
        selection = get_default_selection()
        if skip_charts:
            selection.mermaid = False
        return selection

    # Handle 'all' special case
    if outputs_str.lower() == 'all':
        selection = OutputSelection(
            csv=True,
            json=True,
            xlsx=True,
            duckdb=True,
            mermaid=not skip_charts,
            insights=True
        )
        return selection

    # Parse comma-separated list
    requested = [o.strip().lower() for o in outputs_str.split(',')]

    # Validate all requested outputs
    valid_outputs = {'csv', 'json', 'xlsx', 'duckdb', 'mermaid', 'insights'}
    invalid = [o for o in requested if o not in valid_outputs]
    if invalid:
        msg = f"Invalid output types: {', '.join(invalid)}. Valid options: {', '.join(valid_outputs)}"
        raise ValueError(msg)

    # Build selection
    selection = OutputSelection(
        csv='csv' in requested,
        json='json' in requested,
        xlsx='xlsx' in requested,
        duckdb='duckdb' in requested,
        mermaid='mermaid' in requested and not skip_charts,
        insights='insights' in requested
    )

    return selection


def get_default_selection() -> OutputSelection:
    """Get default output selection

    Returns fast, essential outputs by default:
    - Excel: Comprehensive data in single file
    - Insights: Human-readable summary

    Returns:
        OutputSelection with defaults
    """
    return OutputSelection(
        csv=False,
        json=False,
        xlsx=True,  # Single file with everything
        duckdb=False,
        mermaid=False,  # Slower, not always needed
        insights=True
    )


def get_quick_selection() -> OutputSelection:
    """Get quick analysis selection (Excel + insights only)

    Returns:
        OutputSelection for fastest useful analysis
    """
    return OutputSelection(
        csv=False,
        json=False,
        xlsx=True,  # Excel easier to work with than CSVs
        duckdb=False,
        mermaid=False,
        insights=True
    )


def get_full_selection() -> OutputSelection:
    """Get full analysis selection (everything)

    Returns:
        OutputSelection with all outputs enabled
    """
    return OutputSelection(
        csv=True,
        json=True,
        xlsx=True,
        duckdb=True,
        mermaid=True,
        insights=True
    )

