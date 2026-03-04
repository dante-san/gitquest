export type BranchName = string

export interface GitCommit {
  id: string
  /** Human-friendly short id */
  label: string
  message?: string
  parents: string[]
  branch: BranchName
  kind: 'normal' | 'merge'
  index: number
}

export interface GitBranch {
  name: BranchName
  /** Points to tip commit id */
  head: string
}

export interface GitState {
  commits: GitCommit[]
  branches: Record<string, GitBranch>
  /** HEAD symbolic ref - always a branch name in this simulation */
  headBranch: BranchName
  lastAction?: GitActionMeta
}

export interface GitActionMeta {
  id: number
  type: GitCommand['type'] | 'init' | 'reset'
  commitId?: string
  branchName?: string
  mergeFrom?: string
}

export type GitCommand =
  | { type: 'commit'; message?: string }
  | { type: 'branch'; name: string }
  | { type: 'checkout'; name: string }
  | { type: 'merge'; name: string }

export interface GitCommandResult {
  ok: boolean
  message: string
  state: GitState
}

export interface SerializedGitCommit {
  id: string
  label?: string
  message?: string
  parents: string[]
  branch: BranchName
  kind?: 'normal' | 'merge'
}

export interface SerializedGitState {
  commits: SerializedGitCommit[]
  branches: Record<string, { name: BranchName; head: string }>
  headBranch: BranchName
}

export function cloneState(state: GitState): GitState {
  return {
    commits: state.commits.map((c) => ({ ...c })),
    branches: Object.fromEntries(
      Object.entries(state.branches).map(([k, v]) => [k, { ...v }]),
    ),
    headBranch: state.headBranch,
  }
}

export function serializeState(state: GitState): SerializedGitState {
  return {
    commits: state.commits.map((c) => ({
      id: c.id,
      label: c.label,
      message: c.message,
      parents: [...c.parents],
      branch: c.branch,
      kind: c.kind,
    })),
    branches: Object.fromEntries(
      Object.entries(state.branches).map(([name, b]) => [
        name,
        { name: b.name, head: b.head },
      ]),
    ),
    headBranch: state.headBranch,
  }
}

export function hydrateState(serialized: SerializedGitState): GitState {
  const commits: GitCommit[] = serialized.commits.map((c, index) => ({
    id: c.id,
    label: c.label ?? c.id,
    message: c.message,
    parents: [...c.parents],
    branch: c.branch,
    kind: c.kind ?? (c.parents.length > 1 ? 'merge' : 'normal'),
    index,
  }))
  return {
    commits,
    branches: Object.fromEntries(
      Object.entries(serialized.branches).map(([name, b]) => [
        name,
        { name: b.name, head: b.head },
      ]),
    ),
    headBranch: serialized.headBranch,
  }
}

function createInitialState(): GitState {
  const first: GitCommit = {
    id: 'c0',
    label: 'c0',
    message: 'Initial commit',
    parents: [],
    branch: 'main',
    kind: 'normal',
    index: 0,
  }
  return {
    commits: [first],
    branches: { main: { name: 'main', head: first.id } },
    headBranch: 'main',
    lastAction: { id: 0, type: 'init', commitId: first.id, branchName: 'main' },
  }
}

function nextCommitId(state: GitState): string {
  return `c${state.commits.length}`
}

export class GitEngine {
  private state: GitState
  private actionId: number

  constructor(initial?: SerializedGitState) {
    this.state = initial ? hydrateState(initial) : createInitialState()
    this.actionId = this.state.commits.length
  }

  getState(): GitState {
    return this.state
  }

  reset(initial?: SerializedGitState) {
    this.state = initial ? hydrateState(initial) : createInitialState()
    this.actionId += 1
    this.state.lastAction = {
      id: this.actionId,
      type: 'reset',
      branchName: this.state.headBranch,
      commitId: this.state.branches[this.state.headBranch]?.head,
    }
  }

  applyCommand(cmd: GitCommand): GitCommandResult {
    switch (cmd.type) {
      case 'commit':
        return this.commit(cmd.message)
      case 'branch':
        return this.branch(cmd.name)
      case 'checkout':
        return this.checkout(cmd.name)
      case 'merge':
        return this.merge(cmd.name)
    }
  }

