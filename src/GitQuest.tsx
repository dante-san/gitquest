import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLevelEngine } from './engine/LevelEngine'
import { GitGraph } from './components/GitGraph'
import { Terminal } from './components/Terminal'

type ConfettiFn = (options: {
  particleCount: number
  spread: number
  origin: { y: number }
}) => void

declare global {
  interface Window {
    confetti?: ConfettiFn
  }
}

const fireCelebration = () => {
  const run = () => {
    if (!window.confetti) return
    window.confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    })
  }

  if (window.confetti) {
    run()
    return
  }

  const existing = document.querySelector(
    'script[data-gitquest-confetti="1"]',
  ) as HTMLScriptElement | null
  if (existing) {
    existing.addEventListener('load', run, { once: true })
    return
  }

  const script = document.createElement('script')
  script.src =
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js'
  script.async = true
  script.dataset.gitquestConfetti = '1'
  script.onload = run
  document.head.appendChild(script)
}

export const GitQuest: React.FC = () => {
  const {
    level,
    currentState,
    isComplete,
    history,
    runCommand,
    restartLevel,
    nextLevel,
    atLastLevel,
    totalLevels,
  } = useLevelEngine()

  const [successPulseToken, setSuccessPulseToken] = React.useState(0)
  const [showLevelFlash, setShowLevelFlash] = React.useState(false)

  React.useEffect(() => {
    if (!history.length) return
    const last = history[history.length - 1]
    if (last.ok && last.input) {
      setSuccessPulseToken((t) => t + 1)
    }
  }, [history])

  React.useEffect(() => {
    if (isComplete) {
      setShowLevelFlash(true)
      fireCelebration()
      const id = window.setTimeout(() => setShowLevelFlash(false), 420)
      return () => window.clearTimeout(id)
    }
  }, [isComplete])

  React.useEffect(() => {
    if (!isComplete || atLastLevel) return
    const id = window.setTimeout(() => {
      nextLevel()
    }, 1200)
    return () => window.clearTimeout(id)
  }, [isComplete, atLastLevel, nextLevel])

  const isNextEnabled = isComplete

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <AnimatePresence>
        {showLevelFlash && (
          <motion.div
            key="flash"
            className="pointer-events-none absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.6, 0],
              filter: [
                'contrast(100%) saturate(100%)',
                'contrast(140%) saturate(150%) hue-rotate(10deg)',
                'contrast(100%) saturate(100%)',
              ],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: 'easeInOut' }}
            style={{
              background:
                'radial-gradient(circle at 10% 0%, rgba(56,189,248,0.5), transparent 55%), radial-gradient(circle at 90% 100%, rgba(236,72,153,0.5), transparent 55%)',
              mixBlendMode: 'screen',
            }}
          />
        )}
      </AnimatePresence>

      <div className="grid h-full min-h-0 md:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.65fr)] gap-4 md:gap-6 items-stretch">
        <div className="flex flex-col min-h-0 h-full">
          <Terminal
            levelId={level.id}
            onSubmitCommand={runCommand}
            history={history.map((h) => ({
              text: h.resultMessage || h.input,
              kind: h.ok ? 'ok' : 'error',
            }))}
            disabled={isComplete}
            successPulseToken={successPulseToken}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
            <button
              type="button"
              onClick={restartLevel}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 hover:border-slate-300/60 hover:bg-slate-900/70 transition-colors bg-slate-900/40"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              Restart level
            </button>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                Level {level.id} of {/** total levels from engine */}{' '}
                {totalLevels}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col min-h-0 h-full">
          <div className="flex-1 min-h-0">
            <GitGraph state={currentState} variant="current" />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/60 px-3 py-1 text-emerald-200 backdrop-blur-md"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Graph matches target. Nice.</span>
                </motion.div>
              ) : (
                <motion.div
                  key="incomplete"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-slate-400"
                >
                  Type a command and watch the graph update.
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={nextLevel}
              disabled={!isNextEnabled || atLastLevel}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-sky-400/70 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"
            >
              {atLastLevel ? 'Last level' : 'Next level'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
