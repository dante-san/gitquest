import type { SerializedGitState } from '../engine/GitEngine'
import type { LevelDefinition } from './level01'

// Small helpers to build serialized Git states for levels

function oneCommitMain(): SerializedGitState {
  return {
    commits: [
      {
        id: 'c0',
        label: 'c0',
        message: 'init',
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
}

function twoCommitsMain(): SerializedGitState {
  const base = oneCommitMain()
  return {
    ...base,
    commits: [
      ...base.commits,
      {
        id: 'c1',
        label: 'c1',
        message: 'work',
        parents: ['c0'],
        branch: 'main',
        kind: 'normal',
      },
    ],
    branches: {
      main: { name: 'main', head: 'c1' },
    },
    headBranch: 'main',
  }
}

function threeCommitsMain(): SerializedGitState {
  const two = twoCommitsMain()
  return {
    ...two,
    commits: [
      ...two.commits,
      {
        id: 'c2',
        label: 'c2',
        message: 'more work',
        parents: ['c1'],
        branch: 'main',
        kind: 'normal',
      },
    ],
    branches: {
      main: { name: 'main', head: 'c2' },
    },
    headBranch: 'main',
  }
}

function withFeatureBranch(from: SerializedGitState): SerializedGitState {
  const mainHead = from.branches.main.head
  return {
    ...from,
    branches: {
      ...from.branches,
      feature: { name: 'feature', head: mainHead },
    },
    headBranch: 'main',
  }
}

function featureAdvanced(from: SerializedGitState): SerializedGitState {
  // make a commit on feature
  const base = withFeatureBranch(from)
  const commits = [...base.commits]
  commits.push({
    id: 'f1',
    label: 'f1',
    message: 'feature work',
    parents: [base.branches.feature.head],
    branch: 'feature',
    kind: 'normal',
  })
  return {
    commits,
    branches: {
      main: base.branches.main,
      feature: { name: 'feature', head: 'f1' },
    },
    headBranch: 'feature',
  }
}

function simpleMerge(): { start: SerializedGitState; target: SerializedGitState } {
  const base = threeCommitsMain()
  const withBranch = featureAdvanced(base)
  // merge feature back into main: create m1 with parents [c2, f1]
  const commits = [...withBranch.commits]
  commits.push({
    id: 'm1',
    label: 'm1',
    message: 'merge feature',
    parents: ['c2', 'f1'],
    branch: 'main',
    kind: 'merge',
  })
  const target: SerializedGitState = {
    commits,
    branches: {
      main: { name: 'main', head: 'm1' },
      feature: withBranch.branches.feature,
    },
    headBranch: 'main',
  }
  return { start: withBranch, target }
}

// Build extra levels (3-50) programmatically.
// These reuse a small family of graph shapes but differ in concept and instructions.

export const extraLevels: LevelDefinition[] = []

for (let id = 3; id <= 50; id++) {
  let concept: LevelDefinition['concept']
  if (id <= 10) concept = 'beginner'
  else if (id <= 20) concept = 'intermediate'
  else if (id <= 40) concept = 'advanced'
  else concept = 'mastery'

  let startState: SerializedGitState
  let targetState: SerializedGitState
  let title: string
  let instructions: string
  let hint: string

  if (id <= 10) {
    // Basic commits and branching
    if (id % 2 === 1) {
      startState = oneCommitMain()
      targetState = twoCommitsMain()
      title = `Basic commit ${id - 2}`
      instructions =
        'Create one new commit on main. Make the current graph match the target graph.'
      hint = 'Use `git commit` on the main branch.'
    } else {
      startState = twoCommitsMain()
      targetState = withFeatureBranch(twoCommitsMain())
      title = `Basic branch ${id - 2}`
      instructions =
        'Create a new branch at the tip of main so the graphs align. Make the current graph match the target graph.'
      hint = 'Use `git branch feature` to create a new branch.'
    }
  } else if (id <= 20) {
    // Branch movement and checkout
    startState = withFeatureBranch(twoCommitsMain())
    const advanced = featureAdvanced(twoCommitsMain())
    if (id % 2 === 1) {
      targetState = advanced
      title = `Checkout to feature ${id - 10}`
      instructions =
        'Move HEAD to the feature branch, then make a commit there so your graph matches the target. Make the current graph match the target graph.'
      hint = 'Use `git checkout feature` before committing.'
    } else {
      targetState = {
        ...advanced,
        headBranch: 'main',
      }
      title = `Checkout back to main ${id - 10}`
      instructions =
        'Move HEAD back to main so the HEAD indicator matches the target graph. Make the current graph match the target graph.'
      hint = 'Use `git checkout main`.'
    }
  } else if (id <= 30) {
    // Merging
    const { start, target } = simpleMerge()
    startState = start
    targetState = target
    title = `Merge practice ${id - 20}`
    instructions =
      'Merge work from the feature branch back into main so the merge commit appears and matches the target. Make the current graph match the target graph.'
    hint = 'Ensure you are on main, then run `git merge feature`.'
  } else if (id <= 40) {
    // Multi-branch graphs: add extra branches without new commits
    const base = simpleMerge().target
    startState = base
    const moreBranches: SerializedGitState = {
      ...base,
      branches: {
        ...base.branches,
        'hotfix': { name: 'hotfix', head: 'c1' },
        'experiment': { name: 'experiment', head: 'f1' },
      },
      headBranch: base.headBranch,
    }
    targetState = moreBranches
    title = `Multi-branch layout ${id - 30}`
    instructions =
      'Create additional branches pointing at the indicated commits so the branch labels match the target graph. Make the current graph match the target graph.'
    hint = 'Use `git branch hotfix` and `git branch experiment` from the appropriate commits.'
  } else {
    // Advanced history graphs - reuse merge pattern but expect HEAD on a non-main branch
    const { target } = simpleMerge()
    startState = target
    const detached: SerializedGitState = {
      ...target,
      headBranch: 'feature',
    }
    targetState = detached
    title = `HEAD focus ${id - 40}`
    instructions =
      'Adjust HEAD so it points at the same branch as the target graph while keeping the commit graph identical. Make the current graph match the target graph.'
    hint = 'Use `git checkout feature` to move HEAD.'
  }

  extraLevels.push({
    id,
    title,
    concept,
    instructions,
    hint,
    startState,
    targetState,
  })
}
