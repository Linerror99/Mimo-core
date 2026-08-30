import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function AccountsSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* Global Net Worth Card */}
      <Card className="p-6 md:p-8 rounded-3xl border border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-10 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
      </Card>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-6 rounded-2xl border border-slate-100 space-y-5 bg-white shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            <div className="space-y-1">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-8 w-40 rounded-lg" />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
