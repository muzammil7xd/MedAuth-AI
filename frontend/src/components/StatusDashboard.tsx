import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, RefreshCw, Send, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubmitResponse } from '@/lib/api'

interface StatusDashboardProps {
  submission: SubmitResponse
  patientName: string
  onAppeal: () => void
  onNewRequest: () => void
}

const statusConfig = {
  approved: {
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    bg: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
    label: 'Approved',
    title: 'Prior Authorization Approved! 🎉',
  },
  denied: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bg: 'from-red-50 to-orange-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    label: 'Denied',
    title: 'Prior Authorization Denied',
  },
  pending: {
    icon: Clock,
    iconColor: 'text-amber-500',
    bg: 'from-amber-50 to-yellow-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Pending Review',
    title: 'Submission Received — Under Review',
  },
}

const TIMELINE_STEPS = [
  { label: 'Submitted', status: 'submitted' },
  { label: 'Under Review', status: 'in_review' },
  { label: 'Decision', status: 'decision' },
]

export function StatusDashboard({ submission, patientName, onAppeal, onNewRequest }: StatusDashboardProps) {
  const config = statusConfig[submission.status]
  const StatusIcon = config.icon

  const activeStepIndex = submission.status === 'pending' ? 1 : 2

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'rounded-2xl border-2 overflow-hidden bg-gradient-to-br',
          config.bg,
          config.border
        )}
      >
        {/* Status Header */}
        <div className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
              <StatusIcon className={cn('w-8 h-8', config.iconColor)} />
            </div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-gray-900 mb-1"
          >
            {config.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 text-sm"
          >
            {submission.message}
          </motion.p>
        </div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-6 pb-6"
        >
          <div className="bg-white rounded-xl p-4 shadow-sm border border-white/60">
            <div className="flex items-center justify-between relative">
              {/* Progress line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 mx-8" />
              <motion.div
                className="absolute left-8 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: activeStepIndex / (TIMELINE_STEPS.length - 1) }}
                transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                style={{ right: `${(1 - activeStepIndex / (TIMELINE_STEPS.length - 1)) * 100}%` }}
              />
              {TIMELINE_STEPS.map((step, i) => (
                <div key={step.status} className="flex flex-col items-center gap-1.5 z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center border-2',
                      i <= activeStepIndex
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    )}
                  >
                    {i < activeStepIndex && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                    {i === activeStepIndex && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </motion.div>
                  <span className={cn(
                    'text-xs font-medium',
                    i <= activeStepIndex ? 'text-blue-600' : 'text-gray-400'
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white rounded-xl p-3 border border-white/60 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Tracking ID</p>
              <p className="text-sm font-mono font-bold text-gray-800">{submission.tracking_id}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-white/60 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={cn('text-sm font-semibold px-2 py-0.5 rounded-full', config.badge)}>
                {config.label}
              </span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-white/60 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Patient</p>
              <p className="text-sm font-medium text-gray-800">{patientName}</p>
            </div>
            {submission.denial_reason && (
              <div className="bg-white rounded-xl p-3 border border-red-100 shadow-sm">
                <p className="text-xs text-red-500 mb-1">Denial Reason</p>
                <p className="text-xs text-gray-700">{submission.denial_reason}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {submission.status === 'denied' && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={onAppeal}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                File Appeal
              </motion.button>
            )}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onClick={onNewRequest}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-colors shadow-sm',
                submission.status === 'denied'
                  ? 'flex-1 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  : 'w-full bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              <Send className="w-4 h-4" />
              New PA Request
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

