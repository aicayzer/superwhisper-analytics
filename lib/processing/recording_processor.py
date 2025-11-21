"""Recording Processor module - Process individual recordings and extract metadata

Handles parsing meta.json files, extracting WAV duration, classifying topics,
applying date filters, and the main recording processing loop.
"""

import json
import wave
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Optional, Dict

from lib.core.constants import TOPIC_KEYWORDS
from lib.core.models import Recording, FilterCriteria
from lib.processing.text_analysis import count_filler_words, calculate_sentence_metrics


def parse_datetime(dt_str: Optional[str], folder_timestamp: str) -> datetime:
    """Parse datetime string, fallback to folder timestamp if needed
    
    Args:
        dt_str: ISO format datetime string
        folder_timestamp: Folder name (Unix timestamp) as fallback
        
    Returns:
        Parsed datetime object
    """
    if dt_str:
        try:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            pass
    
    # Fallback to folder timestamp (Unix timestamp)
    try:
        return datetime.fromtimestamp(int(folder_timestamp))
    except (ValueError, TypeError):
        return datetime.now()


def get_wav_duration(filepath: Path) -> Optional[float]:
    """Get duration of a WAV file in seconds
    
    Args:
        filepath: Path to WAV file
        
    Returns:
        Duration in seconds, or None if file cannot be read
    """
    try:
        with wave.open(str(filepath), 'rb') as wav_file:
            frames = wav_file.getnframes()
            sample_rate = wav_file.getframerate()
            return frames / float(sample_rate)
    except Exception:
        return None


def classify_topic(text: str) -> Tuple[str, List[str]]:
    """Classify recording into primary and secondary topics
    
    Uses keyword matching against predefined topic categories.
    
    Args:
        text: Transcript text to classify
        
    Returns:
        Tuple of (primary_topic, list_of_secondary_topics)
    """
    if not text:
        return "Unknown", []
    
    text_lower = text.lower()
    scores = {topic: 0 for topic in TOPIC_KEYWORDS.keys()}
    
    for topic, keywords in TOPIC_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                scores[topic] += 1
    
    # Get primary topic (highest score)
    if not any(scores.values()):
        return "Unknown", []
    
    primary_topic = max(scores.items(), key=lambda x: x[1])[0]
    
    # Get secondary topics (score > 0 and not primary)
    secondary_topics = [
        topic for topic, score in scores.items()
        if score > 0 and topic != primary_topic
    ]
    
    return primary_topic, secondary_topics[:3]  # Limit to top 3 secondary topics


def filter_by_date(folder_name: str, date_filter: Optional[str], month_filter: Optional[str],
                   date_from: Optional[str], date_to: Optional[str]) -> bool:
    """Filter recording folder by date criteria
    
    Args:
        folder_name: Folder name (Unix timestamp)
        date_filter: Single date filter (YYYY-MM-DD)
        month_filter: Month filter (YYYY-MM)
        date_from: Start of date range (YYYY-MM-DD)
        date_to: End of date range (YYYY-MM-DD)
        
    Returns:
        True if recording matches filters, False otherwise
    """
    try:
        # Parse Unix timestamp from folder name
        timestamp = int(folder_name)
        recording_date = datetime.fromtimestamp(timestamp)
        recording_date_str = recording_date.date().isoformat()
        
        # Check single date filter
        if date_filter and recording_date_str != date_filter:
            return False
        
        # Check month filter (YYYY-MM format)
        if month_filter:
            recording_month = recording_date.strftime("%Y-%m")
            if recording_month != month_filter:
                return False
        
        # Check date range
        if date_from and recording_date_str < date_from:
            return False
        if date_to and recording_date_str > date_to:
            return False
        
        return True
    except (ValueError, OSError):
        # Invalid timestamp, exclude from results
        return False


