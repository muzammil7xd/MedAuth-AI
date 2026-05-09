"""
FastAPI main entry point for MedAuth AI backend
"""

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, Optional

from agent.graph import get_graph

app = FastAPI(title="MedAuth AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──────────────────────────────────────────────────

class ParseRequest(BaseModel):
    input: str

class SubmitPARequest(BaseModel):
    payer_id: str
    drug_id: str
    form_data: Dict[str, Any]
    patient_name: str

class AppealRequest(BaseModel):
    payer_id: str
    drug_id: str
    patient_name: str
    patient_age: int
    patient_gender: str
    diagnosis: str
    denial_reason: str
    prior_therapies: list[str] = []


# ── Health Check ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "MedAuth AI"}


# ── Core PA Agent Endpoint ─────────────────────────────────────────────────────

@app.post("/api/pa/analyze")
async def analyze_pa_request(req: ParseRequest):
    """
    Main endpoint: takes doctor's natural language input, runs the full
    LangGraph agent pipeline, and returns the dynamic UI schema.
    """
    graph = get_graph()

    initial_state = {
        "user_input": req.input,
        "parsed_clinical": None,
        "payer_data": None,
        "drug_data": None,
        "ui_schema": None,
        "appeal_letter": None,
        "denial_reason": None,
        "resolved_payer_id": None,
        "resolved_drug_id": None,
        "agent_step": "starting",
        "generate_appeal": False,
    }

    result = await graph.ainvoke(initial_state)

    return {
        "success": True,
        "parsed_clinical": result.get("parsed_clinical"),
        "ui_schema": result.get("ui_schema"),
        "payer": result.get("payer_data"),
        "drug": result.get("drug_data"),
        "agent_step": result.get("agent_step"),
    }


# ── Mock PA Submission ─────────────────────────────────────────────────────────

@app.post("/api/pa/submit")
async def submit_pa(req: SubmitPARequest):
    """
    Mock PA submission — returns deterministic approval/denial based on payer+drug.
    In production this would submit to the payer's portal.
    """
    import random

    # Deterministic mock logic
    approval_map = {
        ("bluecross_il", "humira"): "pending",
        ("aetna", "humira"): "approved",
        ("united", "keytruda"): "approved",
        ("bluecross_il", "ozempic"): "approved",
        ("aetna", "dupixent"): "pending",
        ("united", "enbrel"): "denied",
    }

    status = approval_map.get((req.payer_id, req.drug_id), "pending")

    messages = {
        "approved": f"PA approved for {req.patient_name}. Authorization code: MDA-{random.randint(10000,99999)}. Valid for 12 months.",
        "denied": f"PA denied for {req.patient_name}. Reason: Step therapy requirements not documented. You have 180 days to appeal.",
        "pending": f"PA submitted for {req.patient_name}. Tracking ID: TRK-{random.randint(100000,999999)}. Expected decision in 3-5 business days."
    }

    return {
        "success": True,
        "status": status,
        "message": messages[status],
        "tracking_id": f"MDA-{random.randint(100000,999999)}",
        "payer_id": req.payer_id,
        "drug_id": req.drug_id,
        "denial_reason": "Step therapy requirements not documented" if status == "denied" else None,
    }


# ── Appeal Generation ──────────────────────────────────────────────────────────

@app.post("/api/pa/appeal")
async def generate_appeal(req: AppealRequest):
    """
    Generate an AI-written appeal letter for a denied PA.
    """
    graph = get_graph()

    initial_state = {
        "user_input": f"Generate appeal for {req.patient_name}",
        "parsed_clinical": {
            "patient_name": req.patient_name,
            "patient_age": req.patient_age,
            "patient_gender": req.patient_gender,
            "diagnosis": req.diagnosis,
            "payer_id": req.payer_id,
            "drug_id": req.drug_id,
            "prior_therapies": req.prior_therapies,
        },
        "payer_data": None,
        "drug_data": None,
        "ui_schema": None,
        "appeal_letter": None,
        "denial_reason": req.denial_reason,
        "resolved_payer_id": req.payer_id,
        "resolved_drug_id": req.drug_id,
        "agent_step": "starting",
        "generate_appeal": True,
    }

    # Run payer + drug lookup nodes first, then appeal
    from agent.nodes import payer_lookup_node, drug_criteria_node, generate_appeal_node

    state = await payer_lookup_node(initial_state)
    state = await drug_criteria_node(state)
    state = await generate_appeal_node(state)

    return {
        "success": True,
        "appeal_letter": state.get("appeal_letter"),
    }


# ── Payer & Drug Info Endpoints ────────────────────────────────────────────────

@app.get("/api/payers")
async def get_payers():
    import json
    from pathlib import Path
    with open(Path(__file__).parent / "mock_data" / "payers.json") as f:
        data = json.load(f)
    return data

@app.get("/api/drugs")
async def get_drugs():
    import json
    from pathlib import Path
    with open(Path(__file__).parent / "mock_data" / "drugs.json") as f:
        data = json.load(f)
    return data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

