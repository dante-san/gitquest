import type { SerializedGitState } from '../engine/GitEngine'

export interface LevelDefinition {
  id: number
  title: string
  concept: 'beginner' | 'intermediate' | 'advanced' | 'mastery'
  instructions: string
  hint: string
  startState: SerializedGitState
  targetState: SerializedGitState
}

const baseStart: SerializedGitState = {
  commits: [
    {
      id: 'c0',
      label: 'c0',
      message: 'Initial commit',
      parents: [],
      branch: 'main',
      kind: 'normal',
    },
  ],
  branches: {
    main: { name: 'main', head: 'c0' },
  },
  headBranch: 'main',
}

export const level01: LevelDefinition = {
  id: 1,
  title: 'Your first commit',
  concept: 'beginner',
  instructions:
    'Create one commit on `main`. Make the current graph match the target graph.',
  hint: 'Use `git commit` or `git commit -m "message"`.',
  startState: baseStart,
  targetState: {
    ...baseStart,
    commits: [
      ...baseStart.commits,
      {
        id: 'c1',
        label: 'c1',
        message: 'Work on main',
        parents: ['c0'],
        branch: 'main',
        kind: 'normal',
      },
    ],
    branches: {
      main: { name: 'main', head: 'c1' },
    },
    headBranch: 'main',
  },
}
