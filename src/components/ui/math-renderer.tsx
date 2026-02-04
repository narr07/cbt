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

  // 1. Convert Tiptap math nodes to delimiters
  // Supports: data-type="mathematics", "inline-math", "block-math"
  // and both span and div tags
  const processedContent = content.replace(
    /<(span|div)[^>]*data-latex="([^"]*)"[^>]*>.*?<\/\1>/g,
    (match, tag, latex) => {
      const isBlock = match.includes('block-math') || tag === 'div'
      return isBlock ? `$$${latex}$$` : `$${latex}$`
    }
  )

  // 2. Split content by $$ (block math) and $ (inline math)
  const parts = processedContent.split(/(\$\$.*?\$\$|\$.*?\$)/g)

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (!part) return null

        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.substring(2, part.length - 2).trim()
          return <BlockMath key={index} math={formula} />
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.substring(1, part.length - 1).trim()
          return <InlineMath key={index} math={formula} />
        }

        // Render regular HTML parts safely
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{ __html: part }}
            className="inline"
          />
        )
      })}
    </div>
  )
}
