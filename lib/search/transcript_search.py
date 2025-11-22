"""Transcript Search module - Search recordings by transcript content

Provides exact match search functionality for finding words and phrases
across all recordings with detailed context and statistics.
"""

import json
import logging
import re
from pathlib import Path

from lib.processing.recording_processor import filter_by_date, parse_datetime

logger = logging.getLogger("analytics")


def search_transcripts(
    recordings_dir: Path,
    search_term: str,
    case_sensitive: bool = False,
    date_filter: str | None = None,
    month_filter: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, list[dict]]:
    """Search transcripts for a specific term or phrase

    Args:
        recordings_dir: Path to recordings directory
        search_term: Term or phrase to search for
        case_sensitive: Whether search should be case-sensitive
        date_filter: Optional single date filter (YYYY-MM-DD)
        month_filter: Optional month filter (YYYY-MM)
        date_from: Optional start of date range (YYYY-MM-DD)
        date_to: Optional end of date range (YYYY-MM-DD)

    Returns:
        Dictionary with search results containing:
        - total_matches: Total number of occurrences
        - recordings_with_matches: Number of recordings containing the term
        - matches: List of match dictionaries with recording details
    """
    all_folders = sorted([d for d in recordings_dir.iterdir() if d.is_dir()])

    # Apply date filtering
    if date_filter or month_filter or date_from or date_to:
        recordings_folders = [
            d
            for d in all_folders
            if filter_by_date(d.name, date_filter, month_filter, date_from, date_to)
        ]
    else:
        recordings_folders = all_folders

    matches = []
    total_occurrences = 0

    for folder in recordings_folders:
        meta_file = folder / "meta.json"

        if not meta_file.exists():
            continue

        try:
            with open(meta_file, encoding="utf-8") as f:
                meta = json.load(f)
        except json.JSONDecodeError:
            logger.warning(f"Skipping corrupt meta.json in {folder.name}")
            continue
        except Exception as e:
            logger.error(f"Error reading {folder.name}/meta.json: {e}")
            continue

        # Extract transcript
        transcript = meta.get("result", "") or meta.get("rawResult", "")
        if not transcript:
            continue

        # Perform search
        search_pattern = search_term if case_sensitive else search_term.lower()
        search_text = transcript if case_sensitive else transcript.lower()

        # Count occurrences
        occurrence_count = search_text.count(search_pattern)

        if occurrence_count > 0:
            # Extract datetime info
            datetime_str = meta.get("datetime", "")
            dt = parse_datetime(datetime_str, folder.name)

            # Find all match positions and extract context
            excerpts = []
            pattern_re = re.escape(search_pattern)
            if not case_sensitive:
                pattern_re = f"(?i){pattern_re}"

            for match in re.finditer(pattern_re, transcript):
                start_pos = max(0, match.start() - 50)
                end_pos = min(len(transcript), match.end() + 50)

                # Extract context with ellipsis
                excerpt = transcript[start_pos:end_pos]
                if start_pos > 0:
                    excerpt = "..." + excerpt
                if end_pos < len(transcript):
                    excerpt = excerpt + "..."

                excerpts.append(excerpt)

            # Only include first 3 excerpts to keep output manageable
            if len(excerpts) > 3:
                excerpts = excerpts[:3] + [f"... and {len(excerpts) - 3} more matches"]

            matches.append(
                {
                    "recording_id": folder.name,
                    "date": dt.date().isoformat(),
                    "datetime": dt.isoformat(),
                    "mode": meta.get("modeName", "Unknown"),
                    "duration_seconds": meta.get("duration", 0) / 1000.0,
                    "word_count": len(transcript.split()),
                    "occurrence_count": occurrence_count,
                    "excerpts": excerpts,
                }
            )

            total_occurrences += occurrence_count

    return {
        "search_term": search_term,
        "case_sensitive": case_sensitive,
        "total_matches": total_occurrences,
        "recordings_with_matches": len(matches),
        "matches": sorted(matches, key=lambda x: x["occurrence_count"], reverse=True),
    }

