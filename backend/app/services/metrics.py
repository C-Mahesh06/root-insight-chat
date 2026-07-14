"""
Lightweight Prometheus Metrics Service.
Tracks LLM time-to-first-token, cache hits, throughput, and API request statistics without heavy external dependencies.
"""

import time
import threading
from typing import Dict

# Thread lock for safe concurrent updates
_lock = threading.Lock()

# Global metrics storage
_api_request_counts: Dict[str, int] = {}       # Key: "method:path:status" -> count
_api_request_durations: Dict[str, float] = {}   # Key: "method:path" -> sum of durations
_api_request_times: Dict[str, int] = {}         # Key: "method:path" -> count for avg duration

_llm_first_token_times: list[float] = []        # List of time_to_first_token values
_llm_tokens_generated = 0
_llm_generation_durations = 0.0

_cache_hits = 0
_cache_misses = 0


def track_api_request(method: str, path: str, status_code: int, duration: float):
    """Record API request count and duration."""
    key_count = f"{method}:{path}:{status_code}"
    key_dur = f"{method}:{path}"
    with _lock:
        _api_request_counts[key_count] = _api_request_counts.get(key_count, 0) + 1
        _api_request_durations[key_dur] = _api_request_durations.get(key_dur, 0.0) + duration
        _api_request_times[key_dur] = _api_request_times.get(key_dur, 0) + 1


def track_llm_first_token(duration: float):
    """Record LLM Time-To-First-Token."""
    with _lock:
        _llm_first_token_times.append(duration)


def track_llm_generation(tokens: int, duration: float):
    """Record LLM generation stats (tokens and time)."""
    with _lock:
        global _llm_tokens_generated, _llm_generation_durations
        _llm_tokens_generated += tokens
        _llm_generation_durations += duration


def track_cache(hit: bool):
    """Record cache hit or miss."""
    with _lock:
        global _cache_hits, _cache_misses
        if hit:
            _cache_hits += 1
        else:
            _cache_misses += 1


def get_prometheus_metrics() -> str:
    """Format stored metrics into Prometheus Exposition Format (text/plain)."""
    lines = []
    
    with _lock:
        # 1. API request count
        lines.append("# HELP api_request_count_total Total count of HTTP API requests.")
        lines.append("# TYPE api_request_count_total counter")
        for key, count in _api_request_counts.items():
            method, path, status = key.split(":")
            lines.append(f'api_request_count_total{{method="{method}",path="{path}",status="{status}"}} {count}')

        # 2. API request latency
        lines.append("# HELP api_request_duration_seconds_sum Cumulative sum of API request durations in seconds.")
        lines.append("# TYPE api_request_duration_seconds_sum counter")
        for key, dur in _api_request_durations.items():
            method, path = key.split(":")
            lines.append(f'api_request_duration_seconds_sum{{method="{method}",path="{path}"}} {dur:.6f}')
            
        lines.append("# HELP api_request_duration_seconds_count Cumulative count of API requests measured for duration.")
        lines.append("# TYPE api_request_duration_seconds_count counter")
        for key, count in _api_request_times.items():
            method, path = key.split(":")
            lines.append(f'api_request_duration_seconds_count{{method="{method}",path="{path}"}} {count}')

        # 3. LLM Time to First Token
        lines.append("# HELP llm_time_to_first_token_seconds_sum Cumulative sum of LLM time-to-first-token in seconds.")
        lines.append("# TYPE llm_time_to_first_token_seconds_sum counter")
        sum_ttft = sum(_llm_first_token_times)
        lines.append(f"llm_time_to_first_token_seconds_sum {sum_ttft:.6f}")
        
        lines.append("# HELP llm_time_to_first_token_seconds_count Count of LLM first token measurements.")
        lines.append("# TYPE llm_time_to_first_token_seconds_count counter")
        lines.append(f"llm_time_to_first_token_seconds_count {len(_llm_first_token_times)}")

        # 4. LLM Generation Throughput
        lines.append("# HELP llm_tokens_generated_total Total generated tokens.")
        lines.append("# TYPE llm_tokens_generated_total counter")
        lines.append(f"llm_tokens_generated_total {_llm_tokens_generated}")
        
        lines.append("# HELP llm_generation_duration_seconds_sum Total LLM generation duration in seconds.")
        lines.append("# TYPE llm_generation_duration_seconds_sum counter")
        lines.append(f"llm_generation_duration_seconds_sum {_llm_generation_durations:.6f}")

        # 5. Semantic Cache Hit Ratio
        lines.append("# HELP llm_cache_hits_total Total semantic cache hits.")
        lines.append("# TYPE llm_cache_hits_total counter")
        lines.append(f"llm_cache_hits_total {_cache_hits}")
        
        lines.append("# HELP llm_cache_misses_total Total semantic cache misses.")
        lines.append("# TYPE llm_cache_misses_total counter")
        lines.append(f"llm_cache_misses_total {_cache_misses}")
        
        total_queries = _cache_hits + _cache_misses
        hit_ratio = (_cache_hits / total_queries) if total_queries > 0 else 0.0
        lines.append("# HELP llm_cache_hit_ratio Semantic cache hit ratio (hits / total).")
        lines.append("# TYPE llm_cache_hit_ratio gauge")
        lines.append(f"llm_cache_hit_ratio {hit_ratio:.4f}")

    return "\n".join(lines) + "\n"
