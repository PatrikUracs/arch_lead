'use client'

import { useState, useRef, useEffect } from 'react'

interface FaqItem {
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: FaqItem[]
  className?: string
}

function AccordionItem({
  item,
  open,
  onToggle,
}: {
  item: FaqItem
  open: boolean
  onToggle: () => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (open) {
      el.style.maxHeight = `${el.scrollHeight}px`
    } else {
      el.style.maxHeight = '0px'
    }
  }, [open])

  return (
    <div
      style={{
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          padding: '20px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--dl-text-primary, #EDE5D0)',
          fontSize: 15,
          fontWeight: 400,
          fontFamily: 'var(--font-montserrat), system-ui, sans-serif',
        }}
      >
        <span>{item.question}</span>
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-soft)',
            fontSize: 20,
            lineHeight: 1,
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: '480ms var(--ease)',
          }}
        >
          +
        </span>
      </button>

      <div
        ref={bodyRef}
        style={{
          maxHeight: 0,
          overflow: 'hidden',
          transition: 'max-height 480ms var(--ease)',
        }}
      >
        <p
          style={{
            paddingBottom: 20,
            margin: 0,
            fontSize: 13,
            fontWeight: 300,
            lineHeight: 1.7,
            color: 'var(--text-mute)',
            fontFamily: 'var(--font-montserrat), system-ui, sans-serif',
          }}
        >
          {item.answer}
        </p>
      </div>
    </div>
  )
}

export default function FaqAccordion({ items, className = '' }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className={className}>
      {items.map((item, i) => (
        <AccordionItem
          key={i}
          item={item}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  )
}
