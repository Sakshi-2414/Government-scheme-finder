# 🇮🇳 Government Scheme Eligibility Finder

An AI-powered chatbot that helps Indian citizens discover government schemes they are eligible for — using NLP entity extraction, a rule-based eligibility engine, voice input, and a modern ChatGPT-style UI.

---

## 📸 Features

| Feature | Details |
|---|---|
| 🧠 NLP Processing | Custom Python entity extractor (income, age, gender, caste, occupation) |
| 🏛️ Rule Engine | 21 realistic government schemes with eligibility rules |
| 🎤 Voice Input | Web Speech API (Indian English) — click the mic button |
| 💬 Chatbot UI | ChatGPT-style bubbles, typing indicator, follow-up questions |
| 📊 Results Panel | Scheme cards with match score, benefits, apply links |
| 🔍 Entity Panel | Live display of extracted NLP entities |
| 🔎 Filter & Search | Search/filter matched schemes by keyword or category |

---

## 🗂️ Project Structure

```
govt-scheme-finder/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx            # Root component
│   │   ├── components/        # UI components
│   │   │   ├── Header.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── ChatBubble.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   ├── InputBar.jsx   # Text + voice input
│   │   │   ├── EntityPanel.jsx
│   │   │   ├── SchemesPanel.jsx
│   │   │   └── SchemeCard.jsx
│   │   ├── hooks/
│   │   │   ├── useChat.js     # Chat state management
│   │   │   └── useVoice.js    # Web Speech API hook
│   │   └── utils/
│   │       ├── api.js         # Backend API calls
│   │       └── format.js      # Text formatting helpers
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/
│   └── app.py                 # Flask REST API
│
├── nlp/
│   └── processor.py           # NLP + Rule engine (pure Python)
│
├── data/
│   └── schemes.json           # 21 government schemes dataset
│
├── requirements.txt           # Python dependencies
├── package.json               # Root scripts
└── README.md
```

---

## ⚙️ Tech Stack

- **Frontend**: React 18 + Vite + CSS Modules
- **Backend**: Python Flask (REST API)
- **NLP**: Custom regex pipeline (spaCy-compatible architecture)
- **Voice**: Web Speech API (browser-native, no API key needed)
- **Data**: JSON (easily swappable with MongoDB)

---

## 🚀 Installation & Running

### Prerequisites
- **Node.js** v18+ (for frontend)
- **Python** 3.9+ (for backend)
- **pip** (Python package manager)

---

### Step 1 — Install Python dependencies

```bash
# From project root
pip install -r requirements.txt
```

### Step 2 — Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### Step 3 — Start the Python backend

```bash
cd server
python app.py
```

The API will start at **http://localhost:5001**

### Step 4 — Start the React frontend (new terminal)

```bash
cd client
npm run dev
```

The app will open at **http://localhost:3000**

---

## 🧪 Testing the App

Open **http://localhost:3000** in Chrome (for voice support).

### Example inputs to try:

| Input | Expected schemes |
|---|---|
| `I am a 35 year old SC woman farmer from rural Bihar. Income 80,000 per year.` | PM Kisan, Ujjwala, NREGA, Ayushman Bharat, SC Scholarship |
| `I am 22 year old OBC male student, income 1.5 lakh` | OBC Scholarship, Skill India, MUDRA |
| `I am a 40 year old general category woman entrepreneur` | MUDRA, Stand Up India, Startup India, Jeevan Jyoti |
| `Daily wage labourer, 28 years old, rural village, income 60000` | NREGA, PM-SYM, Ration Card, PMAY Gramin |

### Voice input:
1. Click the 🎤 microphone button
2. Speak your situation in English
3. The text appears automatically and is sent for processing

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/greeting` | GET | Returns welcome message |
| `/api/process-input` | POST | Process user text, extract entities, match schemes |
| `/api/get-schemes` | GET | Return all 21 schemes |
| `/api/scheme/:id` | GET | Get a single scheme by ID |
| `/api/explain-scheme` | POST | Get conversational explanation of a scheme |
| `/api/reset` | POST | Reset session |
| `/api/health` | GET | Health check |

### POST `/api/process-input`
```json
{
  "text": "I am a 30 year old SC farmer with income 1 lakh",
  "sessionId": "uuid-string"
}
```

### Response
```json
{
  "sessionId": "...",
  "type": "schemes",
  "message": "Great news! I found 5 schemes...",
  "entities": {
    "income": 100000,
    "age": 30,
    "gender": null,
    "category": "sc",
    "occupation": ["farmer"],
    "missing_fields": ["gender"]
  },
  "schemes": [...]
}
```

---

## 🔮 Future Enhancements (Architecture is Ready)

The codebase is structured for easy upgrades:

| Upgrade | Where to change |
|---|---|
| Add spaCy NER model | Replace functions in `nlp/processor.py` |
| Add MongoDB for schemes | Replace `load_schemes()` in `processor.py` |
| Add ML eligibility scoring | Replace `check_scheme_eligibility()` |
| Add more schemes | Edit `data/schemes.json` |
| Add Whisper voice transcription | Replace Web Speech API in `useVoice.js` |
| Add user authentication | Add middleware in `server/app.py` |
| Add Hindi language support | Extend `processor.py` keyword lists |

---

## 🎯 Schemes Included (21 Total)

1. PM Kisan Samman Nidhi
2. PM Awas Yojana (Gramin)
3. PM Ujjwala Yojana
4. Ayushman Bharat PM-JAY
5. PM MUDRA Yojana
6. Sukanya Samriddhi Yojana
7. Post Matric Scholarship (SC)
8. Post Matric Scholarship (ST)
9. Post Matric Scholarship (OBC)
10. SVAMITVA Scheme
11. Startup India
12. Stand Up India
13. Kisan Credit Card
14. Beti Bachao Beti Padhao
15. Mahatma Gandhi NREGA
16. National Food Security Act (Ration)
17. PM Shram Yogi Maan-dhan
18. PM Kaushal Vikas Yojana (Skill India)
19. Nari Shakti Puraskar
20. PM Jeevan Jyoti Bima Yojana
21. PM Suraksha Bima Yojana

---

## 📝 License

MIT — free to use, modify and distribute.
