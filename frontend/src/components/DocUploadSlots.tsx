import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle2, FileText, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequiredDocument } from '@/lib/api'

interface DocUploadSlotsProps {
  documents: RequiredDocument[]
}

interface UploadedFile {
  name: string
  size: number
  uploaded: boolean
}

export function DocUploadSlots({ documents }: DocUploadSlotsProps) {
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedFile>>({})
  const [dragging, setDragging] = useState<string | null>(null)

  const handleFileUpload = (docId: string, file: File) => {
    setUploadedDocs(prev => ({
      ...prev,
      [docId]: {
        name: file.name,
        size: file.size,
        uploaded: true,
      },
    }))
  }

  const handleRemove = (docId: string) => {
    setUploadedDocs(prev => {
      const next = { ...prev }
      delete next[docId]
      return next
    })
  }

  const handleDrop = (e: React.DragEvent, docId: string) => {
    e.preventDefault()
    setDragging(null)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(docId, file)
  }

  const requiredDocs = documents.filter(d => d.required)
  const optionalDocs = documents.filter(d => !d.required)
  const uploadedCount = Object.keys(uploadedDocs).length
  const requiredCount = requiredDocs.length

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Supporting Documents</h3>
            <p className="text-xs text-gray-500">{uploadedCount} of {documents.length} uploaded</p>
          </div>
        </div>
        {uploadedCount >= requiredCount && requiredCount > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> All required docs uploaded
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Required Documents */}
        {requiredDocs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Required</p>
            <div className="space-y-2">
              {requiredDocs.map((doc, i) => (
                <DocSlot
                  key={doc.id}
                  doc={doc}
                  uploadedFile={uploadedDocs[doc.id]}
                  isDragging={dragging === doc.id}
                  onDragOver={e => { e.preventDefault(); setDragging(doc.id) }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={e => handleDrop(e, doc.id)}
                  onFileSelect={file => handleFileUpload(doc.id, file)}
                  onRemove={() => handleRemove(doc.id)}
                  delay={i * 0.05}
                />
              ))}
            </div>
          </div>
        )}

        {/* Optional Documents */}
        {optionalDocs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Optional</p>
            <div className="space-y-2">
              {optionalDocs.map((doc, i) => (
                <DocSlot
                  key={doc.id}
                  doc={doc}
                  uploadedFile={uploadedDocs[doc.id]}
                  isDragging={dragging === doc.id}
                  onDragOver={e => { e.preventDefault(); setDragging(doc.id) }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={e => handleDrop(e, doc.id)}
                  onFileSelect={file => handleFileUpload(doc.id, file)}
                  onRemove={() => handleRemove(doc.id)}
                  delay={(requiredDocs.length + i) * 0.05}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DocSlotProps {
  doc: RequiredDocument
  uploadedFile?: UploadedFile
  isDragging: boolean
  delay: number
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (file: File) => void
  onRemove: () => void
}

function DocSlot({ doc, uploadedFile, isDragging, delay, onDragOver, onDragLeave, onDrop, onFileSelect, onRemove }: DocSlotProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <AnimatePresence mode="wait">
        {uploadedFile ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200"
          >
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{doc.label}</p>
              <p className="text-xs text-gray-500 truncate">{uploadedFile.name} · {(uploadedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={onRemove}
              className="p-1 hover:bg-green-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </motion.div>
        ) : (
          <motion.label
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all',
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              type="file"
              className="hidden"
              onChange={e => e.target.files?.[0] && onFileSelect(e.target.files[0])}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <Upload className={cn('w-5 h-5 shrink-0', isDragging ? 'text-blue-500' : 'text-gray-400')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">{doc.label}</p>
              {doc.description && (
                <p className="text-xs text-gray-400 truncate">{doc.description}</p>
              )}
            </div>
            {doc.required && (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
          </motion.label>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

