// API client for MedAuth AI backend

const API_BASE = '/api'

export interface AnalyzeResponse {
  success: boolean
  parsed_clinical: {
    patient_name: string
    patient_age: number
    patient_gender: string
    drug_name: string
    drug_id: string
    diagnosis: string
    diagnosis_icd10: string
    payer_name: string
    payer_id: string
    prior_therapies: string[]
    clinical_notes: string
  }
  ui_schema: PASchema
  payer: PayerData
  drug: DrugData
  agent_step: string
}

export interface PASchema {
  payer_id: string
  drug_id: string
  form_title: string
  sections: FormSection[]
  required_documents: RequiredDocument[]
  approval_criteria_summary: string
  typical_decision_days: number
  prefilled_values: Record<string, unknown>
  ai_analysis: AIAnalysis
  payer_data: PayerData
  drug_data: DrugData
}

export interface FormSection {
  id: string
  title: string
  icon: string
  description?: string
  fields: FormField[]
}

export interface FormField {
  id: string
  label: string
  type: 'text' | 'date' | 'number' | 'select' | 'checkbox' | 'textarea' | 'tel'
  required?: boolean
  options?: string[]
  placeholder?: string
  conditional?: { field: string; equals?: unknown; contains?: string }
}

export interface RequiredDocument {
  id: string
  label: string
  description: string
  required: boolean
}

export interface AIAnalysis {
  prefilled_values: Record<string, unknown>
  met_criteria: string[]
  missing_info: string[]
  approval_likelihood: 'high' | 'medium' | 'low'
  approval_reasoning: string
  special_requirements: string[]
  estimated_decision_days: number
}

export interface PayerData {
  id: string
  name: string
  shortName: string
  phone: string
  fax: string
  avg_processing_days: number
  pa_requirements: Record<string, unknown>
}

export interface DrugData {
  id: string
  name: string
  generic: string
  manufacturer: string
  drug_class: string
  indications: string[]
  average_cost_monthly: number
}

export interface SubmitResponse {
  success: boolean
  status: 'approved' | 'denied' | 'pending'
  message: string
  tracking_id: string
  payer_id: string
  drug_id: string
  denial_reason?: string
}

export interface AppealResponse {
  success: boolean
  appeal_letter: string
}

export async function analyzeRequest(input: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/pa/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  })
  if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`)
  return res.json()
}

export async function submitPA(
  payerId: string,
  drugId: string,
  formData: Record<string, unknown>,
  patientName: string
): Promise<SubmitResponse> {
  const res = await fetch(`${API_BASE}/pa/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payer_id: payerId,
      drug_id: drugId,
      form_data: formData,
      patient_name: patientName,
    }),
  })
  if (!res.ok) throw new Error(`Submission failed: ${res.statusText}`)
  return res.json()
}

export async function generateAppeal(params: {
  payer_id: string
  drug_id: string
  patient_name: string
  patient_age: number
  patient_gender: string
  diagnosis: string
  denial_reason: string
  prior_therapies: string[]
}): Promise<AppealResponse> {
  const res = await fetch(`${API_BASE}/pa/appeal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Appeal failed: ${res.statusText}`)
  return res.json()
}

