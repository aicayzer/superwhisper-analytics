"""Constants module - Static configuration and lookup data

Contains topic keywords, stop words, and filler word patterns used throughout the analytics.
"""


# Topic keyword definitions
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "Code/Development": [
        "code", "repository", "repo", "github", "git", "commit", "function", "class",
        "python", "javascript", "typescript", "error", "bug", "fix", "implement",
        "script", "file", "module", "package", "import", "export", "test", "testing"
    ],
    "Documentation": [
        "documentation", "doc", "readme", "write", "document", "page", "section",
        "confluence", "notion", "markdown", "specification", "spec", "outline",
        "draft", "edit", "revise", "update", "content"
    ],
    "Data Engineering": [
        "bigquery", "sql", "dbt", "dataform", "query", "table", "dataset", "model",
        "staging", "mart", "intermediate", "transformation", "etl", "elt", "schema",
        "column", "field", "data", "analytics", "warehouse"
    ],
    "Project Management": [
        "ticket", "task", "todo", "epic", "story", "plan", "planning", "progress",
        "update", "meeting", "agenda", "action", "item", "deadline", "milestone",
        "sprint", "backlog", "priority"
    ],
    "Business Context": [
        "business", "banking", "customer", "lending", "savings", "account", "application",
        "product", "feature", "requirement", "stakeholder", "user", "client", "service"
    ],
    "Feedback/Instructions": [
        "please", "should", "need", "want", "think", "prefer", "suggest", "review",
        "check", "confirm", "update", "change", "modify", "improve", "better",
        "feedback", "instruction", "clarify", "understand"
    ],
    "Analysis": [
        "analyze", "analysis", "insight", "metric", "performance", "trend", "data",
        "report", "dashboard", "chart", "graph", "statistic", "measure", "evaluate",
        "review", "quarter", "q1", "q2", "q3", "q4"
    ],
    "Technical Architecture": [
        "architecture", "design", "system", "service", "api", "endpoint", "mcp",
        "server", "client", "framework", "tool", "tooling", "infrastructure",
        "deployment", "config", "configuration", "best practice", "standard"
    ]
}

# Common English stop words
STOP_WORDS: set[str] = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
    "do", "does", "did", "will", "would", "should", "could", "may", "might", "must",
    "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
    "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their",
    "what", "which", "who", "whom", "whose", "where", "when", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "just", "now"
}

# Filler words and phrases (multi-word phrases use regex patterns)
FILLER_WORDS: dict[str, str] = {
    # Single word fillers
    'um': r'\bum+\b',
    'uh': r'\buh+\b',
    'er': r'\ber+\b',
    'ah': r'\bah+\b',
    'like': r'\blike\b',
    'basically': r'\bbasically\b',
    'literally': r'\bliterally\b',
    'actually': r'\bactually\b',
    'honestly': r'\bhonestly\b',
    'seriously': r'\bseriously\b',
    'totally': r'\btotally\b',
    'right': r'\bright\b(?!\s+now)',  # Exclude "right now" which is meaningful
    'okay': r'\bokay\b',
    'ok': r'\bok\b',
    'well': r'\bwell\b(?=\s+[,.]|\s+$)',  # Only filler when at end or before punctuation
    'so': r'\bso\b(?=\s+[,.]|\s+$)',
    'yeah': r'\byeah\b',
    'yes': r'\byes\b(?=\s+[,.]|\s+$)',

    # Multi-word fillers
    'you know': r'\byou\s+know\b',
    'i mean': r'\bi\s+mean\b',
    'you see': r'\byou\s+see\b',
    'i think': r'\bi\s+think\b',
    'you think': r'\byou\s+think\b',
    'sort of': r'\bsort\s+of\b',
    'kind of': r'\bkind\s+of\b',
    'a bit': r'\ba\s+bit\b',
    'a little': r'\ba\s+little\b',
    'at the end of the day': r'\bat\s+the\s+end\s+of\s+the\s+day\b',
    'to be honest': r'\bto\s+be\s+honest\b',
    'if you will': r'\bif\s+you\s+will\b',
    'as it were': r'\bas\s+it\s+were\b',
}

