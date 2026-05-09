import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Brain, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIAnalysis, PayerData, DrugData } from '@/lib/api'

interface ClinicalCriteriaCardProps {
  aiAnalysis: AIAnalysis
  payer: PayerData
  drug: DrugData
}

const likelihoodConfig = {
  high: {
    label: 'High Approval Likelihood',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    badge: 'bg-green-100 text-green-700',
  },
  medium: {
    label: 'Moderate Approval Likelihood',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  low: {
    label: 'Low Approval Likelihood',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
  },
}

export function ClinicalCriteriaCard({ aiAnalysis, payer, drug }: ClinicalCriteriaCardProps) {
  const config = likelihoodConfig[aiAnalysis.approval_likelihood] || likelihoodConfig.medium
  const LikelihoodIcon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">AI Clinical Assessment</h3>
            <p className="text-xs text-gray-500">{payer.name} • {drug.name}</p>
          </div>
          <span className={cn('ml-auto px-2.5 py-1 rounded-full text-xs font-medium', config.badge)}>
            {config.label}
          </span>
        </div>

        {/* Likelihood Breakdown */}
        <div className={cn('p-4 border-b', config.bg, config.border, 'border-b')}>
          <div className="flex items-start gap-3">
            <LikelihoodIcon className={cn('w-5 h-5 mt-0.5 shrink-0', config.iconColor)} />
            <div>
              <p className={cn('text-sm font-medium', config.color)}>AI Analysis</p>
              <p className="text-sm text-gray-600 mt-1">{aiAnalysis.approval_reasoning}</p>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 gap-4">
          {/* Met Criteria */}
          {aiAnalysis.met_criteria.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                ✅ Criteria Already Met
              </p>
              <ul className="space-y-1.5">
                {aiAnalysis.met_criteria.map((criterion, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{criterion}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Information */}
          {aiAnalysis.missing_info.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                ⚠️ Missing Information
              </p>
              <ul className="space-y-1.5">
                {aiAnalysis.missing_info.map((info, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{info}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Special Requirements */}
          {aiAnalysis.special_requirements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                🔔 Payer-Specific Requirements
              </p>
              <ul className="space-y-1.5">
                {aiAnalysis.special_requirements.map((req, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{req}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Estimated decision: <strong>{aiAnalysis.estimated_decision_days} business days</strong>
          </span>
          <span className="text-xs text-gray-400">Powered by GPT-4o</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

