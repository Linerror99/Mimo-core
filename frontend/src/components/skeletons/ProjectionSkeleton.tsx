import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function ProjectionSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 rounded-2xl border border-slate-100 space-y-3 bg-white shadow-xs">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card className="p-6 rounded-3xl border border-slate-100 space-y-6 bg-white shadow-xs">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </Card>

      {/* Monthly Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-5 rounded-2xl border border-slate-100 space-y-4 bg-white shadow-xs">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
