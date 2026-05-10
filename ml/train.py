"""
============================================================
 Government Scheme Eligibility Finder — ML Training Pipeline
 File: ml/train.py
 Run: python ml/train.py   (from project root)
============================================================

Architecture:
  User Input → NLP Extraction → Rule-Based Filter → ML Scoring → Ranked Output

The ML model does NOT decide which schemes to show.
It gives each (user_profile, scheme) pair a probability score (0–1).
The rule-based system filters; ML ranks.
"""

import os
import sys
import pickle
import warnings
import numpy as np
import pandas as pd

from sklearn.ensemble           import RandomForestClassifier
from sklearn.model_selection    import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing      import LabelEncoder
from sklearn.metrics            import (accuracy_score, classification_report,
                                        confusion_matrix, roc_auc_score)
from sklearn.utils.class_weight import compute_class_weight

warnings.filterwarnings('ignore')

# ── Paths ────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATASET_CSV = os.path.join(BASE_DIR, 'dataset.csv')
MODELS_DIR  = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)


# ════════════════════════════════════════════════════════════════════════
#  STEP 1 — Load & Validate Dataset
# ════════════════════════════════════════════════════════════════════════
def load_dataset(path: str) -> pd.DataFrame:
    """Load CSV and validate required columns."""
    print(f"\n{'='*60}")
    print("  STEP 1 — Loading Dataset")
    print(f"{'='*60}")

    df = pd.read_csv(path)

    required = ['age', 'income', 'gender', 'category', 'state', 'eligible']
    missing_cols = [c for c in required if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing columns in CSV: {missing_cols}")

    print(f"  ✓ Loaded {len(df)} rows × {len(df.columns)} columns")
    print(f"\n  Class distribution:")
    dist = df['eligible'].value_counts()
    for cls, cnt in dist.items():
        pct = cnt / len(df) * 100
        print(f"    Class {cls}: {cnt} rows ({pct:.1f}%)")

    print(f"\n  Sample data:")
    print(df.head(5).to_string(index=False))
    return df


# ════════════════════════════════════════════════════════════════════════
#  STEP 2 — Preprocessing & Encoding
# ════════════════════════════════════════════════════════════════════════
def preprocess(df: pd.DataFrame):
    """
    Encode categorical columns using LabelEncoder.
    Returns: (X, y, encoders_dict)
    Encoders are saved so prediction uses the SAME mapping.
    """
    print(f"\n{'='*60}")
    print("  STEP 2 — Preprocessing")
    print(f"{'='*60}")

    df = df.copy()

    # ── Lowercase + strip all string columns ──────────────────────
    for col in ['gender', 'category', 'state']:
        df[col] = df[col].astype(str).str.lower().str.strip()

    # ── Handle missing values ─────────────────────────────────────
    df['age']    = pd.to_numeric(df['age'],    errors='coerce').fillna(df['age'].median())
    df['income'] = pd.to_numeric(df['income'], errors='coerce').fillna(df['income'].median())

    # ── Feature Engineering ───────────────────────────────────────
    # These derived features help the RF model without exposing raw income
    df['income_lakh']    = df['income'] / 100000          # income in lakh units
    df['is_bpl']         = (df['income'] < 100000).astype(int)
    df['is_reserved']    = df['category'].isin(['sc', 'st', 'obc']).astype(int)
    df['is_senior']      = (df['age'] >= 60).astype(int)
    df['is_youth']       = (df['age'] <= 25).astype(int)
    df['age_income_ratio'] = df['age'] / (df['income_lakh'] + 0.1)  # avoid div/0

    # ── Label Encode categoricals ─────────────────────────────────
    encoders = {}
    for col in ['gender', 'category', 'state']:
        le = LabelEncoder()
        df[col + '_enc'] = le.fit_transform(df[col])
        encoders[col] = le
        print(f"  ✓ Encoded '{col}': {list(le.classes_)}")

    # ── Final feature matrix ──────────────────────────────────────
    feature_cols = [
        'age', 'income_lakh', 'is_bpl', 'is_reserved',
        'is_senior', 'is_youth', 'age_income_ratio',
        'gender_enc', 'category_enc', 'state_enc',
    ]

    X = df[feature_cols]
    y = df['eligible']

    print(f"\n  ✓ Feature matrix shape: {X.shape}")
    print(f"  ✓ Features: {feature_cols}")
    return X, y, encoders, feature_cols


# ════════════════════════════════════════════════════════════════════════
#  STEP 3 — Train Model
# ════════════════════════════════════════════════════════════════════════
def train_model(X: pd.DataFrame, y: pd.Series):
    """
    Train RandomForestClassifier with class_weight='balanced'
    to handle class imbalance without requiring external SMOTE library.
    """
    print(f"\n{'='*60}")
    print("  STEP 3 — Training RandomForest Model")
    print(f"{'='*60}")

    # Stratified split preserves class ratio in train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )
    print(f"  ✓ Train set: {len(X_train)} rows | Test set: {len(X_test)} rows")

    # ── Model Definition ──────────────────────────────────────────
    model = RandomForestClassifier(
        n_estimators=200,        # 200 trees for stable probabilities
        max_depth=8,             # prevent overfitting on small dataset
        min_samples_split=4,
        min_samples_leaf=2,
        max_features='sqrt',     # standard RF feature sampling
        class_weight='balanced', # handles imbalance without SMOTE
        random_state=42,
        n_jobs=-1,               # use all CPU cores
    )

    # ── Cross-Validation ──────────────────────────────────────────
    print("\n  Running 5-fold Stratified Cross-Validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring='roc_auc')
    print(f"  ✓ CV ROC-AUC: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # ── Final Training ────────────────────────────────────────────
    model.fit(X_train, y_train)
    print("  ✓ Model trained successfully")

    return model, X_train, X_test, y_train, y_test


# ════════════════════════════════════════════════════════════════════════
#  STEP 4 — Evaluate Model
# ════════════════════════════════════════════════════════════════════════
def evaluate_model(model, X_test, y_test, feature_cols):
    """Print full evaluation metrics."""
    print(f"\n{'='*60}")
    print("  STEP 4 — Model Evaluation")
    print(f"{'='*60}")

    y_pred      = model.predict(X_test)
    y_prob      = model.predict_proba(X_test)[:, 1]

    accuracy    = accuracy_score(y_test, y_pred)
    roc_auc     = roc_auc_score(y_test, y_prob)

    print(f"\n  Accuracy  : {accuracy:.4f}  ({accuracy*100:.1f}%)")
    print(f"  ROC-AUC   : {roc_auc:.4f}")

    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Not Eligible', 'Eligible']))

    print(f"  Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"    {'':12} Pred-0  Pred-1")
    print(f"    Actual-0   {cm[0][0]:4d}    {cm[0][1]:4d}")
    print(f"    Actual-1   {cm[1][0]:4d}    {cm[1][1]:4d}")

    # ── Feature Importances ───────────────────────────────────────
    print(f"\n  Feature Importances (top 10):")
    importances = pd.Series(model.feature_importances_, index=feature_cols)
    for feat, imp in importances.sort_values(ascending=False).items():
        bar = '█' * int(imp * 40)
        print(f"    {feat:25s} {imp:.4f}  {bar}")

    # ── Sample predictions ────────────────────────────────────────
    print(f"\n  Sample Predictions (first 5 test rows):")
    print(f"  {'Actual':8} {'Predicted':10} {'Score (prob)':12}")
    print(f"  {'-'*34}")
    for actual, pred, prob in zip(list(y_test)[:5], y_pred[:5], y_prob[:5]):
        flag = '✓' if actual == pred else '✗'
        print(f"  {actual:8}  {pred:10}  {prob:.4f}  {flag}")

    return accuracy, roc_auc


# ════════════════════════════════════════════════════════════════════════
#  STEP 5 — Save Model & Encoders
# ════════════════════════════════════════════════════════════════════════
def save_artifacts(model, encoders: dict, feature_cols: list):
    """Save model and all encoders as .pkl files."""
    print(f"\n{'='*60}")
    print("  STEP 5 — Saving Model & Encoders")
    print(f"{'='*60}")

    # Save model
    model_path = os.path.join(MODELS_DIR, 'model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"  ✓ Model saved   → {model_path}")

    # Save each encoder
    for col, le in encoders.items():
        path = os.path.join(MODELS_DIR, f'le_{col}.pkl')
        with open(path, 'wb') as f:
            pickle.dump(le, f)
        print(f"  ✓ Encoder saved → {path}")

    # Save feature column order (critical for consistent prediction)
    meta_path = os.path.join(MODELS_DIR, 'feature_cols.pkl')
    with open(meta_path, 'wb') as f:
        pickle.dump(feature_cols, f)
    print(f"  ✓ Feature cols  → {meta_path}")

    print(f"\n  All artifacts saved to: {MODELS_DIR}/")


# ════════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("\n" + "🤖 " * 20)
    print("  Government Scheme Finder — ML Training Pipeline")
    print("🤖 " * 20)

    df                             = load_dataset(DATASET_CSV)
    X, y, encoders, feature_cols   = preprocess(df)
    model, X_train, X_test, y_train, y_test = train_model(X, y)
    accuracy, roc_auc              = evaluate_model(model, X_test, y_test, feature_cols)
    save_artifacts(model, encoders, feature_cols)

    print(f"\n{'='*60}")
    print(f"  ✅ Training Complete!")
    print(f"  Accuracy: {accuracy*100:.1f}% | ROC-AUC: {roc_auc:.3f}")
    print(f"  Run the Flask API:  python server/app.py")
    print(f"{'='*60}\n")
