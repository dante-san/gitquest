import React from 'react'
import { motion } from 'framer-motion'
import type { GitCommit } from '../engine/GitEngine'

interface CommitNodeProps {
  commit: GitCommit
  x: number
  y: number
  isHead: boolean
  variant: 'current' | 'target'
  isNew?: boolean
  popDelay?: number
}

export const CommitNode: React.FC<CommitNodeProps> = ({
  commit,
  x,
  y,
  variant,
  isNew = false,
  popDelay = 0,
}) => {
  const nodeRadius = 12
  const color =
    commit.branch === 'feature'
      ? '#22d3ee'
      : commit.kind === 'merge'
      ? '#4ade80'
      : '#f472b6'

  const base = (
    <motion.g
      layout
      transform={`translate(${x}, ${y})`}
      initial={
        isNew
          ? { scale: commit.kind === 'merge' ? 0.5 : 0.6, opacity: 0 }
          : undefined
      }
      animate={{
        scale: isNew
          ? commit.kind === 'merge'
            ? [0.5, 1.14, 1]
            : [0.6, 1]
          : 1,
        opacity: 1,
      }}
      transition={{
        layout: { type: 'spring', stiffness: 200, damping: 25 },
        scale: {
          type: 'spring',
          stiffness: commit.kind === 'merge' ? 360 : 280,
          damping: commit.kind === 'merge' ? 18 : 22,
          delay: popDelay,
        },
        opacity: { duration: 0.24, ease: 'easeOut', delay: popDelay },
      }}
    >
      <defs>
        <radialGradient id={`orb-${commit.id}`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f9fafb" stopOpacity="1" />
          <stop offset="40%" stopColor="#cbd5f5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#020617" stopOpacity="1" />
        </radialGradient>
      </defs>
      <circle
        cx={0}
        cy={0}
        r={nodeRadius}
        fill={`url(#orb-${commit.id})`}
        stroke={color}
        strokeWidth={variant === 'target' ? 1.5 : 2}
        opacity={variant === 'target' ? 0.25 : 1}
      />
      {variant === 'current' && (
        <circle
          cx={0}
          cy={0}
          r={nodeRadius + 9}
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={2}
        />
      )}
      <text
        x={0}
        y={nodeRadius + 16}
        textAnchor="middle"
        className="text-[9px] font-mono"
        fill={variant === 'target' ? '#64748b' : '#cbd5f5'}
      >
        {commit.label}
      </text>
    </motion.g>
  )

  return base
}
