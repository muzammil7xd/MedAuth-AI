import { useState, useRef, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Send, Loader2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DoctorInputProps {
  onSubmit: (input: string) => void
  isLoading: boolean
}

const DEMO_PROMPTS = [
  'Requesting Humira for John Doe, 45M, Crohn\'s disease, failed methotrexate and 6-MP, Blue Cross IL',
  'Humira for Jane Smith, 38F, Crohn\'s disease, failed methotrexate, Aetna insurance',
  'Keytruda for Robert Chen, 62M, Stage 3 non-small cell lung cancer, PD-L1 positive, UnitedHealth',
]

export function DoctorInput({ onSubmit, isLoading }: DoctorInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return
    onSubmit(value.trim())
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  const handleDemoPrompt = (prompt: string) => {
    setValue(prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MedAuth AI</h1>
        </div>
        <p className="text-gray-500 text-lg">
          AI-powered prior authorization — describe the case, watch the form materialize
        </p>
      </motion.div>

      {/* Input Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-2xl border-2 border-blue-100 bg-white shadow-xl shadow-blue-50 focus-within:border-blue-400 transition-colors"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the prior authorization request... (e.g. 'Requesting Humira for patient John Doe, 45M, Crohn's disease, failed methotrexate, Blue Cross IL')"
          className="w-full min-h-[120px] p-5 pr-16 text-gray-800 placeholder-gray-400 bg-transparent resize-none outline-none text-base leading-relaxed"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className={cn(
            'absolute right-4 bottom-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
            value.trim() && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
        <div className="px-5 pb-3 text-xs text-gray-400">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Ctrl+Enter</kbd> to submit
        </div>
      </motion.div>

      {/* Demo Prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4"
      >
        <p className="text-xs text-gray-400 mb-2 text-center">Try a demo scenario →</p>
        <div className="flex flex-col gap-2">
          {DEMO_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleDemoPrompt(prompt)}
              disabled={isLoading}
              className="flex items-start gap-2 text-left px-4 py-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group text-sm text-gray-600"
            >
              <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              <span className="line-clamp-1">{prompt}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

