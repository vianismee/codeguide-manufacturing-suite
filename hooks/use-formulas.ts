import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getFormulas, 
  getFormula, 
  createFormula, 
  updateFormula, 
  deleteFormula,
  getFormulaVersions,
  createFormulaVersion,
  activateFormulaVersion,
  compareFormulaVersionsAction
} from '@/app/actions/formulas'
import { toast } from 'sonner'

// Formulas Hooks
export function useFormulas(options?: {
  include_versions?: boolean;
  include_ingredients?: boolean;
}) {
  return useQuery({
    queryKey: ['formulas', options],
    queryFn: () => getFormulas(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useFormula(id: string, options?: {
  include_ingredients?: boolean;
}) {
  return useQuery({
    queryKey: ['formula', id, options],
    queryFn: () => getFormula(id, options),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateFormula() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      ingredients?: Array<{
        material_id: string;
        percentage: number;
      }>;
    }) => createFormula(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] })
      toast.success('Formula created successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create formula')
    },
  })
}

export function useUpdateFormula() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      data: {
        name?: string;
        description?: string;
      }
    }) => updateFormula(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] })
      queryClient.invalidateQueries({ queryKey: ['formula', variables.id] })
      toast.success('Formula updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update formula')
    },
  })
}

export function useDeleteFormula() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteFormula(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] })
      toast.success('Formula deleted successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete formula')
    },
  })
}

// Formula Versions Hooks
export function useFormulaVersions(formulaId: string, options?: {
  include_ingredients?: boolean;
}) {
  return useQuery({
    queryKey: ['formula-versions', formulaId, options],
    queryFn: () => getFormulaVersions(formulaId, options),
    enabled: !!formulaId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateFormulaVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      formulaId, 
      data 
    }: { 
      formulaId: string;
      data: {
        notes?: string;
        ingredients: Array<{
          material_id: string;
          percentage: number;
        }>;
        make_active?: boolean;
      };
    }) => createFormulaVersion(formulaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] })
      queryClient.invalidateQueries({ queryKey: ['formula', variables.formulaId] })
      queryClient.invalidateQueries({ queryKey: ['formula-versions', variables.formulaId] })
      toast.success('Formula version created successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create formula version')
    },
  })
}

export function useActivateFormulaVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ formulaId, versionId }: { formulaId: string; versionId: string }) => 
      activateFormulaVersion(formulaId, versionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] })
      queryClient.invalidateQueries({ queryKey: ['formula', variables.formulaId] })
      queryClient.invalidateQueries({ queryKey: ['formula-versions', variables.formulaId] })
      toast.success('Formula version activated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to activate formula version')
    },
  })
}

export function useCompareFormulaVersions() {
  return useMutation({
    mutationFn: ({ 
      formulaId, 
      version1Id, 
      version2Id 
    }: { 
      formulaId: string; 
      version1Id: string; 
      version2Id: string;
    }) => compareFormulaVersionsAction(formulaId, version1Id, version2Id),
    onError: (error) => {
      toast.error(error.message || 'Failed to compare formula versions')
    },
  })
}