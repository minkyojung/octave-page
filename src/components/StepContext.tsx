'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// Which of Plan, Build and Ship the headline is on, so the screenshot can follow it.
const StepContext = createContext<{ index: number; setIndex: (index: number) => void } | null>(null)

export function StepProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0)
  return <StepContext value={{ index, setIndex }}>{children}</StepContext>
}

export function useStep() {
  const value = useContext(StepContext)
  if (!value) throw new Error('useStep must be used inside StepProvider')
  return value
}