def process_recordings(recordings_dir: Path, date_filter: Optional[str] = None,
                      month_filter: Optional[str] = None, date_from: Optional[str] = None,
                      date_to: Optional[str] = None) -> List[Dict]:
    """Process all recordings and extract data, optionally filtering by date
    
    Main processing loop that:
    1. Filters recordings by date criteria
    2. Loads meta.json from each recording folder
    3. Extracts metadata, transcripts, and calculated metrics
    4. Returns list of recording dictionaries
    
    Args:
        recordings_dir: Path to recordings directory
        date_filter: Optional single date filter (YYYY-MM-DD)
        month_filter: Optional month filter (YYYY-MM)
        date_from: Optional start of date range (YYYY-MM-DD)
        date_to: Optional end of date range (YYYY-MM-DD)
        
    Returns:
        List of recording dictionaries with all metadata and metrics
    """
    recordings_data = []
    all_folders = sorted([d for d in recordings_dir.iterdir() if d.is_dir()])
    
    # Apply date filtering
    recordings_folders = [
        d for d in all_folders
        if filter_by_date(d.name, date_filter, month_filter, date_from, date_to)
    ]
    
    total = len(recordings_folders)
    total_before_filter = len(all_folders)
    
    if total < total_before_filter:
        print(f"Filtered to {total} recordings (from {total_before_filter} total)")
    else:
        print(f"Processing {total} recordings...")
    
    for idx, folder in enumerate(recordings_folders, 1):
        if idx % 100 == 0:
            print(f"Processed {idx}/{total} recordings...", end='\r')
        
        meta_file = folder / "meta.json"
        wav_file = folder / "output.wav"
        
        if not meta_file.exists():
            continue
        
        try:
            with open(meta_file, 'r', encoding='utf-8') as f:
                meta = json.load(f)
        except Exception as e:
            print(f"\nError reading {meta_file}: {e}", file=sys.stderr)
            continue
        
        # Extract basic info
        recording_id = folder.name
        datetime_str = meta.get("datetime", "")
        duration_ms = meta.get("duration", 0)
        duration_seconds = duration_ms / 1000.0 if duration_ms else 0
        
        # Verify duration with WAV file if available
        if wav_file.exists() and duration_seconds == 0:
            wav_duration = get_wav_duration(wav_file)
            if wav_duration:
                duration_seconds = wav_duration
                duration_ms = int(wav_duration * 1000)
        
        # Parse datetime
        dt = parse_datetime(datetime_str, recording_id)
        date = dt.date()
        hour = dt.hour
        day_of_week = dt.strftime("%A")
        
        # Extract transcript
        result = meta.get("result", "") or meta.get("rawResult", "")
        has_transcript = bool(result and result.strip())
        
        # Calculate word and character counts
        word_count = len(result.split()) if result else 0
        char_count = len(result) if result else 0
        words_per_minute = (word_count / duration_seconds * 60) if duration_seconds > 0 else 0
        
        # Filler word analysis
        filler_count, filler_breakdown = count_filler_words(result)
        filler_percentage = (filler_count / word_count * 100) if word_count > 0 else 0
        
        # Sentence-level metrics
        sentence_metrics = calculate_sentence_metrics(result)
        
        # Topic classification
        primary_topic, secondary_topics = classify_topic(result)
        secondary_topics_str = ", ".join(secondary_topics) if secondary_topics else ""
        
        # Extract other metadata
        mode_name = meta.get("modeName", "Unknown")
        model_name = meta.get("modelName", "")
        app_version = meta.get("appVersion", "")
        processing_time_ms = meta.get("processingTime", 0)
        segments = meta.get("segments", [])
        segment_count = len(segments) if isinstance(segments, list) else 0
        
        recordings_data.append({
            "recording_id": recording_id,
            "datetime": dt.isoformat(),
            "date": date.isoformat(),
            "hour": hour,
            "day_of_week": day_of_week,
            "duration_seconds": round(duration_seconds, 2),
            "duration_ms": duration_ms,
            "has_transcript": has_transcript,
            "word_count": word_count,
            "char_count": char_count,
            "words_per_minute": round(words_per_minute, 2),
            "filler_word_count": filler_count,
            "filler_word_percentage": round(filler_percentage, 2),
            "sentence_count": sentence_metrics["sentence_count"],
            "avg_words_per_sentence": sentence_metrics["avg_words_per_sentence"],
            "avg_chars_per_sentence": sentence_metrics["avg_chars_per_sentence"],
            "mode_name": mode_name,
            "model_name": model_name,
            "app_version": app_version,
            "processing_time_ms": processing_time_ms,
            "segment_count": segment_count,
            "folder_name": recording_id,
            "primary_topic": primary_topic,
            "secondary_topics": secondary_topics_str,
            "transcript": result,  # Keep for word/phrase frequency analysis
            "filler_breakdown": filler_breakdown  # Keep for aggregate analysis
        })
    
    print(f"\nProcessed {len(recordings_data)} recordings successfully.")
    return recordings_data

