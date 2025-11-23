"""Search Export module - Export search results to various formats

Provides export functionality for search results to CSV and JSON formats.
"""

import csv
import json
from pathlib import Path


def export_search_results(results: dict, filepath: Path, format: str | None = None) -> None:
    """Export search results to file

    Args:
        results: Search results dictionary from search_transcripts()
        filepath: Path to output file
        format: Export format ('csv' or 'json'). Auto-detected from filepath if None.

    Raises:
        ValueError: If format is invalid or cannot be determined
    """
    # Auto-detect format from extension if not specified
    if format is None:
        suffix = filepath.suffix.lower()
        if suffix == ".csv":
            format = "csv"
        elif suffix == ".json":
            format = "json"
        else:
            msg = f"Cannot determine format from extension: {suffix}. Use .csv or .json"
            raise ValueError(msg)

    format = format.lower()

    if format == "csv":
        _export_to_csv(results, filepath)
    elif format == "json":
        _export_to_json(results, filepath)
    else:
        msg = f"Unsupported export format: {format}. Use 'csv' or 'json'"
        raise ValueError(msg)


def _export_to_csv(results: dict, filepath: Path) -> None:
    """Export search results to CSV format

    Args:
        results: Search results dictionary
        filepath: Path to CSV output file
    """
    # Prepare CSV rows
    rows = []

    for match in results.get("matches", []):
        # Flatten the match data
        row = {
            "date": match["date"],
            "recording_id": match["recording_id"],
            "mode": match["mode"],
            "word_count": match["word_count"],
            "duration_seconds": match["duration_seconds"],
            "occurrence_count": match["occurrence_count"],
        }

        # Add similarity score if present (fuzzy search)
        if "similarity_score" in match:
            row["similarity_score"] = match["similarity_score"]

        # Add first excerpt
        if match.get("excerpts"):
            row["excerpt"] = match["excerpts"][0]
        else:
            row["excerpt"] = ""

        rows.append(row)

    # Determine fieldnames (include similarity_score if present)
    if rows and "similarity_score" in rows[0]:
        fieldnames = [
            "date",
            "recording_id",
            "mode",
            "similarity_score",
            "occurrence_count",
            "word_count",
            "duration_seconds",
            "excerpt",
        ]
    else:
        fieldnames = [
            "date",
            "recording_id",
            "mode",
            "occurrence_count",
            "word_count",
            "duration_seconds",
            "excerpt",
        ]

    # Write CSV
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _export_to_json(results: dict, filepath: Path) -> None:
    """Export search results to JSON format

    Args:
        results: Search results dictionary
        filepath: Path to JSON output file
    """
    # Create a clean export structure
    export_data = {
        "search_metadata": {
            "search_term": results.get("search_term"),
            "search_mode": results.get("search_mode"),
            "case_sensitive": results.get("case_sensitive"),
            "similarity_threshold": results.get("similarity_threshold"),
            "total_matches": results.get("total_matches"),
            "recordings_with_matches": results.get("recordings_with_matches"),
        },
        "matches": results.get("matches", []),
    }

    # Write JSON with pretty formatting
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)

