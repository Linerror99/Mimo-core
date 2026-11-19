import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/services/projectService'
import { queryClient } from '@/lib/queryClient'
import { Project, ProjectDetail } from '@/types/project'

export const PROJECTS_QUERY_KEY = ['projects'] as const

export function useProjectsQuery() {
  return useQuery<Project[]>({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: () => projectService.getProjects(),
    staleTime: 1000 * 60 * 3, // 3 minutes
  })
}

export function useProjectDetailQuery(projectId: string | null | undefined) {
  return useQuery<ProjectDetail>({
    queryKey: [...PROJECT_QUERY_KEY(projectId || '')],
    queryFn: () => projectService.getProject(projectId!),
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 2,
  })
}

export const PROJECT_QUERY_KEY = (id: string) => ['projects', id] as const

export function invalidateProjects() {
  return queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
}
