import React from 'react'
import { motion } from 'framer-motion'
import type {
  GitState,
  GitCommit,
  SerializedGitState,
  GitActionMeta,
} from '../engine/GitEngine'
import { CommitNode } from './CommitNode'
import { BranchLabel } from './BranchLabel'

interface GitGraphProps {
  state: GitState | SerializedGitState
  variant: 'current' | 'target'
}

interface PositionedCommit {
  commit: GitCommit
  x: number
  y: number
  lane: number
  depth: number
}

interface GraphEdge {
  key: string
  childId: string
  parentId: string
  parentIndex: number
  x1: number
  y1: number
  x2: number
  y2: number
  sameLane: boolean
  length: number
}

interface GraphSnapshot {
  commitIds: Set<string>
  edgeKeys: Set<string>
  branchHeads: Record<string, string>
  headBranch: string
}

const BRANCH_COLORS: Record<string, string> = {
  main: '#f472b6',
  feature: '#22d3ee',
}

function normaliseCommits(
  state: GitState | SerializedGitState,
): {
  commits: GitCommit[]
  branches: Record<string, { head: string }>
  headBranch: string
  lastAction?: GitActionMeta
} {
  if ((state as GitState).commits && (state as GitState).branches) {
    const s = state as GitState
    return {
      commits: s.commits,
      branches: Object.fromEntries(
        Object.entries(s.branches).map(([k, v]) => [k, { head: v.head }]),
      ),
      headBranch: s.headBranch,
      lastAction: s.lastAction,
    }
  }

  const serialized = state as SerializedGitState
  const commits: GitCommit[] = serialized.commits.map((c, index) => ({
    id: c.id,
    label: c.label ?? c.id,
    message: c.message,
    parents: [...c.parents],
    branch: c.branch,
    kind: c.kind ?? (c.parents.length > 1 ? 'merge' : 'normal'),
    index,
  }))
  const branches = Object.fromEntries(
    Object.entries(serialized.branches).map(([k, v]) => [k, { head: v.head }]),
  )
  return { commits, branches, headBranch: serialized.headBranch }
}

function buildBranchLanes(
  commits: GitCommit[],
  branches: Record<string, { head: string }>,
): Record<string, number> {
  const discovered = new Set<string>([...Object.keys(branches), ...commits.map((c) => c.branch)])
  const ordered = [
    ...(discovered.has('main') ? ['main'] : []),
    ...(discovered.has('feature') ? ['feature'] : []),
    ...Array.from(discovered)
      .filter((name) => name !== 'main' && name !== 'feature')
      .sort(),
  ]

  return Object.fromEntries(ordered.map((name, index) => [name, index]))
}

function layoutCommits(
  commits: GitCommit[],
  branchLanes: Record<string, number>,
): PositionedCommit[] {
  const laneWidth = 160
  const rowHeight = 120
  const commitById = new Map(commits.map((c) => [c.id, c]))
  const depthCache = new Map<string, number>()

  const getDepth = (commit: GitCommit): number => {
    const cached = depthCache.get(commit.id)
    if (cached !== undefined) return cached
    if (!commit.parents.length) {
      depthCache.set(commit.id, 0)
      return 0
    }
    const parentDepth = Math.max(
      ...commit.parents.map((id) => {
        const parent = commitById.get(id)
        return parent ? getDepth(parent) : 0
      }),
    )
    const depth = parentDepth + 1
    depthCache.set(commit.id, depth)
    return depth
  }

  return commits.map((c) => {
    const lane = branchLanes[c.branch] ?? Object.keys(branchLanes).length
    const depth = getDepth(c)
    const x = 120 + lane * laneWidth
    const y = 60 + depth * rowHeight
    return { commit: c, x, y, lane, depth }
  })
}

function buildEdges(positionedById: Map<string, PositionedCommit>, commits: GitCommit[]): GraphEdge[] {
  const edges: GraphEdge[] = []
  for (const child of commits) {
    const childPos = positionedById.get(child.id)
    if (!childPos) continue
    child.parents.forEach((parentId, parentIndex) => {
      const parentPos = positionedById.get(parentId)
      if (!parentPos) return
      const sameLane = parentPos.lane === childPos.lane
      const x1 = parentPos.x
      const y1 = parentPos.y
      const x2 = childPos.x
      const y2 = childPos.y
      const baseLength = Math.hypot(x2 - x1, y2 - y1)
      edges.push({
        key: `${child.id}::${parentId}`,
        childId: child.id,
        parentId,
        parentIndex,
        x1,
        y1,
        x2,
        y2,
        sameLane,
        length: Math.max(1, sameLane ? baseLength : baseLength * 1.38),
      })
    })
  }
  return edges
}

