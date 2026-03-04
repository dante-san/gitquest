import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal as TerminalIcon, Zap, CheckCircle2 } from 'lucide-react'

interface TerminalProps {
  levelId: number
  onSubmitCommand: (command: string) => void
  history: { text: string; kind: 'input' | 'ok' | 'error' }[]
  disabled?: boolean
  successPulseToken?: number
}

export const Terminal: React.FC<TerminalProps> = ({
  levelId,
  onSubmitCommand,
  history,
  disabled,
  successPulseToken,
}) => {
  const [value, setValue] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [, setHistoryIndex] = React.useState<number | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!history.length) return
      setHistoryIndex((prev) => {
        const next = prev === null ? history.length - 1 : Math.max(prev - 1, 0)
        const entry = history[next]
        if (entry && entry.kind === 'input') {
          setValue(entry.text)
        }
        return next
      })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!history.length) return
      setHistoryIndex((prev) => {
        if (prev === null) return null
        const next = prev + 1
        if (next >= history.length) {
          setValue('')
          return null
        }
        const entry = history[next]
        if (entry && entry.kind === 'input') {
          setValue(entry.text)
        }
        return next
      })
    } else if (e.key === 'Tab') {
      // Autocomplete is handled by parent via successPulseToken; here we just prevent default
      e.preventDefault()
    } else {
      setHistoryIndex(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || disabled) return
    onSubmitCommand(value)
    setValue('')
    setHistoryIndex(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <motion.div
      className="relative rounded-2xl border border-white/10 bg-slate-900/40 flex flex-col h-full overflow-hidden backdrop-blur-xl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      key={levelId}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px rounded-[18px] bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          <div className="ml-3 inline-flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
            <TerminalIcon className="h-3.5 w-3.5 text-sky-300" />
            <span>gitquest</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span className="px-2 py-0.5 rounded-full bg-slate-900/70 border border-white/10">
            level-{levelId.toString().padStart(2, '0')}
          </span>
          <Zap className="h-3.5 w-3.5 text-emerald-300" />
        </div>
      </div>

      <div className="relative flex-1 px-4 py-3 font-mono text-xs text-slate-100 overflow-y-auto space-y-1">
        <div className="text-slate-500 flex items-center gap-2 mb-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400/80" />
          <span># Type Git commands here. Supported: commit, branch, checkout, merge.</span>
        </div>
        {history.map((entry, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {entry.kind === 'input' ? (
              <span>
                <span className="text-emerald-400">gitquest</span>
                <span className="text-slate-500">:&gt; </span>
                <span className="text-slate-100">{entry.text}</span>
              </span>
            ) : (
              <span
                className={
                  entry.kind === 'ok'
                    ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                    : 'text-rose-300'
                }
              >
                {entry.text}
              </span>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative border-t border-white/5 bg-slate-950/70 px-4 py-2.5 font-mono text-xs text-slate-100 flex items-center gap-2"
      >
        <span className="text-emerald-400 shrink-0">gitquest:&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="bg-transparent outline-none border-none flex-1 text-slate-100 placeholder:text-slate-500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? 'Level complete! Press Next to continue.' : 'try: git commit'
          }
          disabled={disabled}
          autoComplete="off"
        />
        <AnimatePresence>
          {successPulseToken !== undefined && !disabled && (
            <motion.div
              key={successPulseToken}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>applied</span>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}

