import React from 'react'
import { motion } from 'framer-motion'

interface BranchLabelProps {
  name: string
  x: number
  y: number
  attached?: boolean
}

export const BranchLabel: React.FC<BranchLabelProps> = ({
  name,
  x,
  y,
  attached = true,
}) => {
  const color =
    name === 'main' ? '#f9a8d4' : name === 'feature' ? '#22d3ee' : '#a5b4fc'

  return (
    <motion.g
      initial={{ x: x + 10, y: y - 2, opacity: 0 }}
      animate={{ x: x + 22, y: y - 8, opacity: 1 }}
      transition={{
        x: { type: 'spring', stiffness: 260, damping: 20 },
        y: { type: 'spring', stiffness: 260, damping: 20 },
        opacity: { duration: 0.2, ease: 'easeOut' },
      }}
    >
      <rect
        rx={6}
        ry={6}
        width={48}
        height={16}
        fill="rgba(15,23,42,0.9)"
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={24}
        y={11}
        textAnchor="middle"
        className="text-[9px] font-mono"
        fill={color}
      >
        {name}
      </text>
      {attached && (
        <line
          x1={-6}
          y1={8}
          x2={0}
          y2={8}
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
        />
      )}
    </motion.g>
  )
}
