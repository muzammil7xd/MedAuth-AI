import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, FileText, Send, Loader2, CheckCircle2, Copy } from 'lucide-react'
import { generateAppeal } from '@/lib/api'
import type { SubmitResponse, PASchema } from '@/lib/api'

interface AppealWorkflowProps {
  submission: SubmitResponse
  schema: PASchema
  parsedClinical: {
    patient_name: string
    patient_age: number
    patient_gender: string
    diagnosis: string
    prior_therapies: string[]
  }
}

export function AppealWorkflow({ submission, schema, parsedClinical }: AppealWorkflowProps) {
  const [step, setStep] = useState<'intro' | 'generating' | 'ready'>('intro')
  const [appealLetter, setAppealLetter] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const handleGenerateAppeal = async () => {
    setStep('generating')
    try {
      const result = await generateAppeal({
        payer_id: submission.payer_id,
        drug_id: submission.drug_id,
        patient_name: parsedClinical.patient_name || 'Patient',
        patient_age: parsedClinical.patient_age || 45,
        patient_gender: parsedClinical.patient_gender || 'M',
        diagnosis: parsedClinical.diagnosis || 'Unknown',
        denial_reason: submission.denial_reason || 'Not medically necessary',
        prior_therapies: parsedClinical.prior_therapies || [],
      })
      setAppealLetter(result.appeal_letter)
      setStep('ready')
    } catch (err) {
      console.error('Appeal generation failed:', err)
      setStep('intro')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(appealLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-red-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Appeal Workflow</h3>
          <p className="text-xs text-gray-500">
            Denial reason: {submission.denial_reason || 'Not medically necessary'}
          </p>
        </div>
        <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Appeal Window: 180 days
        </span>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Intro State */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-xl p-4 border border-red-100">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Appeal Options</h4>
                <div className="space-y-2">
                  {[
                    { icon: FileText, label: 'AI-Generated Appeal Letter', desc: 'GPT-4o drafts a medical necessity appeal citing clinical guidelines' },
                    { icon: RefreshCw, label: 'Peer-to-Peer Review', desc: 'Request direct physician review call with payer medical director' },
                    { icon: Send, label: 'Expedited Review', desc: 'If urgent/life-threatening — 72-hour expedited decision required' },
                  ].map(({ icon: Icon, label, desc }, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <Icon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateAppeal}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Generate AI Appeal Letter
              </button>
            </motion.div>
          )}

          {/* Generating State */}
          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Drafting Appeal Letter...</p>
                <p className="text-sm text-gray-500 mt-1">
                  AI is analyzing denial reason, clinical guidelines, and patient history
                </p>
              </div>
            </motion.div>
          )}

          {/* Ready State */}
          {step === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-3 py-2 border border-green-200">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Appeal letter generated</span>
              </div>
              <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden">
                <pre className="p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {appealLetter}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-600"
                >
                  {copied ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Download PDF
                </button>
                <button className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Fax to {schema.payer_data?.fax || 'Payer'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

