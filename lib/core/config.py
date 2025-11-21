"""Configuration module - Configuration loading and path resolution

Handles loading config.ini and config.local.ini with priority fallback.
Resolves relative and absolute paths.
"""

import configparser
import sys
from pathlib import Path
from typing import Optional


def load_config(script_dir: Optional[Path] = None) -> configparser.ConfigParser:
    """Load configuration from config files with fallback

    Priority:
    1. config.local.ini (if exists, not tracked in git)
    2. config.ini (default template)
    3. Built-in defaults

    Args:
        script_dir: Directory containing config files. If None, uses current file's parent.

    Returns:
        ConfigParser object with loaded configuration
    """
    if script_dir is None:
        # When called from library, use the analysis directory
        script_dir = Path(__file__).parent.parent.parent

    config = configparser.ConfigParser()

    # Set defaults
    config['paths'] = {
        'recordings_dir': '../recordings',
        'output_dir': './outputs'
    }
    config['analysis'] = {
        'default_top_words': '500',
        'default_top_bigrams': '100',
        'default_top_trigrams': '50'
    }

    # Try to load config.ini first
    config_file = script_dir / 'config.ini'
    if config_file.exists():
        config.read(config_file)

    # Override with local config if it exists
    local_config_file = script_dir / 'config.local.ini'
    if local_config_file.exists():
        config.read(local_config_file)

    return config


def resolve_path(path_str: str, base_dir: Path) -> Path:
    """Resolve a path string to an absolute Path

    Handles both relative and absolute paths.
    Relative paths are resolved relative to base_dir.

    Args:
        path_str: Path string (can be relative or absolute)
        base_dir: Base directory for resolving relative paths

    Returns:
        Absolute Path object
    """
    path = Path(path_str)
    if path.is_absolute():
        return path
    else:
        return (base_dir / path).resolve()


def validate_config(config: configparser.ConfigParser, script_dir: Path) -> None:
    """Validate configuration values and check required paths

    Args:
        config: ConfigParser object to validate
        script_dir: Base directory for path resolution

    Raises:
        SystemExit: If configuration is invalid
    """
    # Resolve and validate recordings directory
    recordings_dir = resolve_path(config['paths']['recordings_dir'], script_dir)

    if not recordings_dir.exists():
        print(f"Error: Recordings directory does not exist: {recordings_dir}")
        print(f"\nPlease check your configuration:")
        print(f"  - config.local.ini (if it exists)")
        print(f"  - config.ini")
        print(f"\nExpected recordings directory at: {recordings_dir}")
        sys.exit(1)

    if not recordings_dir.is_dir():
        print(f"Error: Recordings path is not a directory: {recordings_dir}")
        sys.exit(1)

