"""
Agent prompts for MedAuth AI
"""

PARSE_CLINICAL_INPUT_PROMPT = """You are a medical prior authorization specialist AI. Extract structured clinical information from the doctor's natural language request.

Extract the following information:
- patient_name: Full name of the patient
- patient_age: Age (integer)
- patient_gender: M/F/Other
- drug_name: The medication being requested (normalize to common brand name)
- drug_id: The normalized drug ID (one of: humira, keytruda, ozempic, dupixent, enbrel)
- diagnosis: Primary diagnosis
- diagnosis_icd10: Best matching ICD-10 code
- payer_name: Insurance company name
- payer_id: Normalized payer ID (one of: bluecross_il, aetna, united)
- prior_therapies: List of previously tried medications
- clinical_notes: Any additional clinical context provided

If information is not provided, use null for that field.
Return ONLY valid JSON, no explanation.

Doctor's request: {input}

JSON response:"""

GENERATE_UI_SCHEMA_PROMPT = """You are a prior authorization form intelligence engine. Based on the clinical context and the payer's requirements, generate a complete UI rendering plan.

Clinical Context:
{clinical_context}

Payer Requirements:
{payer_requirements}

Drug Criteria:
{drug_criteria}

PA Form Schema:
{pa_schema}

Your task:
1. Identify which form fields should be pre-filled based on the clinical context
2. Identify which criteria are already met based on the patient history
3. Flag any missing information that is required
4. Generate a recommendation on likelihood of approval

Return JSON with this structure:
{{
  "prefilled_values": {{"field_id": "value"}},
  "met_criteria": ["list of criteria already satisfied"],
  "missing_info": ["list of required info not yet provided"],
  "approval_likelihood": "high|medium|low",
  "approval_reasoning": "explanation",
  "special_requirements": ["any payer-specific requirements to highlight"],
  "estimated_decision_days": number
}}"""

GENERATE_APPEAL_PROMPT = """You are a medical appeals specialist AI. Generate a compelling appeal letter for a denied prior authorization.

Denial Context:
- Drug: {drug_name}
- Patient: {patient_name}, {patient_age}yo {patient_gender}
- Diagnosis: {diagnosis}
- Payer: {payer_name}
- Denial Reason: {denial_reason}
- Clinical Evidence: {clinical_evidence}

Write a professional, evidence-based appeal letter that:
1. Acknowledges the denial
2. Presents clinical evidence supporting medical necessity
3. Cites relevant clinical guidelines (ACG, ACS, etc.)
4. Requests expedited peer-to-peer review if urgent
5. Includes a clear statement of medical necessity

Format as a complete letter ready to fax to the payer."""

