"""
============================================================
 Government Scheme Eligibility Finder — ML Predictor
 File: ml/predictor.py

 Used by: server/app.py
 Loaded ONCE at server startup (not on every request).

 Role of ML in this project:
   ┌─────────────────────────────────────────────────────┐
   │  User Input                                         │
   │      ↓                                              │
   │  NLP Extraction (nlp/processor.py)                  │
   │      ↓                                              │
   │  Rule-Based Filter (matches schemes from JSON DB)   │
   │      ↓                                              │
   │  ML Scorer  ← THIS FILE                             │
   │  (gives each matched scheme a 0–1 score)            │
   │      ↓                                              │
   │  Schemes sorted by ML score → shown to user         │
   └─────────────────────────────────────────────────────┘

 ML does NOT decide which schemes to show.
 ML gives a relevance/eligibility probability score.
 The rule-based system does the gating.
============================================================
"""

import os
import pickle
import warnings

import numpy as np # type: ignore

warnings.filterwarnings('ignore')

# ── Paths ────────────────────────────────────────────────────────────────
_BASE   = os.path.dirname(os.path.abspath(__file__))
_MODELS = os.path.join(_BASE, 'models')

# ── Global model cache (loaded once at import time) ───────────────────────
_model        = None
_encoders     = {}
_feature_cols = None
_loaded       = False


def _load_artifacts():
    """
    Load model and encoders from disk into module-level variables.
    Called once at startup. Thread-safe for Flask's single-threaded dev mode.
    """
    global _model, _encoders, _feature_cols, _loaded

    if _loaded:
        return  # already loaded — skip disk I/O

    model_path = os.path.join(_MODELS, 'model.pkl')
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}\n"
            "Please run training first:\n"
            "  python ml/train.py"
        )

    with open(model_path, 'rb') as f:
        _model = pickle.load(f)

    for col in ['gender', 'category', 'state']:
        path = os.path.join(_MODELS, f'le_{col}.pkl')
        with open(path, 'rb') as f:
            _encoders[col] = pickle.load(f)

    meta_path = os.path.join(_MODELS, 'feature_cols.pkl')
    with open(meta_path, 'rb') as f:
        _feature_cols = pickle.load(f)

    _loaded = True
    print("✅ ML model & encoders loaded successfully")


def _safe_encode(encoder, value: str, col_name: str) -> int:
    """
    Encode a single categorical value.
    If value was not seen during training → use most-frequent class (index 0).
    Prevents crash on unknown states/categories.
    """
    value = str(value).lower().strip()
    known = list(encoder.classes_)
    if value in known:
        return encoder.transform([value])[0]
    else:
        print(f"  ⚠️  Unknown '{col_name}' value '{value}'. Using fallback class '{known[0]}'.")
        return 0  # fallback to first class


def predict_scheme_score(
    age: float,
    income: float,
    gender: str,
    category: str,
    state: str
) -> dict:
    """
    Predict eligibility probability for a given user profile.

    Args:
        age      : int/float — user's age in years
        income   : float     — annual household income in ₹
        gender   : str       — 'male' or 'female'
        category : str       — 'sc', 'st', 'obc', or 'general'
        state    : str       — Indian state name (lowercase, underscores for spaces)

    Returns:
        dict with keys:
          - 'score'      : float 0.0–1.0  (probability of eligibility)
          - 'prediction' : int   0 or 1   (final class label)
          - 'confidence' : str   'HIGH' | 'MEDIUM' | 'LOW'
          - 'eligible'   : bool
    """
    # Ensure model is loaded
    _load_artifacts()

    # ── 1. Derived features (must match train.py exactly) ─────────────
    income_lakh      = float(income) / 100000
    is_bpl           = int(float(income) < 100000)
    is_reserved      = int(str(category).lower().strip() in ['sc', 'st', 'obc'])
    is_senior        = int(float(age) >= 60)
    is_youth         = int(float(age) <= 25)
    age_income_ratio = float(age) / (income_lakh + 0.1)

    # ── 2. Encode categoricals ────────────────────────────────────────
    gender_enc   = _safe_encode(_encoders['gender'],   gender,   'gender')
    category_enc = _safe_encode(_encoders['category'], category, 'category')
    state_enc    = _safe_encode(_encoders['state'],    state,    'state')

    # ── 3. Assemble feature vector (same order as training) ───────────
    feature_vector = np.array([[
        float(age),
        income_lakh,
        is_bpl,
        is_reserved,
        is_senior,
        is_youth,
        age_income_ratio,
        gender_enc,
        category_enc,
        state_enc,
    ]])

    # ── 4. Predict ────────────────────────────────────────────────────
    prediction  = int(_model.predict(feature_vector)[0])
    proba       = _model.predict_proba(feature_vector)[0]
    score       = float(proba[1])   # probability of class 1 (eligible)

    # ── 5. Confidence band ────────────────────────────────────────────
    if score >= 0.75:
        confidence = 'HIGH'
    elif score >= 0.45:
        confidence = 'MEDIUM'
    else:
        confidence = 'LOW'

    return {
        'score':      round(score, 4),
        'prediction': prediction,
        'eligible':   bool(prediction == 1),
        'confidence': confidence,
        'proba_0':    round(float(proba[0]), 4),
        'proba_1':    round(float(proba[1]), 4),
    }


