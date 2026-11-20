import { useQuery } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'
import { queryClient } from '@/lib/queryClient'
import { Account } from '@/types/account'

export const ACCOUNTS_QUERY_KEY = ['accounts'] as const

export function useAccountsQuery(includeInactive = false) {
  return useQuery<Account[]>({
    queryKey: [...ACCOUNTS_QUERY_KEY, { includeInactive }],
    queryFn: () => accountService.getAccounts(includeInactive),
    staleTime: 1000 * 60 * 3, // 3 minutes
  })
}

export function invalidateAccounts() {
  return queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY })
}
