import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Stethoscope, ClipboardList, ListChecks, Shield,
  Pill, Activity, Microscope, Users, FileSignature, CheckCircle2,
  ChevronDown, ChevronUp, Send, Loader2, Building2, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitPA } from '@/lib/api'
import type { PASchema, FormSection, FormField, SubmitResponse } from '@/lib/api'

interface PAFormRendererProps {
  schema: PASchema
  onSubmitted: (result: SubmitResponse) => void
}

const ICON_MAP: Record<string, React.ElementType> = {
  user: User,
  stethoscope: Stethoscope,
  clipboard: ClipboardList,
  'list-checks': ListChecks,
  'check-circle': CheckCircle2,
  shield: Shield,
  pill: Pill,
  activity: Activity,
  microscope: Microscope,
  users: Users,
  'file-signature': FileSignature,
  'file-text': ClipboardList,
  dna: Microscope,
  default: ClipboardList,
}

const PAYER_COLORS: Record<string, { accent: string; badge: string; header: string }> = {
  bluecross_il: {
    accent: 'blue',
    badge: 'bg-blue-100 text-blue-800',
    header: 'from-blue-600 to-blue-700',
  },
  aetna: {
    accent: 'purple',
    badge: 'bg-purple-100 text-purple-800',
    header: 'from-purple-600 to-purple-700',
  },
  united: {
    accent: 'orange',
    badge: 'bg-orange-100 text-orange-800',
    header: 'from-orange-500 to-orange-600',
  },
}

