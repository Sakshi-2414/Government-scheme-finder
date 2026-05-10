"""
NLP Processing Module for Government Scheme Eligibility Finder
Uses spaCy + custom rule-based entity extraction
Designed to be replaceable with ML models in future
"""

import re
import json
import os
from typing import Dict, Any, Optional, List


# ─────────────────────────────────────────────
# Entity Extraction Pipeline
# ─────────────────────────────────────────────

INCOME_PATTERNS = [
    r'(?:income|earn|salary|wages?|per\s*(?:month|year|annum|pa))[^\d]*(\d[\d,]*(?:\.\d+)?)\s*(?:lakh|l|lac|thousand|k|rupees?|rs\.?|₹)?',
    r'(?:₹|rs\.?|rupees?)\s*(\d[\d,]*(?:\.\d+)?)\s*(?:lakh|l|lac|thousand|k)?',
    r'(\d[\d,]*(?:\.\d+)?)\s*(?:lakh|l|lac)\s*(?:income|salary|earn|per\s*(?:year|annum|month))?',
    r'(\d[\d,]*)\s*(?:per\s*(?:month|year)|monthly|annually)',
    r'(\d+)k\s*(?:income|salary|earn)?',
]

AGE_PATTERNS = [
    r'(?:i\s+am|age\s+is|aged?|my\s+age)[^\d]*(\d{1,2})\s*(?:years?|yrs?)?',
    r'(\d{1,2})\s*(?:years?\s*old|yr\s*old)',
    r'(?:^|\s)(\d{1,2})\s*(?:years?|yrs?)\s*(?:of\s*age|old)',
]

CATEGORY_KEYWORDS = {
    'sc': ['sc', 'scheduled caste', 'dalit', 'harijan'],
    'st': ['st', 'scheduled tribe', 'tribal', 'adivasi', 'vanvasi'],
    'obc': ['obc', 'other backward class', 'backward class', 'backward caste'],
    'general': ['general', 'open category', 'unreserved', 'forward caste', 'fc'],
    'ews': ['ews', 'economically weaker section'],
}

GENDER_KEYWORDS = {
    'female': ['female', 'woman', 'women', 'lady', 'girl', 'she', 'her', 'widow', 'housewife', 'mother'],
    'male': ['male', 'man', 'men', 'boy', 'he', 'his', 'father'],
}

OCCUPATION_KEYWORDS = {
    'farmer': ['farmer', 'farming', 'agriculture', 'kisan', 'cultivator', 'grower', 'crop'],
    'student': ['student', 'studying', 'college', 'school', 'university', 'course', 'degree'],
    'business': ['business', 'shop', 'shopkeeper', 'trade', 'merchant', 'retail', 'store'],
    'entrepreneur': ['startup', 'entrepreneur', 'startup founder', 'venture'],
    'labour': ['labour', 'laborer', 'labourer', 'worker', 'daily wage', 'construction', 'unskilled'],
    'self-employed': ['self-employed', 'self employed', 'freelancer', 'freelance', 'contractor'],
    'unemployed': ['unemployed', 'no job', 'jobless', 'looking for work', 'seeking job', 'dropout'],
    'government': ['government employee', 'govt job', 'civil servant', 'government service', 'sarkari'],
    'fisherman': ['fisherman', 'fishing', 'fisher'],
    'driver': ['driver', 'taxi', 'auto', 'rickshaw', 'cab', 'truck driver'],
    'street vendor': ['street vendor', 'vendor', 'hawker', 'peddler', 'street seller'],
    'domestic worker': ['domestic worker', 'maid', 'house help', 'servant', 'household worker'],
}

RESIDENCE_KEYWORDS = {
    'rural': ['rural', 'village', 'gram', 'panchayat', 'gaon', 'countryside'],
    'urban': ['urban', 'city', 'town', 'municipal', 'metro', 'district'],
}

INDIAN_STATES = [
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
    'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana',
    'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu',
    'kashmir', 'ladakh', 'chandigarh', 'puducherry', 'andaman', 'nicobar',
    'lakshadweep', 'dadra', 'daman', 'diu',
]


