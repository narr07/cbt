'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        fallback: {},
      }}
    >
      {children}
    </SWRConfig>
  )
}