export function PAFormRenderer({ schema, onSubmitted }: PAFormRendererProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([schema.sections[0]?.id]))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const colors = PAYER_COLORS[schema.payer_id] || PAYER_COLORS.bluecross_il

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: schema.prefilled_values as Record<string, unknown>,
  })

  // Pre-fill values from AI analysis
  useEffect(() => {
    const prefilled = schema.prefilled_values || {}
    Object.entries(prefilled).forEach(([key, value]) => {
      setValue(key, value as string)
    })
  }, [schema.prefilled_values, setValue])

  const watchedValues = watch()

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isFieldVisible = (field: FormField): boolean => {
    if (!field.conditional) return true
    const { field: condField, equals, contains } = field.conditional
    const currentValue = watchedValues[condField]
    if (equals !== undefined) return currentValue === equals
    if (contains !== undefined) return typeof currentValue === 'string' && currentValue.includes(contains)
    return true
  }

  const onSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true)
    try {
      const result = await submitPA(
        schema.payer_id,
        schema.drug_id,
        data,
        (data.patient_name as string) || 'Patient'
      )
      onSubmitted(result)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden"
    >
      {/* Form Header — payer-specific color */}
      <div className={cn('bg-gradient-to-r p-5 text-white', colors.header)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 opacity-80" />
              <span className="text-sm font-medium opacity-90">{schema.payer_data?.name}</span>
            </div>
            <h2 className="text-lg font-bold leading-tight">{schema.form_title}</h2>
          </div>
          <div className="text-right text-sm opacity-80">
            <div>~{schema.typical_decision_days} days</div>
            <div className="text-xs opacity-60">avg. decision</div>
          </div>
        </div>

        {/* Drug info strip */}
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-4 text-sm">
          <span><strong>{schema.drug_data?.name}</strong> ({schema.drug_data?.generic})</span>
          <span className="opacity-60">•</span>
          <span className="opacity-80">{schema.drug_data?.drug_class}</span>
          <span className="ml-auto opacity-80">${schema.drug_data?.average_cost_monthly?.toLocaleString()}/mo</span>
        </div>
      </div>

      {/* Pre-fill Banner */}
      {schema.prefilled_values && Object.keys(schema.prefilled_values).length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 px-5 py-3 bg-green-50 border-b border-green-100"
        >
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-700">
            <strong>{Object.keys(schema.prefilled_values).length} fields</strong> pre-filled from clinical input
          </span>
        </motion.div>
      )}

      {/* Form Sections */}
      <form onSubmit={handleSubmit(onSubmit as never)}>
        <div className="divide-y divide-gray-100">
          {schema.sections.map((section: FormSection, sectionIdx: number) => (
            <FormSectionRenderer
              key={section.id}
              section={section}
              sectionIdx={sectionIdx}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              register={register}
              errors={errors}
              isFieldVisible={isFieldVisible}
              prefilledKeys={Object.keys(schema.prefilled_values || {})}
            />
          ))}
        </div>

        {/* Approval Criteria */}
        {schema.approval_criteria_summary && (
          <div className="mx-5 mb-4 mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">Approval Criteria Summary</p>
            <p className="text-xs text-blue-600 leading-relaxed">{schema.approval_criteria_summary}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="p-5 border-t border-gray-100 bg-gray-50">
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all shadow-sm',
              'bg-gradient-to-r text-white',
              colors.header,
              isSubmitting ? 'opacity-80 cursor-not-allowed' : 'hover:opacity-90 hover:shadow-md'
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting PA Request...</>
            ) : (
              <><Send className="w-4 h-4" /> Submit Prior Authorization Request</>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Submitting to {schema.payer_data?.name} • Fax: {schema.payer_data?.fax}
          </p>
        </div>
      </form>
    </motion.div>
  )
}

interface FormSectionRendererProps {
  section: FormSection
  sectionIdx: number
  isExpanded: boolean
  onToggle: () => void
  register: ReturnType<typeof useForm>['register']
  control?: ReturnType<typeof useForm>['control']
  errors: ReturnType<typeof useForm>['formState']['errors']
  isFieldVisible: (field: FormField) => boolean
  prefilledKeys: string[]
}

function FormSectionRenderer({
  section, sectionIdx, isExpanded, onToggle, register, errors, isFieldVisible, prefilledKeys
}: FormSectionRendererProps) {
  const SectionIcon = ICON_MAP[section.icon] || ICON_MAP.default

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: sectionIdx * 0.08, duration: 0.4 }}
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <SectionIcon className="w-3.5 h-3.5 text-gray-600" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-gray-800">{section.title}</span>
          {section.description && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {section.description}
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Section Fields */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              {section.fields.map((field: FormField) => (
                isFieldVisible(field) && (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    register={register}
                    errors={errors}
                    isPrefilled={prefilledKeys.includes(field.id)}
                  />
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface FieldRendererProps {
  field: FormField
  register: ReturnType<typeof useForm>['register']
  control?: ReturnType<typeof useForm>['control']
  errors: ReturnType<typeof useForm>['formState']['errors']
  isPrefilled: boolean
}

function FieldRenderer({ field, register, errors, isPrefilled }: FieldRendererProps) {
  const hasError = !!errors[field.id]
  const isFullWidth = field.type === 'textarea' || field.type === 'checkbox'

  const inputClass = cn(
    'w-full px-3 py-2 rounded-lg border text-sm transition-colors outline-none',
    'focus:ring-2 focus:ring-blue-500/20',
    isPrefilled
      ? 'border-green-300 bg-green-50 focus:border-green-400'
      : 'border-gray-200 bg-white focus:border-blue-400',
    hasError && 'border-red-300 bg-red-50'
  )

  const renderInput = () => {
    switch (field.type) {
      case 'select':
        return (
          <select
            {...register(field.id, { required: field.required })}
            className={inputClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            {...register(field.id, { required: field.required })}
            placeholder={field.placeholder}
            rows={3}
            className={cn(inputClass, 'resize-none')}
          />
        )

      case 'checkbox':
        return (
          <div className="flex items-start gap-2.5 py-2">
            <input
              type="checkbox"
              {...register(field.id)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 leading-tight">{field.label}</span>
          </div>
        )

      default:
        return (
          <input
            type={field.type}
            {...register(field.id, { required: field.required })}
            placeholder={field.placeholder}
            className={inputClass}
          />
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('flex flex-col gap-1', isFullWidth && 'col-span-2')}
    >
      {field.type !== 'checkbox' && (
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          {field.label}
          {field.required && <span className="text-red-400">*</span>}
          {isPrefilled && (
            <span className="flex items-center gap-0.5 text-green-600 text-xs">
              <CheckCircle2 className="w-3 h-3" /> pre-filled
            </span>
          )}
        </label>
      )}
      {renderInput()}
      {hasError && (
        <p className="text-xs text-red-500">This field is required</p>
      )}
    </motion.div>
  )
}

