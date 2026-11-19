import { useQuery } from '@tanstack/react-query'
import { categoryService } from '@/services/categoryService'
import { queryClient } from '@/lib/queryClient'
import { Category, CategoryType, CategoryTree } from '@/types/category'

export const CATEGORIES_QUERY_KEY = ['categories'] as const

export function useCategoriesQuery(type?: CategoryType, parentId?: string) {
  return useQuery<Category[]>({
    queryKey: [...CATEGORIES_QUERY_KEY, { type, parentId }],
    queryFn: () => categoryService.getCategories(type, parentId),
    staleTime: 1000 * 60 * 10, // 10 minutes (categories change rarely)
  })
}

export function useCategoryTreeQuery(type?: CategoryType) {
  return useQuery<CategoryTree[]>({
    queryKey: [...CATEGORIES_QUERY_KEY, 'tree', { type }],
    queryFn: () => categoryService.getCategoryTree(type),
    staleTime: 1000 * 60 * 10,
  })
}

export function invalidateCategories() {
  return queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
}
