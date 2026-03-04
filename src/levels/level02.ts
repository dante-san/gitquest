import type { SerializedGitState } from '../engine/GitEngine'
import type { LevelDefinition } from './level01'
import { level01 } from './level01'

// Re-use level01 target as the starting point here
const start: SerializedGitState = level01.targetState

export const level02: LevelDefinition = {
  id: 2,
  title: 'Create a feature branch',
  concept: 'beginner',
  instructions:
    'Create a new branch named `feature` at the current commit without moving HEAD. Make the current graph match the target graph.',
  hint: 'Use `git branch feature`.',
  startState: start,
  targetState: {
    ...start,
    branches: {
      main: start.branches.main,
      feature: { name: 'feature', head: start.branches.main.head },
    },
    headBranch: 'main',
  },
}