function edgePath(edge: GraphEdge, offsetX: number, offsetY: number): string {
  const x1 = edge.x1 + offsetX
  const y1 = edge.y1 + offsetY
  const x2 = edge.x2 + offsetX
  const y2 = edge.y2 + offsetY
  if (edge.sameLane) {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }
  return `M ${x1} ${y1} C ${x1} ${y1 + 44} ${x2} ${y2 - 44} ${x2} ${y2}`
}

function toSnapshot(
  commits: GitCommit[],
  branches: Record<string, { head: string }>,
  edges: GraphEdge[],
  headBranch: string,
): GraphSnapshot {
  return {
    commitIds: new Set(commits.map((c) => c.id)),
    edgeKeys: new Set(edges.map((e) => e.key)),
    branchHeads: Object.fromEntries(
      Object.entries(branches).map(([name, b]) => [name, b.head]),
    ),
    headBranch,
  }
}

export const GitGraph: React.FC<GitGraphProps> = ({ state, variant }) => {
  const { commits, branches, headBranch, lastAction } = normaliseCommits(state)
  const previousSnapshotRef = React.useRef<GraphSnapshot | null>(null)

  const branchLanes = React.useMemo(
    () => buildBranchLanes(commits, branches),
    [commits, branches],
  )
  const positioned = React.useMemo(
    () => layoutCommits(commits, branchLanes),
    [commits, branchLanes],
  )
  const positionedById = React.useMemo(
    () => new Map(positioned.map((node) => [node.commit.id, node])),
    [positioned],
  )
  const edges = React.useMemo(
    () => buildEdges(positionedById, commits),
    [positionedById, commits],
  )
  const headCommit = React.useMemo(() => {
    const headId = branches[headBranch]?.head
    return headId ? positionedById.get(headId) ?? null : null
  }, [branches, headBranch, positionedById])
  const snapshot = React.useMemo(
    () => toSnapshot(commits, branches, edges, headBranch),
    [commits, branches, edges, headBranch],
  )
  const snapshotSignature = React.useMemo(() => {
    const commitSig = commits.map((c) => c.id).join('|')
    const branchSig = Object.entries(branches)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, b]) => `${name}:${b.head}`)
      .join('|')
    return `${commitSig}::${branchSig}::${headBranch}`
  }, [commits, branches, headBranch])

  const previousSnapshot = previousSnapshotRef.current
  const newCommitIds = React.useMemo(() => {
    if (!previousSnapshot || variant === 'target') return new Set<string>()
    return new Set(commits.map((c) => c.id).filter((id) => !previousSnapshot.commitIds.has(id)))
  }, [commits, previousSnapshot, variant])
  const newEdgeKeys = React.useMemo(() => {
    if (!previousSnapshot || variant === 'target') return new Set<string>()
    return new Set(edges.map((e) => e.key).filter((key) => !previousSnapshot.edgeKeys.has(key)))
  }, [edges, previousSnapshot, variant])
  const movedBranches = React.useMemo(() => {
    const moved = new Set<string>()
    if (!previousSnapshot || variant === 'target') return moved
    for (const [name, branch] of Object.entries(branches)) {
      if (previousSnapshot.branchHeads[name] !== branch.head) moved.add(name)
    }
    return moved
  }, [branches, previousSnapshot, variant])
  const createdBranches = React.useMemo(() => {
    const created = new Set<string>()
    if (!previousSnapshot || variant === 'target') return created
    for (const name of Object.keys(branches)) {
      if (!(name in previousSnapshot.branchHeads)) created.add(name)
    }
    return created
  }, [branches, previousSnapshot, variant])

  React.useEffect(() => {
    previousSnapshotRef.current = snapshot
  }, [snapshot, snapshotSignature])

  const actionType = variant === 'current' ? lastAction?.type : undefined
  const actionCommitId = lastAction?.commitId
  const actionBranch = lastAction?.branchName

  const edgeDelay = (edge: GraphEdge): number => {
    if (!newEdgeKeys.has(edge.key)) return 0
    if (actionType === 'merge' && edge.childId === actionCommitId) {
      return edge.parentIndex === 1 ? 0 : 0.16
    }
    if (actionType === 'commit' && edge.childId === actionCommitId) return 0
    return 0.05
  }
  const nodeDelay = (commitId: string): number => {
    if (!newCommitIds.has(commitId)) return 0
    if (actionType === 'merge' && commitId === actionCommitId) return 0.34
    if (actionType === 'commit' && commitId === actionCommitId) return 0.2
    return 0.16
  }
  const branchDelay = (name: string): number => {
    if (actionType === 'merge' && name === actionBranch && movedBranches.has(name)) return 0.56
    if (actionType === 'commit' && name === actionBranch && movedBranches.has(name)) return 0.46
    if (actionType === 'branch' && createdBranches.has(name)) return 0
    return 0
  }

  const maxDepth = positioned.reduce((m, p) => Math.max(m, p.depth), 0)
  const topPadding = 80
  const laneWidth = 160
  const rowHeight = 120
  const minX = positioned.length ? Math.min(...positioned.map((p) => p.x)) : 0
  const maxX = positioned.length ? Math.max(...positioned.map((p) => p.x)) : 0
  const contentWidth = Math.max(1, maxX - minX + laneWidth * 0.5)
  const graphWidth = Math.max(520, contentWidth + laneWidth * 2)
  const graphHeight = Math.max(360, maxDepth * rowHeight + 200)
  const offsetX = (graphWidth - contentWidth) / 2 - minX
  const offsetY = topPadding

  const renderedById = React.useMemo(() => {
    return new Map(
      positioned.map((p) => [
        p.commit.id,
        { ...p, renderX: p.x + offsetX, renderY: p.y + offsetY },
      ]),
    )
  }, [positioned, offsetX, offsetY])

  const renderedHeadCommit = headCommit
    ? renderedById.get(headCommit.commit.id) ?? null
    : null
  const headDelay = actionType === 'checkout' ? 0.05 : actionType === 'merge' ? 0.64 : 0.48

  return (
    <div className="relative h-full min-h-[280px] rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.95)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(244,114,182,0.16),_transparent_60%)]" />
      <div className="relative h-full px-4 pt-4 pb-3 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-pink-400" />
            <span>main</span>
            <span className="ml-3 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>feature</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {variant === 'target' ? (
              <span className="rounded-full bg-emerald-950/70 px-2 py-0.5 border border-emerald-500/40 text-emerald-300">
                Target
              </span>
            ) : (
              <span className="rounded-full bg-slate-900/70 px-2 py-0.5 border border-slate-700 text-slate-200">
                Current
              </span>
            )}
          </div>
        </div>

        <div className="relative flex-1">
          <svg
            className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)]"
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {variant === 'current' && renderedHeadCommit && (
              <motion.circle
                key={`head-halo-${variant}`}
                cx={renderedHeadCommit.renderX}
                cy={renderedHeadCommit.renderY}
                r={24}
                fill="none"
                stroke="rgba(59,130,246,0.5)"
                strokeWidth={2}
                animate={{
                  cx: renderedHeadCommit.renderX,
                  cy: renderedHeadCommit.renderY,
                  r: [22, 30, 22],
                  strokeOpacity: [0.5, 0, 0.5],
                }}
                transition={{
                  cx: {
                    type: 'spring',
                    stiffness: 200,
                    damping: 25,
                    delay: headDelay,
                  },
                  cy: {
                    type: 'spring',
                    stiffness: 200,
                    damping: 25,
                    delay: headDelay,
                  },
                  r: { duration: 2.2, repeat: Infinity, ease: 'easeOut' },
                  strokeOpacity: { duration: 2.2, repeat: Infinity, ease: 'easeOut' },
                }}
              />
            )}

            {edges.map((edge) => {
              const child = positionedById.get(edge.childId)?.commit
              if (!child) return null
              const color =
                child.branch === 'feature'
                  ? BRANCH_COLORS.feature
                  : child.kind === 'merge'
                  ? '#4ade80'
                  : BRANCH_COLORS.main
              const isNewEdge = newEdgeKeys.has(edge.key)
              const drawDelay = edgeDelay(edge)
              return (
                <motion.path
                  key={`${edge.key}-${variant}`}
                  layout
                  d={edgePath(edge, offsetX, offsetY)}
                  fill="none"
                  stroke={color}
                  strokeWidth={variant === 'target' ? 1.5 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={
                    isNewEdge && variant === 'current'
                      ? {
                          opacity: 0,
                          strokeDasharray: edge.length,
                          strokeDashoffset: edge.length,
                        }
                      : false
                  }
                  animate={{
                    d: edgePath(edge, offsetX, offsetY),
                    opacity: variant === 'target' ? 0.35 : 0.9,
                    strokeDasharray: edge.length,
                    strokeDashoffset: 0,
                  }}
                  transition={{
                    layout: { type: 'spring', stiffness: 200, damping: 25 },
                    d: { type: 'spring', stiffness: 200, damping: 25 },
                    strokeDashoffset: {
                      duration: isNewEdge ? 0.62 : 0.2,
                      ease: 'easeOut',
                      delay: drawDelay,
                    },
                    opacity: { duration: 0.2, ease: 'easeOut' },
                  }}
                />
              )
            })}

            {positioned.map(({ commit }) => {
              const isHead =
                branches[headBranch] && branches[headBranch].head === commit.id
              const rendered = renderedById.get(commit.id)
              if (!rendered) return null
              return (
                <CommitNode
                  key={`${commit.id}-${variant}`}
                  commit={commit}
                  x={rendered.renderX}
                  y={rendered.renderY}
                  isHead={isHead}
                  variant={variant}
                  isNew={variant === 'current' ? newCommitIds.has(commit.id) : false}
                  popDelay={variant === 'current' ? nodeDelay(commit.id) : 0}
                />
              )
            })}

            {Object.entries(branches).map(([name, b]) => {
              const labelHeadCommit = renderedById.get(b.head)
              if (!labelHeadCommit) return null
              const isNewBranch = createdBranches.has(name)
              return (
                <motion.g
                  key={`${name}-${variant}`}
                  layout
                  initial={
                    isNewBranch && variant === 'current'
                      ? { x: -14, y: 8, opacity: 0 }
                      : false
                  }
                  animate={{
                    x: 0,
                    y: 0,
                    opacity: variant === 'target' ? 0.8 : 1,
                  }}
                  transition={{
                    layout: { type: 'spring', stiffness: 200, damping: 25 },
                    x: { type: 'spring', stiffness: 260, damping: 20 },
                    y: { duration: 0.28, ease: 'easeOut' },
                    opacity: {
                      duration: 0.22,
                      ease: 'easeOut',
                      delay: branchDelay(name),
                    },
                  }}
                >
                  <BranchLabel
                    name={name}
                    x={labelHeadCommit.renderX}
                    y={labelHeadCommit.renderY}
                    attached={variant === 'current'}
                  />
                </motion.g>
              )
            })}

            {variant === 'current' && renderedHeadCommit && (
              <motion.g
                key="head-pointer"
                animate={{ x: renderedHeadCommit.renderX, y: renderedHeadCommit.renderY - 30 }}
                transition={{
                  x: {
                    type: 'spring',
                    stiffness: 200,
                    damping: 25,
                    delay: headDelay,
                  },
                  y: {
                    type: 'spring',
                    stiffness: 200,
                    damping: 25,
                    delay: headDelay,
                  },
                }}
              >
                <path d="M -7 -8 L 7 -8 L 0 0 Z" fill="#bfdbfe" />
                <text
                  x={0}
                  y={-12}
                  textAnchor="middle"
                  className="text-[9px] font-mono"
                  fill="#bfdbfe"
                >
                  HEAD
                </text>
              </motion.g>
            )}
          </svg>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>
              commits: <span className="text-slate-200">{commits.length}</span>
            </span>
            <span>
              branches:{' '}
              <span className="text-slate-200">
                {Object.keys(branches)
                  .map((b) => (b === headBranch ? `${b}*` : b))
                  .join(', ')}
              </span>
            </span>
          </div>
          <span>
            {variant === 'current'
              ? 'Match the ghosted target to clear the level.'
              : 'Target layout'}
          </span>
        </div>
      </div>
    </div>
  )
}
