import { useQuery } from '@tanstack/react-query'
import { goalService, Goal } from '@/services/goalService'
import { queryClient } from '@/lib/queryClient'

export const GOALS_QUERY_KEY = ['goals'] as const

export function useGoalsQuery() {
  return useQuery<Goal[]>({
    queryKey: GOALS_QUERY_KEY,
    queryFn: () => goalService.list(),
    staleTime: 1000 * 60 * 3, // 3 minutes
  })
}

export function invalidateGoals() {
  return queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY })
}
