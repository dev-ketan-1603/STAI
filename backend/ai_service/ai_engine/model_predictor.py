import joblib
import os
import pandas as pd

# detect model path safely
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "..", "saved_model", "study_model.pkl")
model_path = os.path.abspath(model_path)

print("Loading model from:", model_path)

model = joblib.load(model_path)

# feature names must match training
feature_names = [
    "study_hours",
    "focus_level",
    "breaks_taken",
    "difficulty_level",
    "previous_score"
]

# Human-readable insight per top feature
FEATURE_INSIGHTS = {
    "study_hours":       "Your total study time is the primary driver of this prediction",
    "focus_level":       "Your focus and concentration level is the key factor here",
    "breaks_taken":      "Your break pattern is significantly influencing the result",
    "difficulty_level":  "Subject difficulty is the dominant challenge in this prediction",
    "previous_score":    "Your past performance score is the strongest predictor",
}


def predict_student(
        study_hours,
        focus_level,
        breaks_taken,
        difficulty_level,
        previous_score):

    input_data = pd.DataFrame([[
        study_hours,
        focus_level,
        breaks_taken,
        difficulty_level,
        previous_score
    ]], columns=feature_names)

    prediction = model.predict(input_data)

    recommended_hours     = float(prediction[0][0])
    predicted_performance = float(prediction[0][1])

    # ── XAI: Aggregate feature importances across all estimators ──────────────
    # MultiOutputRegressor wraps one estimator per output; average both outputs
    importance_sum = {f: 0.0 for f in feature_names}
    estimator_count = 0
    for estimator in model.estimators_:
        # Each estimator is a RandomForestRegressor (single output)
        for feat, imp in zip(feature_names, estimator.feature_importances_):
            importance_sum[feat] += imp
        estimator_count += 1

    total = sum(importance_sum.values()) or 1.0
    importances = {k: round(v / total, 3) for k, v in importance_sum.items()}
    top_factor  = max(importances, key=importances.get)

    return {
        "recommended_hours":     round(recommended_hours, 2),
        "predicted_performance": round(predicted_performance, 2),
        "explanation": {
            "top_factor": top_factor,
            "insight":    FEATURE_INSIGHTS.get(top_factor, "Multiple factors are balanced"),
            "factors":    importances,
        }
    }