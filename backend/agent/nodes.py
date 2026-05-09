"""
Agent nodes for the MedAuth AI LangGraph pipeline
Includes full demo-mode fallback when LLM quota is exceeded
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from .prompts import PARSE_CLINICAL_INPUT_PROMPT, GENERATE_UI_SCHEMA_PROMPT, GENERATE_APPEAL_PROMPT

DATA_DIR = Path(__file__).parent.parent / "mock_data"

def _load_json(filename: str) -> dict:
    with open(DATA_DIR / filename, "r") as f:
        return json.load(f)

PAYERS_DATA = _load_json("payers.json")
DRUGS_DATA = _load_json("drugs.json")
PA_SCHEMAS_DATA = _load_json("pa_schemas.json")

def _get_payer(payer_id: str) -> dict | None:
    for p in PAYERS_DATA["payers"]:
        if p["id"] == payer_id:
            return p
    return None

def _get_drug(drug_id: str) -> dict | None:
    for d in DRUGS_DATA["drugs"]:
        if d["id"] == drug_id:
            return d
    return None

def _get_pa_schema(payer_id: str, drug_id: str) -> dict | None:
    return PA_SCHEMAS_DATA["schemas"].get(f"{payer_id}__{drug_id}")

def _get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0,
        google_api_key=os.environ.get("GOOGLE_API_KEY"),
        max_retries=0,  # Immediately fall back to demo mode on any error
    )

async def _invoke_llm(prompt: str) -> str | None:
    try:
        llm = _get_llm()
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
        return raw
    except Exception as e:
        err = str(e)[:80]
        if "RESOURCE_EXHAUSTED" in err or "429" in err:
            print(f"[Demo mode] Gemini quota exceeded — using rule-based fallback")
        else:
            print(f"[Demo mode] LLM unavailable ({type(e).__name__}) — using rule-based fallback")
        return None

def _parse_input_without_llm(user_input: str) -> dict:
    text = user_input.lower()
    drug_map = {
        "humira": "humira", "adalimumab": "humira",
        "keytruda": "keytruda", "pembrolizumab": "keytruda",
        "ozempic": "ozempic", "semaglutide": "ozempic",
        "dupixent": "dupixent", "dupilumab": "dupixent",
        "enbrel": "enbrel", "etanercept": "enbrel",
    }
    drug_id = next((v for k, v in drug_map.items() if k in text), "humira")
    payer_map = {
        "blue cross": "bluecross_il", "bcbs": "bluecross_il",
        "aetna": "aetna",
        "united": "united", "uhc": "united",
    }
    payer_id = next((v for k, v in payer_map.items() if k in text), "bluecross_il")
    payer_names = {"bluecross_il": "Blue Cross Blue Shield of Illinois", "aetna": "Aetna", "united": "UnitedHealthcare"}
    drug_names = {"humira": "Humira", "keytruda": "Keytruda", "ozempic": "Ozempic", "dupixent": "Dupixent", "enbrel": "Enbrel"}

    name_match = re.search(r'for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', user_input)
    patient_name = name_match.group(1) if name_match else "Patient"
    age_match = re.search(r'(\d{2,3})\s*[mfMF]', user_input) or re.search(r'(\d{2,3})\s*(?:year|yr)', user_input)
    patient_age = int(age_match.group(1)) if age_match else 45
    patient_gender = "F" if re.search(r'\b\d+[Ff]\b|\bfemale\b|\bwoman\b', user_input) else "M"

    diag_map = {
        "crohn": ("Crohn's Disease", "K50.90"),
        "ulcerative colitis": ("Ulcerative Colitis", "K51.90"),
        "rheumatoid arthritis": ("Rheumatoid Arthritis", "M05.79"),
        "psoriasis": ("Plaque Psoriasis", "L40.0"),
        "lung cancer": ("Non-Small Cell Lung Cancer", "C34.90"),
        "nsclc": ("Non-Small Cell Lung Cancer", "C34.90"),
        "melanoma": ("Melanoma", "C43.9"),
        "diabetes": ("Type 2 Diabetes Mellitus", "E11.9"),
        "atopic": ("Atopic Dermatitis", "L20.9"),
    }
    diagnosis, icd10 = ("Crohn's Disease", "K50.90")
    for k, v in diag_map.items():
        if k in text:
            diagnosis, icd10 = v
            break

    therapy_map = {
        "methotrexate": "methotrexate",
        "6-mp": "6-MP (mercaptopurine)",
        "mercaptopurine": "6-MP (mercaptopurine)",
        "azathioprine": "azathioprine",
        "remicade": "Remicade (infliximab)",
        "prednisone": "prednisone",
    }
    prior_therapies = [v for k, v in therapy_map.items() if k in text]

    return {
        "patient_name": patient_name, "patient_age": patient_age,
        "patient_gender": patient_gender,
        "drug_name": drug_names.get(drug_id, drug_id), "drug_id": drug_id,
        "diagnosis": diagnosis, "diagnosis_icd10": icd10,
        "payer_name": payer_names.get(payer_id, payer_id), "payer_id": payer_id,
        "prior_therapies": prior_therapies,
        "clinical_notes": user_input, "parsed_by": "demo_mode"
    }

def _build_prefilled_values(parsed: dict) -> dict:
    values = {}
    if parsed.get("patient_name") and parsed["patient_name"] != "Patient":
        values["patient_name"] = parsed["patient_name"]
    if parsed.get("patient_age"):
        values["patient_age"] = str(parsed["patient_age"])
    if parsed.get("diagnosis"):
        values["primary_diagnosis"] = parsed["diagnosis"]
    if parsed.get("diagnosis_icd10"):
        values["icd10_code"] = parsed["diagnosis_icd10"]
    prior = [t.lower() for t in parsed.get("prior_therapies", [])]
    if any("methotrexate" in p for p in prior):
        values["methotrexate_tried"] = True
    if any("6-mp" in p or "mercaptopurine" in p for p in prior):
        values["6mp_tried"] = True
    return values

def _build_demo_analysis(parsed: dict, payer_data: dict, drug_data: dict) -> dict:
    prior = [t.lower() for t in parsed.get("prior_therapies", [])]
    step_req = drug_data.get("step_therapy", {}).get("required_prior_therapies", [])
    met, missing = [], []

    if parsed.get("patient_name") and parsed["patient_name"] != "Patient":
        met.append(f"Patient identified: {parsed['patient_name']}, {parsed.get('patient_age')}yo {parsed.get('patient_gender')}")
    if parsed.get("diagnosis"):
        met.append(f"Diagnosis documented: {parsed['diagnosis']} ({parsed.get('diagnosis_icd10','')})")
    if payer_data.get("name"):
        met.append(f"Payer confirmed: {payer_data.get('name')}")

    therapies_met = 0
    for t in step_req:
        keyword = t.lower().split("(")[0].strip().split()[0]
        if any(keyword in p for p in prior):
            met.append(f"Prior therapy documented: {t} — failure/intolerance")
            therapies_met += 1
        else:
            missing.append(f"Step therapy documentation required: {t}")

    if not parsed.get("patient_name") or parsed["patient_name"] == "Patient":
        missing.append("Patient full name not detected — please enter manually")

    special = []
    reqs = payer_data.get("pa_requirements", {})
    if reqs.get("gastro_attestation_required"):
        special.append("Aetna requires a Gastroenterologist Attestation Form — specialist must co-sign")
    if reqs.get("tumor_board_required"):
        special.append("UnitedHealthcare requires Tumor Board Review documentation")
    if reqs.get("biomarker_testing_required"):
        special.append("Biomarker testing results required (PD-L1, EGFR, ALK) before submission")
    if reqs.get("peer_to_peer_available"):
        special.append(f"Peer-to-peer review available — call {payer_data.get('phone','payer')}")

    likelihood = "high" if therapies_met >= 1 and len(missing) <= 1 else \
                 "medium" if therapies_met >= 1 else "low"
    reasoning = {
        "high": f"{parsed.get('patient_name','Patient')} meets prior therapy requirements. {payer_data.get('name')} typically approves in {payer_data.get('avg_processing_days')} days with complete documentation.",
        "medium": f"Some step therapy is documented but additional requirements remain. {payer_data.get('name')} may request peer-to-peer review.",
        "low": f"Missing step therapy documentation. {payer_data.get('name')} requires evidence of prior therapy failures before approving {drug_data.get('name')}.",
    }
    return {
        "prefilled_values": _build_prefilled_values(parsed),
        "met_criteria": met, "missing_info": missing,
        "approval_likelihood": likelihood,
        "approval_reasoning": reasoning[likelihood],
        "special_requirements": special,
        "estimated_decision_days": payer_data.get("avg_processing_days", 5)
    }

def _build_demo_appeal(parsed: dict, payer_data: dict, drug_data: dict, denial_reason: str) -> str:
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    patient = parsed.get("patient_name", "Patient")
    drug = drug_data.get("name", "requested medication")
    generic = drug_data.get("generic", "")
    diagnosis = parsed.get("diagnosis", "documented condition")
    payer = payer_data.get("name", "Insurance Company")
    fax = payer_data.get("fax", "N/A")
    prior = parsed.get("prior_therapies", [])
    prior_str = "\n".join(f"  - {t}" for t in prior) if prior else "  - Conventional therapies as clinically appropriate"
    return f"""{today}