  private commit(message?: string): GitCommandResult {
    const state = cloneState(this.state)
    const branch = state.branches[state.headBranch]
    if (!branch) {
      return {
        ok: false,
        message:
          'HEAD is detached in this mini-sim. For GitQuest we always commit on a branch.',
        state: this.state,
      }
    }
    const parentId = branch.head
    const id = nextCommitId(state)
    const commit: GitCommit = {
      id,
      label: id,
      message: message || 'commit',
      parents: [parentId],
      branch: branch.name,
      kind: 'normal',
      index: state.commits.length,
    }
    state.commits.push(commit)
    branch.head = id
    state.branches[branch.name] = branch
    this.actionId += 1
    state.lastAction = {
      id: this.actionId,
      type: 'commit',
      commitId: id,
      branchName: branch.name,
    }
    this.state = state
    return { ok: true, message: 'Created a new commit on the current branch.', state }
  }

  private branch(name: string): GitCommandResult {
    const trimmed = name.trim()
    if (!trimmed) {
      return { ok: false, message: 'Usage: git branch <name>', state: this.state }
    }
    const state = cloneState(this.state)
    if (state.branches[trimmed]) {
      return {
        ok: false,
        message: `Branch "${trimmed}" already exists.`,
        state: this.state,
      }
    }
    const headBranch = state.branches[state.headBranch]
    if (!headBranch) {
      return {
        ok: false,
        message: 'HEAD is not pointing at a branch.',
        state: this.state,
      }
    }
    state.branches[trimmed] = {
      name: trimmed,
      head: headBranch.head,
    }
    this.actionId += 1
    state.lastAction = {
      id: this.actionId,
      type: 'branch',
      branchName: trimmed,
      commitId: headBranch.head,
    }
    this.state = state
    return {
      ok: true,
      message: `Created branch "${trimmed}" at the current commit.`,
      state,
    }
  }

  private checkout(name: string): GitCommandResult {
    const trimmed = name.trim()
    if (!trimmed) {
      return { ok: false, message: 'Usage: git checkout <branch>', state: this.state }
    }
    const state = cloneState(this.state)
    if (!state.branches[trimmed]) {
      return {
        ok: false,
        message: `Branch "${trimmed}" does not exist in this repo.`,
        state: this.state,
      }
    }
    state.headBranch = trimmed
    this.actionId += 1
    state.lastAction = {
      id: this.actionId,
      type: 'checkout',
      branchName: trimmed,
      commitId: state.branches[trimmed].head,
    }
    this.state = state
    return {
      ok: true,
      message: `HEAD moved to branch "${trimmed}".`,
      state,
    }
  }

  private merge(name: string): GitCommandResult {
    const trimmed = name.trim()
    if (!trimmed) {
      return { ok: false, message: 'Usage: git merge <branch>', state: this.state }
    }
    const state = cloneState(this.state)
    const current = state.branches[state.headBranch]
    const other = state.branches[trimmed]
    if (!current) {
      return {
        ok: false,
        message: 'HEAD is not pointing at a branch.',
        state: this.state,
      }
    }
    if (!other) {
      return {
        ok: false,
        message: `Branch "${trimmed}" does not exist.`,
        state: this.state,
      }
    }
    if (current.head === other.head) {
      return {
        ok: false,
        message: 'Nothing to merge - both branches point to the same commit.',
        state: this.state,
      }
    }
    const id = nextCommitId(state)
    const commit: GitCommit = {
      id,
      label: id,
      message: `Merge branch "${trimmed}"`,
      parents: [current.head, other.head],
      branch: current.name,
      kind: 'merge',
      index: state.commits.length,
    }
    state.commits.push(commit)
    current.head = id
    state.branches[current.name] = current
    this.actionId += 1
    state.lastAction = {
      id: this.actionId,
      type: 'merge',
      commitId: id,
      branchName: current.name,
      mergeFrom: trimmed,
    }
    this.state = state
    return {
      ok: true,
      message: `Merged "${trimmed}" into "${current.name}".`,
      state,
    }
  }
}
