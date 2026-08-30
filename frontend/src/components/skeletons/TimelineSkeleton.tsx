import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function TimelineSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px] rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </Card>

      {/* Timeline Stream */}
      <div className="space-y-6">
        {[1, 2].map((section) => (
          <div key={section} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-36 rounded-full" />
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <Card className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-40 rounded-md" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-20 rounded-md" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="w-8 h-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
