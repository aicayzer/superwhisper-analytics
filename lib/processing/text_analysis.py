"""Text Analysis module - Text processing and linguistic analysis

Contains functions for text cleaning, word extraction, n-grams, filler word detection,
sentence splitting, and metrics calculation.
"""

import re
from typing import List, Tuple, Dict
from lib.core.constants import STOP_WORDS, FILLER_WORDS


def clean_text(text: str) -> str:
    """Clean text for word frequency analysis

    Removes punctuation and converts to lowercase.

    Args:
        text: Input text to clean

    Returns:
        Cleaned text with punctuation removed and lowercase
    """
    # Remove punctuation and convert to lowercase
    text = re.sub(r'[^\w\s]', ' ', text.lower())
    return text


def extract_words(text: str) -> List[str]:
    """Extract words from text, excluding stop words

    Cleans text, splits into words, and filters out:
    - Stop words
    - Words with 2 or fewer characters

    Args:
        text: Input text

    Returns:
        List of filtered words
    """
    words = clean_text(text).split()
    return [w for w in words if w and w not in STOP_WORDS and len(w) > 2]


def extract_ngrams(text: str, n: int) -> List[str]:
    """Extract n-grams from text

    Generates n-word sequences from text, filtering out sequences with
    too many stop words.

    Args:
        text: Input text
        n: Size of n-gram (2 for bigrams, 3 for trigrams)

    Returns:
        List of n-gram strings
    """
    if not text:
        return []

    # Clean and tokenize
    words = clean_text(text).split()
    words = [w for w in words if w and len(w) > 1]  # Filter very short words

    if len(words) < n:
        return []

    # Generate n-grams
    ngrams = []
    for i in range(len(words) - n + 1):
        ngram_words = words[i:i+n]

        # Skip if all words are stop words
        if all(w in STOP_WORDS for w in ngram_words):
            continue

        # Skip if contains too many stop words (more than half)
        stop_word_count = sum(1 for w in ngram_words if w in STOP_WORDS)
        if stop_word_count > n / 2:
            continue

        ngrams.append(" ".join(ngram_words))

    return ngrams


def count_filler_words(text: str) -> Tuple[int, Dict[str, int]]:
    """Count filler words and phrases in text

    Detects both single-word fillers (um, uh, like) and multi-word phrases
    (you know, I mean, sort of).

    Args:
        text: Input text to analyze

    Returns:
        Tuple of (total_count, filler_breakdown)
        - total_count: Total number of filler occurrences
        - filler_breakdown: Dict mapping filler phrase to count
    """
    if not text:
        return 0, {}

    text_lower = text.lower()
    filler_counts = {}

    # Count each filler word/phrase
    for filler_name, pattern in FILLER_WORDS.items():
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_counts[filler_name] = len(matches)

    total_count = sum(filler_counts.values())
    return total_count, filler_counts


def split_sentences(text: str) -> List[str]:
    """Split text into sentences with improved handling of abbreviations

    Protects common abbreviations from being treated as sentence endings.

    Args:
        text: Input text

    Returns:
        List of sentence strings
    """
    if not text:
        return []

    # Common abbreviations that shouldn't end sentences (protect them first)
    protected = text
    abbreviations = [
        'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'vs.', 'etc.',
        'Inc.', 'Ltd.', 'Corp.', 'St.', 'Ave.', 'Rd.', 'Blvd.'
    ]

    # Temporarily replace abbreviations with placeholders
    placeholders = {}
    for i, abbr in enumerate(abbreviations):
        placeholder = f'__ABBR{i}__'
        placeholders[placeholder] = abbr
        protected = protected.replace(abbr, placeholder)

    # Split on sentence endings followed by space and capital letter, or at end of string
    sentence_pattern = r'[.!?]+\s+(?=[A-Z])|[.!?]+\s*$'
    sentences = re.split(sentence_pattern, protected)

    # Restore abbreviations and clean up
    restored_sentences = []
    for sent in sentences:
        if sent and sent.strip():
            # Restore abbreviations
            for placeholder, abbr in placeholders.items():
                sent = sent.replace(placeholder, abbr)
            restored_sentences.append(sent.strip())

    return restored_sentences


def calculate_sentence_metrics(text: str) -> Dict[str, float]:
    """Calculate sentence-level metrics for text

    Computes:
    - Number of sentences
    - Average words per sentence
    - Average characters per sentence

    Args:
        text: Input text

    Returns:
        Dict with sentence_count, avg_words_per_sentence, avg_chars_per_sentence
    """
    if not text:
        return {
            "sentence_count": 0,
            "avg_words_per_sentence": 0.0,
            "avg_chars_per_sentence": 0.0
        }

    sentences = split_sentences(text)
    sentence_count = len(sentences)

    if sentence_count == 0:
        # Treat entire text as one sentence if no sentence boundaries found
        return {
            "sentence_count": 1,
            "avg_words_per_sentence": float(len(text.split())),
            "avg_chars_per_sentence": float(len(text))
        }

    # Calculate metrics
    total_words = sum(len(s.split()) for s in sentences)
    total_chars = sum(len(s) for s in sentences)

    return {
        "sentence_count": sentence_count,
        "avg_words_per_sentence": round(total_words / sentence_count, 2) if sentence_count > 0 else 0.0,
        "avg_chars_per_sentence": round(total_chars / sentence_count, 2) if sentence_count > 0 else 0.0
    }

