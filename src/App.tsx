import React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { GitBranch, TerminalSquare, Sparkles } from 'lucide-react'
import { GitQuest } from './GitQuest'

const App: React.FC = () => {
  const x = useMotionValue(50)
  const y = useMotionValue(50)
  const smoothX = useSpring(x, { stiffness: 80, damping: 20, mass: 0.4 })
  const smoothY = useSpring(y, { stiffness: 80, damping: 20, mass: 0.4 })

  const gradientPosition = useTransform(
    [smoothX, smoothY],
    ([vx, vy]: number[]) => `${vx}% ${vy}%`,
  )

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const nextX = ((event.clientX - rect.left) / rect.width) * 100
    const nextY = ((event.clientY - rect.top) / rect.height) * 100
    x.set(nextX)
    y.set(nextY)
  }

  return (
    <div
      className="relative h-screen text-slate-50 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          background:
            'radial-gradient(circle at 10% 0%, rgba(56,189,248,0.25), transparent 55%), radial-gradient(circle at 90% 100%, rgba(236,72,153,0.2), transparent 55%), radial-gradient(circle at 50% 50%, rgba(15,23,42,1), #020617 70%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 mix-blend-screen opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at var(--mousePos), rgba(94,234,212,0.22), transparent 55%)',
          ['--mousePos' as string]: gradientPosition,
        }}
        animate={{ opacity: [0.45, 0.7, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex h-full items-stretch justify-center px-4 py-4 md:px-6 md:py-4 lg:px-10 lg:py-4">
        <div className="w-full max-w-7xl flex flex-col min-h-0">
          <header className="mb-3 md:mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 border border-white/10 shadow-[0_0_40px_rgba(56,189,248,0.25)] backdrop-blur-xl">
                <GitBranch className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight">
                    GitQuest
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-200">
                    <Sparkles className="h-3 w-3" />
                    Live sandbox
                  </span>
                </div>
                <p className="text-slate-400 text-xs md:text-sm max-w-xl mt-1">
                  A premium playground for mastering Git fundamentals through an interactive
                  graph and command-line puzzle flow.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-400">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 backdrop-blur-xl">
                <TerminalSquare className="h-3.5 w-3.5 text-sky-300" />
                <span className="font-mono">local-sim://gitquest</span>
              </div>
              <span className="hidden sm:inline text-slate-500">
                No repo access. No side effects. Just practice.
              </span>
            </div>
          </header>

          <main className="flex-1 min-h-0 flex flex-col">
            <GitQuest />
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