def normalize_income(value_str: str, unit: str = '') -> Optional[float]:
    """Convert income string to annual rupees"""
    try:
        value_str = value_str.replace(',', '')
        value = float(value_str)
        unit_lower = unit.lower() if unit else ''

        if 'lakh' in unit_lower or 'lac' in unit_lower or ' l' in unit_lower:
            return value * 100000
        elif 'thousand' in unit_lower or 'k' in unit_lower:
            return value * 1000
        elif value < 1000:
            # Likely in thousands (e.g. "50" meaning 50k)
            if value <= 100:
                return value * 12000  # Assume monthly
            return value * 1000
        elif value < 100000:
            # Could be monthly salary
            return value * 12
        else:
            return value
    except (ValueError, TypeError):
        return None


def extract_income(text: str) -> Optional[float]:
    text_lower = text.lower()
    for pattern in INCOME_PATTERNS:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            val = match.group(1)
            full_match = match.group(0)
            unit = ''
            if 'lakh' in full_match or 'lac' in full_match:
                unit = 'lakh'
            elif 'thousand' in full_match or 'k' in full_match:
                unit = 'thousand'
            return normalize_income(val, unit)
    return None


def extract_age(text: str) -> Optional[int]:
    text_lower = text.lower()
    for pattern in AGE_PATTERNS:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            age = int(match.group(1))
            if 5 <= age <= 100:
                return age
    # Fallback: look for standalone 2-digit number near age keywords
    age_context = re.search(r'(?:age|old|year)[^\d]*(\d{1,2})', text_lower)
    if age_context:
        age = int(age_context.group(1))
        if 5 <= age <= 100:
            return age
    return None


def extract_gender(text: str) -> Optional[str]:
    text_lower = text.lower()
    for gender, keywords in GENDER_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                return gender
    return None


def extract_category(text: str) -> Optional[str]:
    text_lower = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                return category
    return None


def extract_occupation(text: str) -> List[str]:
    text_lower = text.lower()
    found = []
    for occupation, keywords in OCCUPATION_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                if occupation not in found:
                    found.append(occupation)
                break
    return found


def extract_residence(text: str) -> Optional[str]:
    text_lower = text.lower()
    for res_type, keywords in RESIDENCE_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                return res_type
    return None


def extract_state(text: str) -> Optional[str]:
    text_lower = text.lower()
    for state in INDIAN_STATES:
        if state in text_lower:
            return state.title()
    return None


def extract_has_daughter(text: str) -> Optional[bool]:
    text_lower = text.lower()
    patterns = [
        r'\bdaughter\b', r'\bgirl\s*child\b', r'\bbeti\b',
        r'\bgirl\s*baby\b', r'\bfemale\s*child\b'
    ]
    for p in patterns:
        if re.search(p, text_lower):
            return True
    return None


def extract_bpl(text: str) -> Optional[bool]:
    text_lower = text.lower()
    bpl_keywords = ['bpl', 'below poverty line', 'below poverty', 'very poor', 'ration card', 'antyodaya']
    for kw in bpl_keywords:
        if kw in text_lower:
            return True
    return None


# ─────────────────────────────────────────────
# Main NLP Pipeline
# ─────────────────────────────────────────────

def process_text(text: str) -> Dict[str, Any]:
    """
    Main NLP processing function.
    Extracts all relevant entities from user input text.

    Future: Replace internals with spaCy NER + ML classifiers
    """
    entities = {
        'income': extract_income(text),
        'age': extract_age(text),
        'gender': extract_gender(text),
        'category': extract_category(text),
        'occupation': extract_occupation(text),
        'residence': extract_residence(text),
        'state': extract_state(text),
        'has_daughter': extract_has_daughter(text),
        'bpl': extract_bpl(text),
        'raw_text': text,
    }

    # Infer BPL from income
    if entities['bpl'] is None and entities['income'] is not None:
        if entities['income'] <= 100000:
            entities['bpl'] = True
        else:
            entities['bpl'] = False

    # Detect missing critical fields
    entities['missing_fields'] = detect_missing_fields(entities)

    return entities


