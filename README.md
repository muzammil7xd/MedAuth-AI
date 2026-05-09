# MedAuth AI — Generative UI Hackathon

> **AI-powered prior authorization** — one natural language input generates completely different, interactive PA forms for every payer/drug combination, streamed live via AG-UI protocol.

---

## 🚀 Quick Start

### 1. Start the Backend (FastAPI + LangGraph + Gemini)

```bash
cd backend
echo "GOOGLE_API_KEY=your_key_here" > .env
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend: http://localhost:8000 · API docs: http://localhost:8000/docs

### 2. Start the Frontend (React + Vite + CopilotKit)

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## 🎬 Demo Script — 3 Inputs → 3 Completely Different UIs

**Demo 1 — Blue Cross IL + Humira:**
```
Requesting Humira for John Doe, 45M, Crohn's disease, failed methotrexate and 6-MP, Blue Cross IL
```
→ **Blue** header · 6 sections · Step therapy proof · TB screening checklist · 4 required docs

**Demo 2 — Aetna + Humira:**
```
Humira for Jane Smith, 38F, Crohn's disease, failed methotrexate, Aetna insurance
```
→ **Purple** header · Gastroenterologist attestation section (Aetna-exclusive) · Board cert · Lab results · 6 docs

**Demo 3 — UnitedHealth + Keytruda:**
```
Keytruda for Robert Chen, 62M, Stage 3 non-small cell lung cancer, PD-L1 positive, UnitedHealth
```
→ **Orange** header · Oncology flow · PD-L1/EGFR/ALK biomarker panel · Tumor board review · 6 docs

**Same drug. Same diagnosis. Three completely different applications rendered live. That's Generative UI.**

---

## 🧠 How AG-UI + CopilotKit Work Here

### The AG-UI Streaming Flow

```
Doctor types clinical input
        │
        ▼
runAgent(input)                     ← useAgentUI hook (React)
        │
        ▼
POST /copilotkit                    ← CopilotKit SSE channel opens
        │
        ▼
LangGraph Pipeline (FastAPI backend)
┌──────────────────────────────────────────────────────────────────┐
│ ck_parse_node     → copilotkit_emit_state("parsing")            │ ──→ SSE → agentState updates live
│ ck_payer_node     → copilotkit_emit_state("payer_ready")        │ ──→ SSE → loading step animates
│ ck_drug_node      → copilotkit_emit_state("drug_ready")         │ ──→ SSE → loading step animates
│ ck_ui_generator   → copilotkit_emit_state("ui_ready", schema)   │ ──→ SSE → FORM MATERIALIZES
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
useCoAgentStateRender fires         ← receives each SSE emit in real-time
onFormReady(agentState)
        │
        ▼
PAFormRenderer renders              ← completely different UI per payer/drug
```

### The Three CopilotKit Hooks

| Hook | File | What it does |
|------|------|-------------|
| `useCoAgent("medauth_agent")` | `useAgentUI.ts` | Two-way state sync — mirrors LangGraph state in React in real-time via AG-UI SSE |
| `useCoAgentStateRender()` | `useAgentUI.ts` | Fires on every `copilotkit_emit_state()` call — drives live loading step animation and triggers form render |
| `useCopilotAction("updateAgentState")` | `useAgentUI.ts` | Registers a frontend action the agent/chat can call to update form fields mid-flow |

### Backend: `copilotkit_agent.py`

Each LangGraph node is wrapped to emit state at each step:

```python
# Every node emits progress via AG-UI Server-Sent Events
async def ck_parse_node(state: MedAuthCopilotState):
    await copilotkit_emit_state(state, {"agent_step": "parsing"})       # → React sees this immediately
    result = await parse_clinical_input_node(state)
    await copilotkit_emit_state(state, {                                  # → React sees parsed data
        "agent_step": "parsed",
        "parsed_clinical": result.get("parsed_clinical"),
    })
    return result

async def ck_ui_generator_node(state: MedAuthCopilotState):
    await copilotkit_emit_state(state, {"agent_step": "generating_ui"})
    result = await ui_schema_generator_node(state)
    await copilotkit_emit_state(state, {                                  # → React renders the form
        "agent_step": "ui_ready",
        "ui_schema": result.get("ui_schema"),                             #   THIS is Generative UI
    })
    await copilotkit_exit(state)                                          # → stream ends cleanly
    return result
```

`MedAuthCopilotState` extends `CopilotKitState` which adds:
- `messages` — LangChain chat message history (for the sidebar chat)
- `copilotkit` — internal CopilotKit config (actions registry, emit helpers)

### Frontend: `main.tsx` — The Entry Point

```tsx
// <CopilotKit> opens the AG-UI SSE connection to /copilotkit
// Every useCoAgent / useCoAgentStateRender hook inside the tree
// receives real-time state updates from the LangGraph agent
<CopilotKit runtimeUrl="/copilotkit" agent="medauth_agent">
  <App />
</CopilotKit>
```

### Frontend: `useAgentUI.ts` — The AG-UI Hook

```typescript
// Two-way state sync with the LangGraph agent
const { state: agentState, run, stop } = useCoAgent<AgentState>({
  name: 'medauth_agent',  // must match LangGraphAgent name in main.py
})

