import { queryClient } from './queryClient'

/**
 * Invalidate financial caches across the application when a transaction,
 * account, project, or goal is updated.
 */
export function invalidateFinancialData() {
  queryClient.invalidateQueries({ queryKey: ['accounts'] })
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  queryClient.invalidateQueries({ queryKey: ['goals'] })
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: ['timeline'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['projection'] })

  // Also dispatch legacy custom event for backward compatibility with components still listening
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mimo-transaction-created'))
  }
}
