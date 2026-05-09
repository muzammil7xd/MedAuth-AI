import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DoctorInput } from './components/DoctorInput'
import { PAFormRenderer } from './components/PAFormRenderer'
import { ClinicalCriteriaCard } from './components/ClinicalCriteriaCard'
import { DocUploadSlots } from './components/DocUploadSlots'
import { StatusDashboard } from './components/StatusDashboard'
import { AppealWorkflow } from './components/AppealWorkflow'
import { analyzeRequest } from './lib/api'
import type { AnalyzeResponse, SubmitResponse } from './lib/api'
import { Loader2, Sparkles, Brain, Zap } from 'lucide-react'
import './index.css'

type AppState = 'idle' | 'analyzing' | 'form' | 'submitted' | 'appealing'

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null)
  const [submission, setSubmission] = useState<SubmitResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDoctorInput = async (input: string) => {
    setError(null)
    setAppState('analyzing')
    try {
      const result = await analyzeRequest(input)
      setAnalysisResult(result)
      setAppState('form')
    } catch (err) {
      setError('Failed to analyze request. Make sure the backend is running on port 8000.')
      setAppState('idle')
    }
  }

  const handleSubmitted = (result: SubmitResponse) => {
    setSubmission(result)
    setAppState('submitted')
  }

  const handleAppeal = () => {
    setAppState('appealing')
  }

  const handleNewRequest = () => {
    setAppState('idle')
    setAnalysisResult(null)
    setSubmission(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Top Nav */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">MedAuth AI</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium ml-1">
              Generative UI
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" /> GPT-4o Agent
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Dynamic UI
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">

          {/* IDLE STATE — Doctor Input */}
          {appState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[70vh]"
            >
              <DoctorInput onSubmit={handleDoctorInput} isLoading={false} />
              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm max-w-2xl w-full">
                  ⚠️ {error}
                </div>
              )}
            </motion.div>
          )}

          {/* ANALYZING STATE */}
          {appState === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[70vh] gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-200">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              </div>
              <div className="text-center max-w-md">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Agent Processing...</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Parsing clinical context → Looking up payer rules → Checking drug criteria → Generating your custom PA form
                </p>
              </div>
              {/* Animated steps */}
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {[
                  'Extracting patient, drug, and payer from input...',
                  'Fetching Blue Cross IL PA requirements...',
                  'Checking Humira step therapy criteria...',
                  'Generating dynamic form with AI pre-fill...',
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.6 }}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.6 + 0.2 }}
                      className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    </motion.div>
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* FORM STATE — Dynamic PA Form */}
          {appState === 'form' && analysisResult && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left Column — Form */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleNewRequest}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    ← New Request
                  </button>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      {analysisResult.payer?.shortName}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      {analysisResult.drug?.name}
                    </span>
                  </div>
                </div>
                <PAFormRenderer
                  schema={analysisResult.ui_schema}
                  onSubmitted={handleSubmitted}
                />
              </div>

              {/* Right Column — AI Analysis + Docs */}
              <div className="space-y-4">
                {analysisResult.ui_schema?.ai_analysis && (
                  <ClinicalCriteriaCard
                    aiAnalysis={analysisResult.ui_schema.ai_analysis}
                    payer={analysisResult.payer}
                    drug={analysisResult.drug}
                  />
                )}
                {analysisResult.ui_schema?.required_documents && (
                  <DocUploadSlots
                    documents={analysisResult.ui_schema.required_documents}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* SUBMITTED STATE */}
          {(appState === 'submitted' || appState === 'appealing') && submission && analysisResult && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto"
            >
              <div className="space-y-4">
                <StatusDashboard
                  submission={submission}
                  patientName={analysisResult.parsed_clinical?.patient_name || 'Patient'}
                  onAppeal={handleAppeal}
                  onNewRequest={handleNewRequest}
                />
              </div>
              {(appState === 'appealing' || submission.status === 'denied') && (
                <AppealWorkflow
                  submission={submission}
                  schema={analysisResult.ui_schema}
                  parsedClinical={analysisResult.parsed_clinical}
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}
