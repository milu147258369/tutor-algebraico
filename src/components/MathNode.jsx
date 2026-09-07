import React, { useEffect, useRef } from 'react'
import katex from 'katex'

export default function MathNode({ formula, display = false }) {
  const ref = useRef()

  useEffect(() => {
    if (!ref.current) return
    if (!formula) {
      ref.current.textContent = ''
      return
    }

    let formatted = String(formula)
      .replace(/√\((.*?)\)/g, '\\sqrt{$1}')
      .replace(/√([a-zA-Z0-9])/g, '\\sqrt{$1}')
      .replace(/\^(\d+)/g, '^{$1}')
      .replace(/\*/g, '\\cdot ')

    try {
      katex.render(formatted, ref.current, { displayMode: display, throwOnError: false })
    } catch (e) {
      ref.current.textContent = formula
    }
  }, [formula])

  return <span ref={ref} />
}
