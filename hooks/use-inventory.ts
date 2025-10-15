import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getMaterialCategories, 
  getMaterials, 
  createMaterialCategory, 
  createMaterial, 
  updateMaterial, 
  deleteMaterial, 
  generateMaterialCode 
} from '@/app/actions/inventory'
import { toast } from 'sonner'

// Material Categories Hooks
export function useMaterialCategories() {
  return useQuery({
    queryKey: ['material-categories'],
    queryFn: () => getMaterialCategories(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateMaterialCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { name: string; prefix: string; description?: string }) => 
      createMaterialCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-categories'] })
      toast.success('Material category created successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create material category')
    },
  })
}

// Materials Hooks
export function useMaterials(filters?: {
  material_type?: 'raw_material' | 'packaging' | 'label';
  category_id?: string;
}) {
  return useQuery({
    queryKey: ['materials', filters],
    queryFn: () => getMaterials(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      category_id: string;
      name: string;
      code?: string;
      description?: string;
      cost_per_unit: number;
      unit_type: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
      material_type: 'raw_material' | 'packaging' | 'label';
      supplier?: string;
      min_stock_level?: number;
      current_stock?: number;
    }) => createMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material created successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create material')
    },
  })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      data: {
        category_id?: string;
        name?: string;
        code?: string;
        description?: string;
        cost_per_unit?: number;
        unit_type?: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
        material_type?: 'raw_material' | 'packaging' | 'label';
        supplier?: string;
        min_stock_level?: number;
        current_stock?: number;
      }
    }) => updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update material')
    },
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material deleted successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete material')
    },
  })
}

export function useGenerateMaterialCode() {
  return useMutation({
    mutationFn: (categoryPrefix: string) => generateMaterialCode(categoryPrefix),
    onError: (error) => {
      toast.error(error.message || 'Failed to generate material code')
    },
  })
}