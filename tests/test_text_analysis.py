"""Unit tests for text analysis module."""

import pytest

from lib.processing.text_analysis import (
    calculate_sentence_metrics,
    clean_text,
    count_filler_words,
    extract_ngrams,
    extract_words,
    split_sentences,
)


class TestCleanText:
    """Tests for clean_text function."""

    def test_basic_cleaning(self):
        text = "Hello, World! This is a test."
        result = clean_text(text)
        # Removes punctuation and lowercases, replaces punctuation with single spaces
        assert result == "hello  world  this is a test "

    def test_multiple_spaces(self):
        text = "Too    many     spaces"
        result = clean_text(text)
        # Lowercases but preserves whitespace
        assert result == "too    many     spaces"

    def test_empty_string(self):
        assert clean_text("") == ""

    def test_only_whitespace(self):
        # Whitespace is preserved as-is
        assert clean_text("   \n  \t  ") == "   \n  \t  "


class TestExtractWords:
    """Tests for extract_words function."""

    def test_basic_extraction(self):
        text = "The quick brown fox jumps"
        words = extract_words(text)
        # 'The' is a stop word and should be filtered out
        assert "quick" in words
        assert "brown" in words
        assert "the" not in words

    def test_case_insensitivity(self):
        text = "HELLO hello HeLLo"
        words = extract_words(text)
        # All should be lowercase and 'hello' is not a stop word
        assert all(w == "hello" for w in words)
        assert len(words) == 3

    def test_empty_text(self):
        assert extract_words("") == []

    def test_only_stop_words(self):
        text = "the and or but"
        assert extract_words(text) == []


class TestExtractNgrams:
    """Tests for extract_ngrams function."""

    def test_bigrams(self):
        text = "hello world test case"
        bigrams = extract_ngrams(text, 2)
        assert "hello world" in bigrams
        assert "world test" in bigrams
        assert "test case" in bigrams
        assert len(bigrams) == 3

    def test_trigrams(self):
        text = "one two three four"
        trigrams = extract_ngrams(text, 3)
        assert "one two three" in trigrams
        assert "two three four" in trigrams
        assert len(trigrams) == 2

    def test_insufficient_words(self):
        text = "hello"
        bigrams = extract_ngrams(text, 2)
        assert bigrams == []

    def test_empty_text(self):
        assert extract_ngrams("", 2) == []


class TestCountFillerWords:
    """Tests for count_filler_words function."""

    def test_single_word_fillers(self):
        text = "Um, I think, uh, we should go"
        count, breakdown = count_filler_words(text)
        assert count > 0
        assert "um" in breakdown or "uh" in breakdown

    def test_multiword_phrases(self):
        text = "You know, I mean, it's like really good"
        count, breakdown = count_filler_words(text)
        assert count > 0
        # Should detect "you know" and/or "i mean" and/or "like"
        assert any(phrase in breakdown for phrase in ["you know", "i mean", "like"])

    def test_no_fillers(self):
        text = "This is a clean sentence with no filler words."
        count, breakdown = count_filler_words(text)
        assert count == 0
        assert len(breakdown) == 0

    def test_empty_text(self):
        count, breakdown = count_filler_words("")
        assert count == 0
        assert len(breakdown) == 0


class TestSplitSentences:
    """Tests for split_sentences function."""

    def test_basic_splitting(self):
        text = "First sentence. Second sentence. Third sentence."
        sentences = split_sentences(text)
        assert len(sentences) == 3
        # Note: terminators are stripped
        assert sentences[0] == "First sentence"
        assert sentences[1] == "Second sentence"
        assert sentences[2] == "Third sentence"

    def test_multiple_terminators(self):
        text = "Question? Exclamation! Statement."
        sentences = split_sentences(text)
        assert len(sentences) == 3

    def test_abbreviations(self):
        text = "Dr. Smith works at the bank. He is great."
        sentences = split_sentences(text)
        # Should not split on Dr. abbreviation
        assert len(sentences) == 2
        assert "Dr. Smith" in sentences[0]

    def test_empty_text(self):
        assert split_sentences("") == []


class TestCalculateSentenceMetrics:
    """Tests for calculate_sentence_metrics function."""

    def test_basic_metrics(self):
        text = "This is a test. Another sentence here."
        metrics = calculate_sentence_metrics(text)
        assert metrics["sentence_count"] == 2
        assert metrics["avg_words_per_sentence"] > 0
        assert metrics["avg_chars_per_sentence"] > 0

    def test_empty_text(self):
        metrics = calculate_sentence_metrics("")
        assert metrics["sentence_count"] == 0
        assert metrics["avg_words_per_sentence"] == 0
        assert metrics["avg_chars_per_sentence"] == 0

    def test_single_sentence(self):
        text = "Just one sentence."
        metrics = calculate_sentence_metrics(text)
        assert metrics["sentence_count"] == 1
        assert metrics["avg_words_per_sentence"] == 3.0

    def test_complex_text(self):
        text = """
        This is the first sentence with multiple words.
        Second sentence is shorter.
        Third!
        """
        metrics = calculate_sentence_metrics(text)
        assert metrics["sentence_count"] == 3
        assert "avg_words_per_sentence" in metrics
        assert "avg_chars_per_sentence" in metrics