def score_and_rank_schemes(schemes: list, user_profile: dict) -> list:
    """
    Given a list of rule-matched schemes and a user profile dict,
    append an ML score to each scheme and return them sorted best-first.

    This is the BRIDGE between the rule engine and ML scoring.

    Args:
        schemes      : list of scheme dicts (already filtered by rules)
        user_profile : dict with keys: age, income, gender, category, state

    Returns:
        Same schemes list, each with added 'ml_score' and 'ml_confidence' keys,
        sorted by ml_score descending.
    """
    if not schemes:
        return schemes

    age      = user_profile.get('age')      or 30
    income   = user_profile.get('income')   or 200000
    gender   = user_profile.get('gender')   or 'male'
    category = user_profile.get('category') or 'general'
    state    = user_profile.get('state')    or 'maharashtra'

    # Get base ML score for this user profile
    try:
        result = predict_scheme_score(age, income, gender, category, state)
        base_score  = result['score']
        confidence  = result['confidence']
    except Exception as e:
        print(f"⚠️ ML scoring failed: {e}. Using rule-based score only.")
        # Graceful fallback — return schemes with neutral score
        for sc in schemes:
            sc['ml_score']      = 0.5
            sc['ml_confidence'] = 'LOW'
        return schemes

    # Adjust score per scheme based on eligibility rules match quality
    for sc in schemes:
        rule_score  = sc.get('match_score', 50) / 100.0   # normalize to 0–1
        # Weighted blend: 60% ML + 40% rule-based match score
        blended     = 0.6 * base_score + 0.4 * rule_score
        sc['ml_score']      = round(blended, 4)
        sc['ml_confidence'] = confidence

    # Sort: highest ML score first
    schemes.sort(key=lambda x: x['ml_score'], reverse=True)
    return schemes


# ── Quick self-test ───────────────────────────────────────────────────────
if __name__ == '__main__':
    print("\n── Predictor Self-Test ──\n")

    test_cases = [
        dict(age=22, income=80000,  gender='female', category='sc',      state='bihar',       label='SC girl, low income → ELIGIBLE expected'),
        dict(age=35, income=450000, gender='male',   category='general',  state='maharashtra', label='General, high income → NOT ELIGIBLE expected'),
        dict(age=60, income=55000,  gender='male',   category='obc',      state='rajasthan',   label='Senior OBC, very low income → ELIGIBLE expected'),
        dict(age=28, income=380000, gender='female', category='general',  state='delhi',       label='General Delhi, medium-high income → borderline'),
        dict(age=19, income=95000,  gender='female', category='st',       state='jharkhand',   label='ST youth, low income → ELIGIBLE expected'),
    ]

    for tc in test_cases:
        label = tc.pop('label')
        res   = predict_scheme_score(**tc)
        icon  = '✅' if res['eligible'] else '❌'
        print(f"{icon} {label}")
        print(f"   Score: {res['score']:.4f} | Class: {res['prediction']} | Confidence: {res['confidence']}")
        print()