def detect_missing_fields(entities: Dict[str, Any]) -> List[str]:
    """Identify which fields are missing for better scheme matching"""
    missing = []
    critical_fields = {
        'income': 'annual income',
        'age': 'age',
        'gender': 'gender',
        'category': 'caste category (General/SC/ST/OBC)',
        'occupation': 'occupation',
    }
    for field, label in critical_fields.items():
        value = entities.get(field)
        if value is None or (isinstance(value, list) and len(value) == 0):
            missing.append(label)
    return missing


# ─────────────────────────────────────────────
# Rule-Based Eligibility Engine
# ─────────────────────────────────────────────

def load_schemes() -> List[Dict]:
    """Load schemes from JSON. Future: Replace with DB query"""
    schemes_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'schemes.json')
    with open(schemes_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def check_scheme_eligibility(scheme: Dict, user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rule-based eligibility checker for a single scheme.
    Returns match result with score and reasons.

    Future: Replace with ML scoring model trained on past eligibility data.
    """
    rules = scheme.get('eligibility', {})
    reasons_passed = []
    reasons_failed = []
    score = 0
    total_rules = 0

    # Income check
    if rules.get('max_income') is not None:
        total_rules += 1
        user_income = user.get('income')
        if user_income is not None:
            if user_income <= rules['max_income']:
                score += 1
                reasons_passed.append(f"Income ₹{int(user_income):,} ≤ ₹{int(rules['max_income']):,} limit ✓")
            else:
                reasons_failed.append(f"Income ₹{int(user_income):,} exceeds ₹{int(rules['max_income']):,} limit ✗")
        else:
            score += 0.5  # Give partial credit if income unknown

    # Age check
    user_age = user.get('age')
    if rules.get('min_age') is not None and user_age is not None:
        total_rules += 1
        if user_age >= rules['min_age']:
            score += 1
            reasons_passed.append(f"Age {user_age} ≥ minimum {rules['min_age']} ✓")
        else:
            reasons_failed.append(f"Age {user_age} < minimum {rules['min_age']} ✗")
            return {'eligible': False, 'score': 0, 'reasons_failed': reasons_failed, 'reasons_passed': reasons_passed}
    if rules.get('max_age') is not None and user_age is not None:
        total_rules += 1
        if user_age <= rules['max_age']:
            score += 1
            reasons_passed.append(f"Age {user_age} ≤ maximum {rules['max_age']} ✓")
        else:
            reasons_failed.append(f"Age {user_age} > maximum {rules['max_age']} ✗")
            return {'eligible': False, 'score': 0, 'reasons_failed': reasons_failed, 'reasons_passed': reasons_passed}

    # Gender check
    if rules.get('gender'):
        total_rules += 1
        user_gender = user.get('gender')
        if user_gender and user_gender in rules['gender']:
            score += 1
            reasons_passed.append(f"Gender '{user_gender}' is eligible ✓")
        elif user_gender:
            reasons_failed.append(f"Gender '{user_gender}' not eligible ✗")
            return {'eligible': False, 'score': 0, 'reasons_failed': reasons_failed, 'reasons_passed': reasons_passed}
        else:
            score += 0.5  # Gender unknown

    # Category check
    if rules.get('categories'):
        total_rules += 1
        user_cat = user.get('category')
        if user_cat and user_cat.lower() in [c.lower() for c in rules['categories']]:
            score += 1
            reasons_passed.append(f"Category '{user_cat.upper()}' is eligible ✓")
        elif user_cat:
            reasons_failed.append(f"Category '{user_cat.upper()}' not eligible ✗")
            return {'eligible': False, 'score': 0, 'reasons_failed': reasons_failed, 'reasons_passed': reasons_passed}
        else:
            score += 0.5  # Category unknown

    # Occupation check
    if rules.get('occupation'):
        total_rules += 1
        user_occupations = user.get('occupation', [])
        if user_occupations:
            if any(occ.lower() in [o.lower() for o in rules['occupation']] for occ in user_occupations):
                score += 1
                reasons_passed.append(f"Occupation matches scheme requirements ✓")
            else:
                reasons_failed.append(f"Occupation does not match scheme requirements ✗")
                return {'eligible': False, 'score': 0, 'reasons_failed': reasons_failed, 'reasons_passed': reasons_passed}
        else:
            score += 0.5

    # BPL check
    if rules.get('bpl'):
        total_rules += 1
        user_bpl = user.get('bpl')
        if user_bpl:
            score += 1
            reasons_passed.append("Meets BPL/low income criteria ✓")
        elif user_bpl is False:
            reasons_failed.append("Does not meet BPL criteria ✗")

    # Residence check
    if rules.get('residence'):
        total_rules += 1
        user_res = user.get('residence')
        if user_res and user_res.lower() == rules['residence'].lower():
            score += 1
            reasons_passed.append(f"Residence type '{user_res}' matches ✓")
        elif user_res:
            reasons_failed.append(f"Scheme requires '{rules['residence']}' residence ✗")
            return {'eligible': False, 'score': 0, 'reasons_failed': reasons_failed, 'reasons_passed': reasons_passed}
        else:
            score += 0.5

    # Has daughter check
    if rules.get('has_daughter'):
        total_rules += 1
        if user.get('has_daughter'):
            score += 1
            reasons_passed.append("Has a daughter (girl child) ✓")
        else:
            score += 0.3  # Not necessarily disqualifying

    # SC/ST or female check (for Stand Up India)
    if rules.get('sc_st_or_female'):
        total_rules += 1
        user_cat = user.get('category', '')
        user_gender = user.get('gender', '')
        if user_cat in ['sc', 'st'] or user_gender == 'female':
            score += 1
            reasons_passed.append("Eligible as SC/ST or woman entrepreneur ✓")

    match_percentage = (score / total_rules * 100) if total_rules > 0 else 50
    eligible = len(reasons_failed) == 0 and match_percentage >= 40

    return {
        'eligible': eligible,
        'score': round(match_percentage, 1),
        'reasons_passed': reasons_passed,
        'reasons_failed': reasons_failed,
    }


def find_eligible_schemes(user_entities: Dict[str, Any]) -> List[Dict]:
    """
    Main eligibility matching function.
    Returns list of eligible schemes with scores and reasons.
    """
    schemes = load_schemes()
    results = []

    for scheme in schemes:
        check = check_scheme_eligibility(scheme, user_entities)
        if check['eligible']:
            results.append({
                **scheme,
                'match_score': check['score'],
                'reasons_passed': check['reasons_passed'],
                'reasons_failed': check['reasons_failed'],
            })

    # Sort by match score (best matches first)
    results.sort(key=lambda x: x['match_score'], reverse=True)
    return results


# ─────────────────────────────────────────────
# Conversational Context Manager
# ─────────────────────────────────────────────

def merge_entities(existing: Dict, new_text: str) -> Dict:
    """
    Merge new entities extracted from follow-up messages
    with previously extracted entities.
    Allows incremental entity building across conversation turns.
    """
    new_entities = process_text(new_text)

    # Merge: only update None values
    merged = dict(existing)
    for key, value in new_entities.items():
        if key in ('missing_fields', 'raw_text'):
            continue
        if value is not None and (merged.get(key) is None or (isinstance(merged.get(key), list) and len(merged.get(key)) == 0)):
            merged[key] = value

    # Recompute missing fields
    merged['missing_fields'] = detect_missing_fields(merged)
    merged['raw_text'] = (existing.get('raw_text', '') + ' ' + new_text).strip()
    return merged


# ─────────────────────────────────────────────
# Flask HTTP entry point
# ─────────────────────────────────────────────

if __name__ == '__main__':
    # Quick test
    test_input = "I am a 35 year old female farmer from rural Rajasthan. I belong to SC category. My income is 1.5 lakh per year."
    result = process_text(test_input)
    print("Extracted Entities:")
    for k, v in result.items():
        if k != 'raw_text':
            print(f"  {k}: {v}")
    print("\nEligible Schemes:")
    schemes = find_eligible_schemes(result)
    for s in schemes[:5]:
        print(f"  [{s['match_score']}%] {s['name']}")
