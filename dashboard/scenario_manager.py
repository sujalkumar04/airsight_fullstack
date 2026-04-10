"""
scenario_manager.py — ScenarioManager for AirSight AI
Handles saving, listing, and retrieving named forecast scenarios (what-if planning).
Scenarios are persisted to a local JSON file (scenarios.json).
"""
import json
import os
from datetime import datetime

SCENARIOS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenarios.json")


def _load() -> list:
    """Load all scenarios from disk."""
    if not os.path.exists(SCENARIOS_FILE):
        return []
    try:
        with open(SCENARIOS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


def _save(scenarios: list) -> None:
    """Persist scenarios to disk."""
    with open(SCENARIOS_FILE, "w") as f:
        json.dump(scenarios, f, indent=2)


def create_scenario(name: str, description: str, inputs: dict, forecasts: dict, created_by: str = "Planner") -> dict:
    """Save a new named forecast scenario."""
    scenarios = _load()
    scenario_id = f"sc_{len(scenarios) + 1:04d}"
    scenario = {
        "id": scenario_id,
        "name": name,
        "description": description,
        "created_by": created_by,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "inputs": inputs,       # raw input parameters used for this forecast
        "forecasts": forecasts, # the actual forecast results (24h/48h/72h)
        "comments": [],
    }
    scenarios.append(scenario)
    _save(scenarios)
    return scenario


def list_scenarios() -> list:
    """Return all saved scenarios (newest first)."""
    return list(reversed(_load()))


def get_scenario(scenario_id: str) -> dict | None:
    """Return a single scenario by ID."""
    for s in _load():
        if s["id"] == scenario_id:
            return s
    return None


def add_comment(scenario_id: str, author: str, text: str) -> dict | None:
    """Add a comment to a scenario."""
    scenarios = _load()
    for s in scenarios:
        if s["id"] == scenario_id:
            s["comments"].append({
                "author": author,
                "text": text,
                "at": datetime.now().isoformat(timespec="seconds"),
            })
            _save(scenarios)
            return s
    return None


def delete_scenario(scenario_id: str) -> bool:
    """Delete a scenario by ID. Returns True if deleted."""
    scenarios = _load()
    new = [s for s in scenarios if s["id"] != scenario_id]
    if len(new) < len(scenarios):
        _save(new)
        return True
    return False
