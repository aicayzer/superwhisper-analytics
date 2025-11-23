"""Transcript Search module - Search recordings by transcript content

Provides exact and fuzzy match search functionality for finding words and phrases
across all recordings with detailed context and statistics.
"""

import json
import logging
import re
from pathlib import Path

from rapidfuzz import fuzz

from lib.processing.recording_processor import filter_by_date, parse_datetime

logger = logging.getLogger("analytics")


def search_transcripts(
    recordings_dir: Path,
    search_term: str,
    case_sensitive: bool = False,
    search_mode: str = "exact",
    similarity_threshold: int = 80,
    date_filter: str | None = None,
    month_filter: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, list[dict]]:
    """Search transcripts for a specific term or phrase

    Args:
        recordings_dir: Path to recordings directory
        search_term: Term or phrase to search for
        case_sensitive: Whether search should be case-sensitive (exact mode only)
        search_mode: 'exact' for exact matching, 'fuzzy' for fuzzy matching
        similarity_threshold: Minimum similarity score for fuzzy matches (0-100)
        date_filter: Optional single date filter (YYYY-MM-DD)
        month_filter: Optional month filter (YYYY-MM)
        date_from: Optional start of date range (YYYY-MM-DD)
        date_to: Optional end of date range (YYYY-MM-DD)

    Returns:
        Dictionary with search results containing:
        - search_mode: The mode used ('exact' or 'fuzzy')
        - total_matches: Total number of occurrences
        - recordings_with_matches: Number of recordings containing the term
        - matches: List of match dictionaries with recording details
            (includes similarity_score if fuzzy mode)
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

        # Perform search based on mode
        if search_mode == "fuzzy":
            # Fuzzy search: check overall transcript similarity
            similarity_score = fuzz.partial_ratio(search_term.lower(), transcript.lower())

            if similarity_score < similarity_threshold:
                continue

            # For fuzzy, we count it as 1 match per recording
            occurrence_count = 1
        else:
            # Exact search
            search_pattern = search_term if case_sensitive else search_term.lower()
            search_text = transcript if case_sensitive else transcript.lower()

            # Count occurrences
            occurrence_count = search_text.count(search_pattern)

            if occurrence_count == 0:
                continue

            similarity_score = 100  # Exact match

        if occurrence_count > 0:
            # Extract datetime info
            datetime_str = meta.get("datetime", "")
            dt = parse_datetime(datetime_str, folder.name)

            # Find all match positions and extract context
            excerpts = []

            if search_mode == "fuzzy":
                # For fuzzy, show the best matching section
                words = transcript.split()
                best_score = 0
                best_excerpt = ""

                # Check each window of words for best match
                window_size = min(len(search_term.split()) + 5, len(words))
                for i in range(len(words) - window_size + 1):
                    window_text = " ".join(words[i:i + window_size])
                    score = fuzz.ratio(search_term.lower(), window_text.lower())
                    if score > best_score:
                        best_score = score
                        best_excerpt = window_text

                # Use ternary operator for simplicity
                excerpts = [f"...{best_excerpt}..."] if best_excerpt else [transcript[:150] + "..."]
            else:
                # Exact search: find all matches
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

            match_data = {
                "recording_id": folder.name,
                "date": dt.date().isoformat(),
                "datetime": dt.isoformat(),
                "mode": meta.get("modeName", "Unknown"),
                "duration_seconds": meta.get("duration", 0) / 1000.0,
                "word_count": len(transcript.split()),
                "occurrence_count": occurrence_count,
                "excerpts": excerpts,
            }

            if search_mode == "fuzzy":
                match_data["similarity_score"] = similarity_score

            matches.append(match_data)

            total_occurrences += occurrence_count

    # Sort matches: by similarity score (if fuzzy) then by occurrence count
    if search_mode == "fuzzy":
        sorted_matches = sorted(
            matches, key=lambda x: (x.get("similarity_score", 0), x["occurrence_count"]), reverse=True
        )
    else:
        sorted_matches = sorted(matches, key=lambda x: x["occurrence_count"], reverse=True)

    return {
        "search_term": search_term,
        "search_mode": search_mode,
        "case_sensitive": case_sensitive,
        "similarity_threshold": similarity_threshold if search_mode == "fuzzy" else None,
        "total_matches": total_occurrences,
        "recordings_with_matches": len(matches),
        "matches": sorted_matches,
    }

