# MedAuth AI — Generative UI Hackathon Demo

> **AI-powered prior authorization** — one natural language input generates completely different, interactive PA forms for every payer/drug combination. Proving Generative UI is the only way to solve this problem.

---

## 🚀 Quick Start (2 commands)

### 1. Start the Backend (FastAPI + LangGraph Agent)

```bash
cd backend

# Add your OpenAI key
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Install deps (or use existing venv)
pip install -r requirements.txt

# Start
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 2. Start the Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:5173

---

## 🎬 Demo Script (3 inputs → 3 completely different UIs)

**Demo 1 — Blue Cross IL + Humira:**
```
Requesting Humira for John Doe, 45M, Crohn's disease, failed methotrexate and 6-MP, Blue Cross IL
```
→ **Blue gradient header** • 6 sections • Step therapy documentation • TB screening checklist • 3 required docs

**Demo 2 — Aetna + Humira:**
```
Humira for Jane Smith, 38F, Crohn's disease, failed methotrexate, Aetna insurance
```
→ **Purple gradient header** • Gastroenterologist attestation section (Aetna-specific) • Board cert required • Lab results required • 6 docs required

**Demo 3 — UnitedHealth + Keytruda:**
```
Keytruda for Robert Chen, 62M, Stage 3 non-small cell lung cancer, PD-L1 positive, UnitedHealth
```
→ **Orange gradient header** • Oncology flow • Biomarker testing panel (PD-L1, EGFR, ALK, KRAS) • Tumor board review section • Performance status • 6 documents

**Same drug, different payer = totally different app. That's Generative UI.**

---

## 🏗️ Architecture

```
Doctor Input (natural language)
        ↓
FastAPI /api/pa/analyze
        ↓
LangGraph Agent Pipeline:
  [Parse Node]     → GPT-4o extracts: patient, drug, payer, clinical history
  [Payer Lookup]   → fetches payer-specific PA requirements from mock_data/payers.json
  [Drug Criteria]  → fetches step therapy requirements from mock_data/drugs.json
  [UI Generator]   → GPT-4o maps clinical context → form schema + pre-filled values
        ↓
React Frontend:
  PAFormRenderer   → reads schema, renders correct sections/fields dynamically
  ClinicalCriteriaCard → AI analysis: met criteria, missing info, approval likelihood
  DocUploadSlots   → payer/drug-specific document requirements
  StatusDashboard  → submitted → pending → approved/denied
  AppealWorkflow   → AI-written appeal letter on denial
```

---

## 📁 Project Structure

```
medauth-ai/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DoctorInput.tsx         ← Natural language input + demo prompts
│       │   ├── PAFormRenderer.tsx      ← Dynamic form from agent schema
│       │   ├── ClinicalCriteriaCard.tsx← AI approval analysis
│       │   ├── DocUploadSlots.tsx      ← Payer-specific doc requirements
│       │   ├── StatusDashboard.tsx     ← PA status tracker
│       │   └── AppealWorkflow.tsx      ← Denial → AI appeal letter
│       ├── lib/
│       │   ├── api.ts                  ← Typed API client
│       │   └── utils.ts                ← Tailwind merge
│       └── App.tsx                     ← Main app state machine
│
└── backend/
    ├── agent/
    │   ├── graph.py                    ← LangGraph StateGraph pipeline
    │   ├── nodes.py                    ← 5 agent nodes
    │   └── prompts.py                  ← GPT-4o prompts
    ├── mock_data/
    │   ├── payers.json                 ← 3 payers with PA requirements
    │   ├── drugs.json                  ← 5 drugs with step therapy criteria
    │   └── pa_schemas.json             ← Form schemas keyed by payer__drug
    └── main.py                         ← FastAPI endpoints
```

---

## 🔑 Environment Variables

**Backend** (`backend/.env`):
```
OPENAI_API_KEY=sk-...
```

**Frontend** (`frontend/.env`) — optional, defaults use Vite proxy:
```
VITE_COPILOTKIT_API_URL=http://localhost:8000/copilotkit
```

---

## 📦 Key Dependencies

| Layer | Package | Purpose |
|-------|---------|---------|
| Frontend | React 18 + Vite | App framework |
| Frontend | Tailwind CSS v4 | Styling |
| Frontend | Framer Motion | UI animations during form generation |
| Frontend | React Hook Form + Zod | Dynamic form handling |
| Frontend | Lucide React | Icons |
| Backend | FastAPI + Uvicorn | API server |
| Backend | LangGraph | Agent pipeline orchestration |
| Backend | LangChain OpenAI | GPT-4o integration |
| Backend | Python-dotenv | Environment config |

---

## 💡 Why Generative UI Wins Here

Static apps can't handle this:
- **BlueCross IL** requires TB test date + step therapy proof + endoscopy report
- **Aetna** requires gastroenterologist attestation + board cert + 6-month clinical notes
- **UnitedHealth Keytruda** requires PD-L1 score + EGFR/ALK status + tumor board minutes

That's **3 completely different applications** for the same drug + diagnosis. A static form either shows everything (unusable) or shows nothing (useless). Generative UI renders **exactly the right form** for each case.

**14 hours/week of physician time saved. $35B/year in admin costs eliminated.**