Medical Appeals Department
{payer}  |  Fax: {fax}

RE: FORMAL APPEAL — PRIOR AUTHORIZATION DENIAL
Patient: {patient}  |  Medication: {drug} ({generic})
Denial Reason: {denial_reason}

To Whom It May Concern:

I am writing on behalf of my patient, {patient}, to formally appeal the denial of prior
authorization for {drug}. This patient carries a confirmed diagnosis of {diagnosis} and
has exhausted appropriate step therapy per your formulary guidelines.

PRIOR THERAPY HISTORY:
{prior_str}

Despite these treatment attempts, the patient continues to experience significant disease
activity substantially impairing quality of life and functional capacity. {drug} represents
the medically necessary next step in this patient's treatment.

Clinical guidelines from specialty societies support {drug} initiation in patients who have
demonstrated inadequate response to conventional therapies. This patient meets published criteria.

REQUESTED RESOLUTION:
1. Immediate reversal of the prior authorization denial
2. Expedited review given clinical urgency
3. Peer-to-peer physician review if required — please contact our office to schedule

Respectfully,

_________________________________
Prescribing Physician  |  Date: {today}

Enclosures: Clinical notes, lab results, step therapy documentation, LMN"""

def _build_generic_schema(payer_data: dict, drug_data: dict) -> dict:
    return {
        "payer_id": payer_data.get("id", "unknown"),
        "drug_id": drug_data.get("id", "unknown"),
        "form_title": f"{payer_data.get('name','Payer')} — {drug_data.get('name','Drug')} Prior Authorization",
        "sections": [
            {"id": "patient_info", "title": "Patient Information", "icon": "user", "fields": [
                {"id": "patient_name", "label": "Patient Full Name", "type": "text", "required": True},
                {"id": "patient_dob", "label": "Date of Birth", "type": "date", "required": True},
                {"id": "member_id", "label": "Member ID", "type": "text", "required": True},
            ]},
            {"id": "clinical", "title": "Clinical Information", "icon": "clipboard", "fields": [
                {"id": "primary_diagnosis", "label": "Primary Diagnosis", "type": "text", "required": True},
                {"id": "icd10_code", "label": "ICD-10 Code", "type": "text", "required": True},
                {"id": "clinical_notes", "label": "Clinical Notes", "type": "textarea", "required": True},
            ]}
        ],
        "required_documents": [
            {"id": "lmn", "label": "Letter of Medical Necessity", "description": "Signed by prescribing physician", "required": True},
            {"id": "clinical_notes", "label": "Clinical Notes", "description": "Recent office visit notes", "required": True},
        ],
        "approval_criteria_summary": f"Standard PA requirements for {drug_data.get('name','this drug')}.",
        "typical_decision_days": payer_data.get("avg_processing_days", 5)
    }

# ── LangGraph Nodes ────────────────────────────────────────────────────────────

async def parse_clinical_input_node(state: Dict[str, Any]) -> Dict[str, Any]:
    user_input = state.get("user_input", "")
    raw = await _invoke_llm(PARSE_CLINICAL_INPUT_PROMPT.format(input=user_input))
    if raw:
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = _parse_input_without_llm(user_input)
    else:
        parsed = _parse_input_without_llm(user_input)
    return {**state, "parsed_clinical": parsed, "agent_step": "parsed"}

async def payer_lookup_node(state: Dict[str, Any]) -> Dict[str, Any]:
    parsed = state.get("parsed_clinical", {})
    payer = _get_payer(parsed.get("payer_id", "bluecross_il")) or _get_payer("bluecross_il")
    return {**state, "payer_data": payer, "resolved_payer_id": payer["id"], "agent_step": "payer_looked_up"}

async def drug_criteria_node(state: Dict[str, Any]) -> Dict[str, Any]:
    parsed = state.get("parsed_clinical", {})
    drug = _get_drug(parsed.get("drug_id", "humira")) or _get_drug("humira")
    return {**state, "drug_data": drug, "resolved_drug_id": drug["id"], "agent_step": "drug_looked_up"}

async def ui_schema_generator_node(state: Dict[str, Any]) -> Dict[str, Any]:
    parsed = state.get("parsed_clinical", {})
    payer_data = state.get("payer_data", {})
    drug_data = state.get("drug_data", {})
    payer_id = state.get("resolved_payer_id", "bluecross_il")
    drug_id = state.get("resolved_drug_id", "humira")

    pa_schema = _get_pa_schema(payer_id, drug_id) or _build_generic_schema(payer_data, drug_data)

    raw = await _invoke_llm(GENERATE_UI_SCHEMA_PROMPT.format(
        clinical_context=json.dumps(parsed, indent=2),
        payer_requirements=json.dumps(payer_data, indent=2),
        drug_criteria=json.dumps(drug_data, indent=2),
        pa_schema=json.dumps(pa_schema, indent=2)
    ))

    if raw:
        try:
            ai_analysis = json.loads(raw)
        except Exception:
            ai_analysis = _build_demo_analysis(parsed, payer_data, drug_data)
    else:
        ai_analysis = _build_demo_analysis(parsed, payer_data, drug_data)

    final_schema = {
        **pa_schema,
        "ai_analysis": ai_analysis,
        "prefilled_values": ai_analysis.get("prefilled_values", {}),
        "payer_data": payer_data,
        "drug_data": drug_data,
    }
    return {**state, "ui_schema": final_schema, "agent_step": "ui_ready"}

async def generate_appeal_node(state: Dict[str, Any]) -> Dict[str, Any]:
    parsed = state.get("parsed_clinical", {})
    payer_data = state.get("payer_data", {})
    drug_data = state.get("drug_data", {})
    denial_reason = state.get("denial_reason", "Not medically necessary")

    raw = await _invoke_llm(GENERATE_APPEAL_PROMPT.format(
        drug_name=drug_data.get("name", "Unknown Drug"),
        patient_name=parsed.get("patient_name", "Patient"),
        patient_age=parsed.get("patient_age", "Unknown"),
        patient_gender=parsed.get("patient_gender", ""),
        diagnosis=parsed.get("diagnosis", "Unknown"),
        payer_name=payer_data.get("name", "Insurer"),
        denial_reason=denial_reason,
        clinical_evidence=json.dumps(parsed.get("prior_therapies", []))
    ))

    appeal_letter = raw if raw else _build_demo_appeal(parsed, payer_data, drug_data, denial_reason)
    return {**state, "appeal_letter": appeal_letter, "agent_step": "appeal_ready"}

