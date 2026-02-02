'use client'

import React from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathRendererProps {
  content: string
  className?: string
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  if (!content) return null

  // Split content by $$ (block math) and $ (inline math)
  // Regular expression to find $$...$$ or $...$
  // We use a non-greedy match to handle multiple formulas
  const parts = content.split(/(\$\$.*?\$\$|\$.*?\$)/g)

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.substring(2, part.length - 2)
          return <BlockMath key={index} math={formula} />
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.substring(1, part.length - 1)
          return <InlineMath key={index} math={formula} />
        }
        return <span key={index}>{part}</span>
      })}
    </div>
  )
}
