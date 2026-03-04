import type { GitState, SerializedGitState } from './GitEngine'

export interface GraphDiff {
  missingCommits: string[]
  extraCommits: string[]
  branchMismatches: { branch: string; expectedHead: string; actualHead: string }[]
  headMismatch: boolean
}

export function compareGraphs(
  state: GitState,
  target: SerializedGitState,
): { match: boolean; diff: GraphDiff } {
  const diff: GraphDiff = {
    missingCommits: [],
    extraCommits: [],
    branchMismatches: [],
    headMismatch: false,
  }

  const targetIds = new Set(target.commits.map((c) => c.id))
  const stateIds = new Set(state.commits.map((c) => c.id))

  for (const id of targetIds) {
    if (!stateIds.has(id)) diff.missingCommits.push(id)
  }
  for (const id of stateIds) {
    if (!targetIds.has(id)) diff.extraCommits.push(id)
  }

  const stateMap = new Map(state.commits.map((c) => [c.id, c]))
  for (const t of target.commits) {
    const s = stateMap.get(t.id)
    if (!s) continue
    if (s.branch !== t.branch) {
      diff.extraCommits.push(t.id)
    }
    if (s.parents.length !== t.parents.length) {
      diff.extraCommits.push(t.id)
      continue
    }
    for (let i = 0; i < s.parents.length; i++) {
      if (s.parents[i] !== t.parents[i]) {
        diff.extraCommits.push(t.id)
        break
      }
    }
  }

  const stateBranches = Object.keys(state.branches).sort()
  const targetBranches = Object.keys(target.branches).sort()
  if (stateBranches.length !== targetBranches.length) {
    for (const b of stateBranches) {
      const s = state.branches[b]
      diff.branchMismatches.push({
        branch: b,
        expectedHead: target.branches[b]?.head ?? '(none)',
        actualHead: s.head,
      })
    }
  } else {
    for (let i = 0; i < stateBranches.length; i++) {
      const name = stateBranches[i]
      const s = state.branches[name]
      const t = target.branches[name]
      if (!t || s.head !== t.head) {
        diff.branchMismatches.push({
          branch: name,
          expectedHead: t?.head ?? '(none)',
          actualHead: s.head,
        })
      }
    }
  }

  diff.headMismatch = state.headBranch !== target.headBranch

  const match =
    diff.missingCommits.length === 0 &&
    diff.extraCommits.length === 0 &&
    diff.branchMismatches.length === 0 &&
    !diff.headMismatch

  return { match, diff }
}

