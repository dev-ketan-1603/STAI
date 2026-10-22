# -*- coding: utf-8 -*-
"""
Gaussian Naive Bayes Difficulty Classifier
Maps to: Unit II — Reasoning under uncertainty using Bayes' theorem

Uses Bayes' theorem: P(class|features) ∝ P(features|class) * P(class)
Classifies a subject into: Easy / Medium / Hard
Features: [accuracy_pct, attempts, avg_score]
"""
import numpy as np
import os
import joblib

LABELS = ["Easy", "Medium", "Hard"]
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "saved_model", "nb_difficulty.pkl"
)
MODEL_PATH = os.path.abspath(MODEL_PATH)


def _train_and_save():
    """
    Bootstrap training on synthetic data.
    In production this would be retrained on real student records.
    Features: [accuracy_pct, attempts, avg_score]
    Labels  : 0=Easy, 1=Medium, 2=Hard
    """
    from sklearn.naive_bayes import GaussianNB

    X = np.array([
        # Easy: high accuracy, fewer attempts, high score
        [90, 3, 88], [85, 2, 82], [80, 4, 79],
        [95, 2, 91], [88, 3, 86], [92, 2, 90],
        [78, 4, 76], [83, 3, 81],
        # Medium
        [65, 4, 64], [60, 5, 58], [70, 3, 67],
        [55, 5, 52], [50, 6, 48], [62, 4, 60],
        [68, 4, 66], [57, 5, 54],
        # Hard: low accuracy, many attempts, low score
        [40, 6, 38], [30, 7, 32], [20, 8, 25],
        [25, 9, 22], [15, 10, 18], [35, 8, 33],
        [28, 9, 26], [18, 10, 20],
    ], dtype=float)

    y = np.array([
        0, 0, 0, 0, 0, 0, 0, 0,   # Easy (8)
        1, 1, 1, 1, 1, 1, 1, 1,   # Medium (8)
        2, 2, 2, 2, 2, 2, 2, 2,   # Hard (8)
    ])

    clf = GaussianNB()
    clf.fit(X, y)
    joblib.dump(clf, MODEL_PATH)
    return clf


def _load_nb():
    if os.path.exists(MODEL_PATH):
        try:
            return joblib.load(MODEL_PATH)
        except Exception:
            pass
    return _train_and_save()


# Load (or train) on import
_nb_model = _load_nb()


def classify_difficulty(accuracy_pct, attempts, avg_score):
    """
    Classify subject difficulty using Gaussian Naive Bayes.

    Bayes theorem applied:
        P(class | x) proportional to P(x | class) * P(class)
    where x = [accuracy_pct, attempts, avg_score]
    Gaussian NB models P(x | class) as a Gaussian distribution per feature.

    Args:
        accuracy_pct : float  -- quiz accuracy 0-100
        attempts     : int    -- number of questions attempted
        avg_score    : float  -- average score 0-100

    Returns:
        dict with label, confidence, probabilities, bayes_note
    """
    x = np.array([[float(accuracy_pct), float(attempts), float(avg_score)]])
    label_idx = int(_nb_model.predict(x)[0])
    probs     = _nb_model.predict_proba(x)[0]

    label = LABELS[label_idx]
    confidence = round(float(probs[label_idx]) * 100, 1)

    return {
        "label": label,
        "confidence": confidence,
        "probabilities": {
            "Easy":   round(float(probs[0]), 3),
            "Medium": round(float(probs[1]), 3),
            "Hard":   round(float(probs[2]), 3),
        },
        "bayes_note": (
            f"P({label}|accuracy={accuracy_pct:.0f}%, attempts={attempts}, score={avg_score:.0f}) "
            f"= {confidence}% via Gaussian Naive Bayes (Bayes theorem)"
        )
    }
