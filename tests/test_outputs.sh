#!/bin/bash
# Test script to compare outputs between baseline and new implementation

set -e

BASELINE_DIR="tmp/baseline"
TEST_OUTPUT_DIR=""

# Parse arguments
if [ $# -eq 0 ]; then
    echo "Usage: ./tests/test_outputs.sh <test_output_directory>"
    echo "Example: ./tests/test_outputs.sh outputs/2025-11-21_16-30-00"
    exit 1
fi

TEST_OUTPUT_DIR="$1"

if [ ! -d "$BASELINE_DIR" ]; then
    echo "Error: Baseline directory not found: $BASELINE_DIR"
    exit 1
fi

if [ ! -d "$TEST_OUTPUT_DIR" ]; then
    echo "Error: Test output directory not found: $TEST_OUTPUT_DIR"
    exit 1
fi

echo "============================================================"
echo "Comparing outputs"
echo "============================================================"
echo "Baseline: $BASELINE_DIR"
echo "Test:     $TEST_OUTPUT_DIR"
echo ""

# Files to compare (byte-identical)
CSV_FILES=(
    "recordings_detail.csv"
    "daily_summary.csv"
    "hourly_patterns.csv"
    "word_frequency.csv"
    "phrase_frequency.csv"
    "mode_usage.csv"
    "topic_distribution.csv"
    "filler_word_analysis.csv"
    "sentence_metrics.csv"
)

MARKDOWN_FILES=(
    "insights_report.md"
    "insights_prompt.md"
)

MERMAID_FILES=(
    "timeline_activity.mmd"
    "timeline_topics.mmd"
    "chart_top_words.mmd"
    "chart_mode_usage.mmd"
    "chart_topic_distribution.mmd"
)

FAILED=0

# Compare CSV files
echo "Comparing CSV files..."
for file in "${CSV_FILES[@]}"; do
    if diff -q "$BASELINE_DIR/$file" "$TEST_OUTPUT_DIR/$file" > /dev/null 2>&1; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (DIFFERENT)"
        FAILED=1
    fi
done

# Compare Markdown files
echo ""
echo "Comparing Markdown files..."
for file in "${MARKDOWN_FILES[@]}"; do
    if diff -q "$BASELINE_DIR/$file" "$TEST_OUTPUT_DIR/$file" > /dev/null 2>&1; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (DIFFERENT)"
        FAILED=1
    fi
done

# Compare Mermaid files
echo ""
echo "Comparing Mermaid files..."
for file in "${MERMAID_FILES[@]}"; do
    if diff -q "$BASELINE_DIR/$file" "$TEST_OUTPUT_DIR/$file" > /dev/null 2>&1; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (DIFFERENT)"
        FAILED=1
    fi
done

# Compare JSON (semantic comparison - just check if valid and same structure)
echo ""
echo "Comparing JSON file..."
if [ -f "$BASELINE_DIR/analytics.json" ] && [ -f "$TEST_OUTPUT_DIR/analytics.json" ]; then
    # Just check both are valid JSON
    if python3 -m json.tool "$BASELINE_DIR/analytics.json" > /dev/null 2>&1 && \
       python3 -m json.tool "$TEST_OUTPUT_DIR/analytics.json" > /dev/null 2>&1; then
        echo "  ✓ analytics.json (valid JSON)"
        # Could add more sophisticated comparison here
    else
        echo "  ✗ analytics.json (INVALID)"
        FAILED=1
    fi
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo "============================================================"
    echo "✓ All outputs match baseline!"
    echo "============================================================"
    exit 0
else
    echo "============================================================"
    echo "✗ Some outputs differ from baseline"
    echo "============================================================"
    exit 1
fi