// Fires on EVERY copilotkit_emit_state() call from the backend
useCoAgentStateRender({
  name: 'medauth_agent',
  render: ({ state }) => {
    if (state?.agent_step === 'ui_ready' && state?.ui_schema) {
      onFormReady(state)   // → App transitions to form view
    }
    return null
  },
})

// Frontend action the agent/chat can call to update form fields
useCopilotAction({
  name: 'updateAgentState',
  handler: ({ field, value }) => {
    setAgentState({ ...agentState, [field]: value })
  },
})
```

### Backend: `main.py` — The CopilotKit Endpoint

```python
# /copilotkit endpoint = the AG-UI SSE connection point
sdk = CopilotKitSDK(agents=[
    LangGraphAgent(
        name="medauth_agent",            # matched by useCoAgent("medauth_agent")
        description="Prior auth AI...",
        graph=get_copilotkit_graph(),    # the CopilotKit-aware LangGraph
    )
])
add_fastapi_endpoint(app, sdk, "/copilotkit")
```

### The CopilotKit Chat Sidebar

The **"AI Assistant"** button opens `<CopilotSidebar>` — a conversational interface to the same agent. Doctors can say:
- *"Change the payer to Aetna"* → `updateAgentState()` fires → form updates
- *"The patient also failed azathioprine"* → agent can re-analyze
- *"Generate the appeal letter"* → triggers the appeal flow

All through the same `/copilotkit` SSE channel — the chat **is** the agent stream made visible.

### Why This Needs Generative UI

Every payer × drug combination is a completely different form:

| Combination | Unique Requirements |
|-------------|---------------------|
| Humira + Blue Cross IL | Step therapy proof, TB test date, endoscopy report |
| Humira + Aetna | All of above + **gastroenterologist attestation** + board cert number + 6-month clinical notes |
| Keytruda + UnitedHealth | Completely different — PD-L1 TPS score, EGFR/ALK/ROS1 status, **tumor board meeting minutes**, ECOG performance status |

A static form can't handle this. The agent reads the clinical context and **generates the exact right form** as a streamed UI schema.

---

## 🏗️ Architecture

```
medauth-ai/
├── backend/
│   ├── main.py                      ← FastAPI: REST endpoints + /copilotkit AG-UI endpoint
│   ├── agent/
│   │   ├── copilotkit_agent.py      ← LangGraph nodes with copilotkit_emit_state() streaming
│   │   ├── graph.py                 ← Standard LangGraph pipeline (REST fallback)
│   │   ├── nodes.py                 ← Parse → Payer → Drug → UI Schema → Appeal nodes
│   │   └── prompts.py               ← Gemini 2.0 Flash prompts
│   └── mock_data/
│       ├── payers.json              ← BlueCross IL, Aetna, UnitedHealth PA requirements
│       ├── drugs.json               ← Humira, Keytruda, Ozempic, Dupixent, Enbrel criteria
│       └── pa_schemas.json          ← Full form schemas keyed by payer__drug
│
└── frontend/
    └── src/
        ├── main.tsx                 ← <CopilotKit runtimeUrl="/copilotkit"> wraps app
        ├── App.tsx                  ← State machine + live AG-UI step labels + CopilotSidebar
        ├── hooks/
        │   └── useAgentUI.ts        ← useCoAgent + useCoAgentStateRender + useCopilotAction
        ├── lib/
        │   ├── api.ts               ← Typed REST client (fallback when CopilotKit unavailable)
        │   └── utils.ts             ← Tailwind merge
        └── components/
            ├── DoctorInput.tsx      ← Natural language input + demo prompts
            ├── PAFormRenderer.tsx   ← Renders agent-generated form schema dynamically
            ├── ClinicalCriteriaCard.tsx ← AI approval analysis (met criteria, missing info)
            ├── DocUploadSlots.tsx   ← Payer-specific document upload requirements
            ├── StatusDashboard.tsx  ← PA status tracker (pending → approved/denied)
            └── AppealWorkflow.tsx   ← Denial → AI appeal letter generation
```

---

## 🔑 Environment Variables

**Backend** (`backend/.env`):
```
GOOGLE_API_KEY=your_google_ai_studio_key
```
> Get a free key at https://aistudio.google.com/apikey
> The app runs in **demo mode** (rule-based fallback) if quota is exceeded — all 3 payer forms still work.

---

## 📦 Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React 18 + Vite + TypeScript | App framework |
| Styling | Tailwind CSS v4 | Utility-first styling |
| Animation | Framer Motion | Form materialization transitions |
| Agent UI | **CopilotKit** (`useCoAgent`, `useCoAgentStateRender`, `useCopilotAction`) | AG-UI streaming + chat sidebar |
| Transport | **AG-UI Protocol** (via CopilotKit SSE) | Real-time agent → UI event streaming |
| Forms | React Hook Form | Dynamic form handling |
| Backend | FastAPI + Uvicorn | API server |
| Agent | **LangGraph** | Multi-node agent pipeline orchestration |
| LLM | **Google Gemini 2.0 Flash** | Clinical parsing + UI schema generation |
| LLM Integration | LangChain Google GenAI | Gemini API wrapper |
