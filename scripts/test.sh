#!/bin/bash
# Test runner that activates virtual environment and runs pytest
# Usage: bash scripts/test.sh [pytest args]

set -e

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Activate virtual environment
if [ -f "$PROJECT_DIR/venv/bin/activate" ]; then
    source "$PROJECT_DIR/venv/bin/activate"
    echo "✓ Virtual environment activated"
else
    echo "✗ Virtual environment not found at $PROJECT_DIR/venv"
    echo "  Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Run pytest with any provided arguments
cd "$PROJECT_DIR"
pytest tests/ "$@"

