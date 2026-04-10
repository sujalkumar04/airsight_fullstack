"""
audit_logger.py — Simple file-based audit logger for AirSight AI
Logs predictions, uploads, and system events with timestamps.
"""
import os
from datetime import datetime

LOG_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(LOG_DIR, "audit_log.txt")


def log_action(action, details=""):
    """Append a timestamped log entry to audit_log.txt"""
    timestamp = datetime.now().isoformat(timespec='seconds')
    entry = f"{timestamp} | {action} | {details}\n"
    try:
        with open(LOG_FILE, "a") as f:
            f.write(entry)
    except Exception as e:
        print(f"⚠️ Audit log write failed: {e}")


def get_recent_logs(n=50):
    """Return the last n log entries as a list of strings."""
    try:
        if not os.path.exists(LOG_FILE):
            return []
        with open(LOG_FILE, "r") as f:
            lines = f.readlines()
        return [line.strip() for line in lines[-n:]][::-1]  # newest first
    except Exception:
        return []
