# Makefile for Superwhisper Analytics
# Provides convenient shortcuts for common development tasks

.PHONY: help test lint lint-fix install clean run

help:
	@echo "Superwhisper Analytics - Development Commands"
	@echo ""
	@echo "Available targets:"
	@echo "  make install    Install dependencies in virtual environment"
	@echo "  make test       Run all tests"
	@echo "  make lint       Run linter (ruff)"
	@echo "  make lint-fix   Run linter with auto-fix"
	@echo "  make run        Run the CLI in interactive mode"
	@echo "  make clean      Remove cache and temporary files"

install:
	@echo "Installing dependencies..."
	@bash -c "source venv/bin/activate && pip install -r requirements.txt"
	@echo "✓ Dependencies installed"

test:
	@bash scripts/test.sh

lint:
	@bash scripts/lint.sh

lint-fix:
	@bash scripts/lint.sh --fix

run:
	@bash -c "source venv/bin/activate && python3 main.py"

clean:
	@echo "Cleaning cache and temporary files..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Cleaned"

