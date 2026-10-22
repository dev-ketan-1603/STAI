# -*- coding: utf-8 -*-
"""
Called by Node.js via child_process.execFile.
Reads JSON from stdin, writes JSON result to stdout.

AI Pipeline covers:
  - Unit IV : Supervised ML (Random Forest) — model_predictor
  - Unit V  : Explainable AI (feature importance) — model_predictor
  - Unit II : Bayes theorem (Naive Bayes classifier) — difficulty_classifier
  - Unit II : A* Informed Search (study path) — astar_planner
  - Unit II : Inverse-accuracy weighted timetable — timetable_generator
"""
import sys, os, json
from io import StringIO

# Make ai_engine importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai_engine"))

# Suppress "Loading model from:" print during import
_saved_stdout = sys.stdout
sys.stdout = StringIO()
from model_predictor import predict_student
from timetable_generator import generate_timetable
from difficulty_classifier import classify_difficulty
from astar_planner import astar_study_path
sys.stdout = _saved_stdout


def main():
    raw  = sys.stdin.read().strip()
    body = json.loads(raw)

    study_hours      = float(body.get("study_hours", 3))
    focus_level      = float(body.get("focus_level", 5))
    breaks           = float(body.get("breaks", 1))
    difficulty_level = float(body.get("difficulty_level", 3))
    previous_score   = float(body.get("previous_score", 50))
    subjects         = body.get("subjects", [])

    # ── 1. Random Forest prediction (with XAI) ─────────────────────────────
    prediction = predict_student(study_hours, focus_level, breaks, difficulty_level, previous_score)

    # ── 2. Inverse-accuracy weighted timetable ─────────────────────────────
    timetable = generate_timetable(subjects, study_hours) if subjects else {}

    # ── 3. Naive Bayes difficulty classification per subject ───────────────
    difficulty_analysis = {}
    for s in subjects:
        correct  = s.get("correct_questions", 5)
        total    = s.get("total_questions", 10)
        accuracy = (correct / max(total, 1)) * 100
        difficulty_analysis[s["name"]] = classify_difficulty(
            accuracy_pct=accuracy,
            attempts=total,
            avg_score=accuracy,   # proxy until real avg scores available
        )

    # ── 4. A* study path (optimal subject order) ──────────────────────────
    timetable_for_astar = [
        {"name": name, "allocated_hours": hrs}
        for name, hrs in timetable.items()
    ]
    study_path = astar_study_path(
        subjects=timetable_for_astar,
        total_days=14,
        total_hours_per_day=study_hours,
    )

    result = {
        "recommended_hours":     prediction["recommended_hours"],
        "predicted_performance": prediction["predicted_performance"],
        "explanation":           prediction["explanation"],      # XAI
        "timetable":             timetable,
        "difficulty_analysis":   difficulty_analysis,            # Naive Bayes
        "study_path":            study_path,                     # A*
    }

    # Only print the JSON — suppress all other output
    print(json.dumps(result))


if __name__ == "__main__":
    main()
