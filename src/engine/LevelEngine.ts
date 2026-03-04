import React from 'react'
import { GitEngine, type GitState, type SerializedGitState } from './GitEngine'
import { parseCommand, AUTOCOMPLETE_TOKENS } from './CommandParser'
import { levels, type LevelDefinition } from '../levels'
import { compareGraphs } from './GraphComparator'

export interface CommandHistoryEntry {
  input: string
  resultMessage: string
  ok: boolean
}

export interface UseLevelEngineResult {
  level: LevelDefinition
  currentState: GitState
  targetState: SerializedGitState
  isComplete: boolean
  history: CommandHistoryEntry[]
  runCommand: (input: string) => void
  restartLevel: () => void
  nextLevel: () => void
  atLastLevel: boolean
  autocompleteFor: (input: string) => string | null
  totalLevels: number
}

export function useLevelEngine(): UseLevelEngineResult {
  const [levelIndex, setLevelIndex] = React.useState(0)
  const level = levels[levelIndex]
  const [engine] = React.useState(() => new GitEngine(level.startState))
  const [, forceTick] = React.useState(0)
  const [history, setHistory] = React.useState<CommandHistoryEntry[]>([])
  const [isComplete, setIsComplete] = React.useState(false)

  const syncState = () => {
    forceTick((x) => x + 1)
  }

  const initialiseLevel = React.useCallback(
    (index: number) => {
      const lvl = levels[index]
      engine.reset(lvl.startState)
      const { match } = compareGraphs(engine.getState(), lvl.targetState)
      setHistory([
        {
          input: '',
          ok: true,
          resultMessage: `Loaded ${lvl.title}. Make the current graph match the target graph.`,
        },
      ])
      setIsComplete(match)
      syncState()
    },
    [engine],
  )

  React.useEffect(() => {
    initialiseLevel(levelIndex)
  }, [levelIndex, initialiseLevel])

  const recomputeCompletion = React.useCallback(() => {
    const { match } = compareGraphs(engine.getState(), level.targetState)
    setIsComplete((prev) => {
      if (match && !prev) {
        setHistory((historyPrev) => [
          ...historyPrev,
          {
            input: '',
            ok: true,
            resultMessage: `Level ${level.id} complete. Press Next to continue.`,
          },
        ])
      }
      return match
    })
  }, [engine, level])

  const runCommand = (input: string) => {
    const parsed = parseCommand(input)
    if (!parsed.ok || !parsed.command) {
      setHistory((prev) => [
        ...prev,
        { input, ok: false, resultMessage: parsed.error ?? 'Parse error.' },
      ])
      recomputeCompletion()
      return
    }

    const result = engine.applyCommand(parsed.command)
    syncState()
    setHistory((prev) => [
      ...prev,
      { input, ok: result.ok, resultMessage: result.message },
    ])
    recomputeCompletion()
  }

  const restartLevel = () => {
    initialiseLevel(levelIndex)
  }

  const nextLevel = React.useCallback(() => {
    if (levelIndex < levels.length - 1) {
      setLevelIndex((i) => i + 1)
    }
  }, [levelIndex])

  const autocompleteFor = (input: string): string | null => {
    const trimmed = input.trim()
    if (!trimmed) return 'git '
    const candidates = AUTOCOMPLETE_TOKENS.filter((token) =>
      token.toLowerCase().startsWith(trimmed.toLowerCase()),
    )
    return candidates[0] ?? null
  }

  return {
    level,
    currentState: engine.getState(),
    targetState: level.targetState,
    isComplete,
    history,
    runCommand,
    restartLevel,
    nextLevel,
    atLastLevel: levelIndex === levels.length - 1,
    autocompleteFor,
    totalLevels: levels.length,
  }
}
