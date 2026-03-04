import React from 'react'
import { motion } from 'framer-motion'
import type { LevelDefinition } from '../levels'

interface InstructionsPanelProps {
  level: LevelDefinition
  isComplete: boolean
}

const useTypewriter = (text: string, speed = 18) => {
  const [display, setDisplay] = React.useState('')

  React.useEffect(() => {
    setDisplay('')
    if (!text) return
    let frame: number
    let index = 0

    const step = () => {
      index += 1
      setDisplay(text.slice(0, index))
      if (index < text.length) {
        frame = window.setTimeout(step, speed)
      }
    }

    frame = window.setTimeout(step, speed)
    return () => {
      window.clearTimeout(frame)
    }
  }, [text, speed])

  return display
}

export const InstructionsPanel: React.FC<InstructionsPanelProps> = ({
  level,
  isComplete,
}) => {
  const promptText = useTypewriter(level.instructions)
  const hintText = useTypewriter(`Tip: ${level.hint}`, 22)

  return (
    <motion.div
      className="mb-3 rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 md:px-5 md:py-4 shadow-[0_22px_55px_rgba(15,23,42,0.9)] backdrop-blur-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.24em] text-sky-300/80">
              Level {level.id.toString().padStart(2, '0')}
            </span>
            {isComplete && (
              <span className="rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/50 text-[10px] px-2 py-0.5">
                Completed
              </span>
            )}
          </div>
          <h2 className="text-sm md:text-base font-semibold text-slate-50">
            {level.title}
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
          {['git', 'branch', 'commit', 'merge'].map((token) => (
            <span
              key={token}
              className="px-1.5 py-0.5 rounded-full border border-white/10 bg-slate-900/80"
            >
              {token}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs md:text-sm text-slate-200 min-h-[2.2em]">
        {promptText}
        <span className="inline-block w-[8px] animate-pulse bg-slate-300/80 ml-[1px] rounded-sm align-baseline" />
      </p>
      <p className="mt-2 text-[11px] md:text-xs text-sky-300/90 min-h-[1.4em]">
        {hintText}
      </p>
    </motion.div>
  )
}

