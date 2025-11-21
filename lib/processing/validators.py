"""Validators module - Input validation

Centralized validation for dates, paths, and recording metadata.
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from lib.core.models import FilterCriteria
from lib.utils.logger import get_logger

logger = get_logger()


def validate_date_format(date_str: Optional[str], format_type: str) -> None:
    """Validate date string format

    Args:
        date_str: Date string to validate
        format_type: Either 'date' (YYYY-MM-DD) or 'month' (YYYY-MM)

    Raises:
        SystemExit: If date format is invalid
    """
    if not date_str:
        return

    try:
        if format_type == 'date':
            datetime.strptime(date_str, '%Y-%m-%d')
        elif format_type == 'month':
            datetime.strptime(date_str, '%Y-%m')
    except ValueError:
        print(f"Error: Invalid {format_type} format: {date_str}")
        print(f"Expected format: {'YYYY-MM-DD' if format_type == 'date' else 'YYYY-MM'}")
        sys.exit(1)


def validate_recordings_dir(recordings_dir: Path) -> None:
    """Validate recordings directory exists and is accessible

    Args:
        recordings_dir: Path to recordings directory

    Raises:
        SystemExit: If directory doesn't exist or is not a directory
    """
    if not recordings_dir.exists():
        print(f"Error: Recordings directory does not exist: {recordings_dir}")
        sys.exit(1)

    if not recordings_dir.is_dir():
        print(f"Error: Recordings path is not a directory: {recordings_dir}")
        sys.exit(1)


def validate_meta_json(meta_file: Path) -> Optional[dict]:
    """Validate and load meta.json file

    Args:
        meta_file: Path to meta.json file

    Returns:
        Loaded metadata dict if valid, None if invalid
    """
    if not meta_file.exists():
        return None

    try:
        with open(meta_file, encoding='utf-8') as f:
            meta = json.load(f)
        return meta
    except json.JSONDecodeError as e:
        logger.warning(f"Invalid JSON in {meta_file}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Error reading {meta_file}: {e}")
        return None


def validate_filter_criteria(criteria: FilterCriteria) -> None:
    """Validate filter criteria

    Checks date formats and ensures date ranges are logical.

    Args:
        criteria: Filter criteria to validate

    Raises:
        SystemExit: If criteria is invalid
    """
    # Validate date formats
    if 'date' in criteria:
        validate_date_format(criteria.get('date'), 'date')

    if 'month' in criteria:
        validate_date_format(criteria.get('month'), 'month')

    if 'date_from' in criteria:
        validate_date_format(criteria.get('date_from'), 'date')

    if 'date_to' in criteria:
        validate_date_format(criteria.get('date_to'), 'date')

    # Validate date range logic
    if criteria.get('date_from') and criteria.get('date_to'):
        date_from = datetime.strptime(criteria['date_from'], '%Y-%m-%d')
        date_to = datetime.strptime(criteria['date_to'], '%Y-%m-%d')

        if date_from > date_to:
            print(f"Error: date_from ({criteria['date_from']}) is after date_to ({criteria['date_to']})")
            sys.exit(1)

