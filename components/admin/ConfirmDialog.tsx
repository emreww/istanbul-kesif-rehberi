'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type Variant = 'default' | 'danger' | 'warning' | 'success'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
  icon?: string
}

export interface PromptOptions extends ConfirmOptions {
  inputLabel?: string
  placeholder?: string
  defaultValue?: string
  required?: boolean
  multiline?: boolean
  maxLength?: number
}

interface DialogState {
  kind: 'confirm' | 'prompt'
  options: ConfirmOptions | PromptOptions
  resolve: (value: boolean | string | null) => void
}

const VARIANT_STYLES: Record<Variant, {
  icon: string; iconBg: string; confirmBtn: string; accentBar: string
}> = {
  default: {
    icon: '❓', iconBg: 'bg-white/5 text-gray-300 border-white/10',
    confirmBtn: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    accentBar: 'from-amber-400/60 to-transparent',
  },
  danger: {
    icon: '⚠️', iconBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    confirmBtn: 'bg-rose-500 text-white hover:bg-rose-400',
    accentBar: 'from-rose-500/60 to-transparent',
  },
  warning: {
    icon: '⚡', iconBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    confirmBtn: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    accentBar: 'from-amber-400/60 to-transparent',
  },
  success: {
    icon: '✅', iconBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    confirmBtn: 'bg-emerald-500 text-white hover:bg-emerald-400',
    accentBar: 'from-emerald-500/60 to-transparent',
  },
}

const DialogContext = createContext<{
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  prompt: (opts: PromptOptions) => Promise<string | null>
} | null>(null)

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const confirm = useCallback((options: ConfirmOptions) =>
  new Promise<boolean>((resolve) => {
    setInputValue('')
    setError(null)
    setState({
      kind: 'confirm',
      options,
      resolve: (value: string | boolean | null) => {
        resolve(Boolean(value))
      },
    })
  }), [])
  const prompt = useCallback((options: PromptOptions) =>
  new Promise<string | null>((resolve) => {
    setInputValue(options.defaultValue ?? '')
    setError(null)
    setState({
      kind: 'prompt',
      options,
      resolve: (value: string | boolean | null) => {
        if (typeof value === 'boolean') {
          resolve(null)
          return
        }
        resolve(value)
      },
    })
  }), [])

  const close = useCallback((result: boolean | string | null) => {
    setState((prev) => { if (prev) prev.resolve(result); return null })
    setInputValue(''); setError(null)
  }, [])

  useEffect(() => {
    if (state?.kind !== 'prompt') return
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [state])

  useEffect(() => {
    if (!state) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(state.kind === 'confirm' ? false : null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state, close])

  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt])

  const handleConfirm = () => {
    if (!state) return
    if (state.kind === 'prompt') {
      const opts = state.options as PromptOptions
      if (opts.required && !inputValue.trim()) {
        setError('Bu alan zorunludur.'); return
      }
      close(inputValue.trim())
    } else {
      close(true)
    }
  }

  const variant = state?.options.variant ?? 'default'
  const styles = VARIANT_STYLES[variant]

  return (
    <DialogContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => close(state.kind === 'confirm' ? false : null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${styles.accentBar}`} />

              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl border ${styles.iconBg}`}>
                    {state.options.icon ?? styles.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white leading-tight">{state.options.title}</h3>
                    {state.options.description && (
                      <p className="text-sm text-gray-400 mt-1 leading-relaxed">{state.options.description}</p>
                    )}
                  </div>
                </div>

                {state.kind === 'prompt' && (
                  <div className="space-y-1.5">
                    {(state.options as PromptOptions).inputLabel && (
                      <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                        {(state.options as PromptOptions).inputLabel}
                      </label>
                    )}
                    {(state.options as PromptOptions).multiline ? (
                      <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={inputValue}
                        onChange={(e) => { setInputValue(e.target.value); setError(null) }}
                        placeholder={(state.options as PromptOptions).placeholder}
                        maxLength={(state.options as PromptOptions).maxLength}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition resize-none"
                      />
                    ) : (
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        value={inputValue}
                        onChange={(e) => { setInputValue(e.target.value); setError(null) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm() } }}
                        placeholder={(state.options as PromptOptions).placeholder}
                        maxLength={(state.options as PromptOptions).maxLength}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition"
                      />
                    )}
                    {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => close(state.kind === 'confirm' ? false : null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition cursor-pointer"
                >
                  {state.options.cancelLabel ?? 'Vazgeç'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition cursor-pointer shadow-lg ${styles.confirmBtn}`}
                >
                  {state.options.confirmLabel ?? (state.kind === 'prompt' ? 'Gönder' : 'Onayla')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider')
  return ctx
}