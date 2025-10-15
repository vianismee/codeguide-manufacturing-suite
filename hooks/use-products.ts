import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  calculateProductCOGSWithBreakdown,
  batchCalculateCOGS
} from '@/app/actions/products'
import { toast } from 'sonner'

// Products Hooks
export function useProducts(options?: {
  status?: 'draft' | 'active' | 'discontinued';
  include_formula?: boolean;
  include_cogs_breakdown?: boolean;
}) {
  return useQuery({
    queryKey: ['products', options],
    queryFn: () => getProducts(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useProduct(id: string, options?: {
  include_formula?: boolean;
  include_cogs_breakdown?: boolean;
}) {
  return useQuery({
    queryKey: ['product', id, options],
    queryFn: () => getProduct(id, options),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      sku?: string;
      formula_version_id?: string;
      packaging_material_id?: string;
      label_material_id?: string;
      net_weight: number;
      net_weight_unit?: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
      selling_price?: number;
      auto_calculate_cogs?: boolean;
    }) => createProduct(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      const message = result.warnings && result.warnings.length > 0
        ? 'Product created with warnings'
        : 'Product created successfully'
      toast.success(message)
      if (result.warnings) {
        result.warnings.forEach(warning => toast.warning(warning))
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create product')
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      id, 
      data 
    }: { 
      id: string;
      data: {
        name?: string;
        description?: string;
        sku?: string;
        formula_version_id?: string;
        packaging_material_id?: string;
        label_material_id?: string;
        net_weight?: number;
        net_weight_unit?: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
        selling_price?: number;
        status?: 'draft' | 'active' | 'discontinued';
        recalculate_cogs?: boolean;
      };
    }) => updateProduct(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', result.data?.id] })
      
      const message = result.warnings && result.warnings.length > 0
        ? 'Product updated with warnings'
        : 'Product updated successfully'
      toast.success(message)
      
      if (result.warnings) {
        result.warnings.forEach(warning => toast.warning(warning))
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update product')
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product')
    },
  })
}

// COGS Calculation Hooks
export function useCalculateProductCOGS() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (productId: string) => calculateProductCOGSWithBreakdown(productId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', result.data?.data.id] })
      toast.success('COGS calculated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to calculate COGS')
    },
  })
}

export function useBatchCalculateCOGS() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (request: {
      product_ids?: string[];
      include_breakdown?: boolean;
      filter_options?: {
        status?: 'draft' | 'active' | 'discontinued';
        has_formula?: boolean;
        updated_since?: string;
      };
    }) => batchCalculateCOGS(request),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      
      const { summary } = result.data!
      toast.success(
        `Batch calculation complete: ${summary.successful}/${summary.total_processed} products processed`
      )
      
      if (summary.failed > 0) {
        toast.error(`${summary.failed} products failed to calculate`)
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to calculate batch COGS')
    },
  })
}

// Products Metrics Hook
export function useProductsMetrics() {
  return useQuery({
    queryKey: ['products-metrics'],
    queryFn: async () => {
      // This would be a dedicated API call for metrics
      // For now, we'll calculate from the products data
      const { data: products } = await getProducts()
      
      if (!products) return null
      
      const totalProducts = products.length
      const activeProducts = products.filter(p => p.status === 'active').length
      const draftProducts = products.filter(p => p.status === 'draft').length
      const discontinuedProducts = products.filter(p => p.status === 'discontinued').length
      
      const productsWithCOGS = products.filter(p => p.cogs !== null)
      const averageCOGS = productsWithCOGS.length > 0 
        ? productsWithCOGS.reduce((sum, p) => sum + (p.cogs || 0), 0) / productsWithCOGS.length
        : 0
      
      const totalCOGSValue = products.reduce((sum, p) => sum + (p.cogs || 0), 0)
      
      const productsWithMargin = products.filter(p => p.cogs && p.selling_price)
      const averageProfitMargin = productsWithMargin.length > 0
        ? productsWithMargin.reduce((sum, p) => {
            const margin = ((p.selling_price! - p.cogs!) / p.selling_price!) * 100
            return sum + margin
          }, 0) / productsWithMargin.length
        : 0
      
      return {
        total_products: totalProducts,
        active_products: activeProducts,
        draft_products: draftProducts,
        discontinued_products: discontinuedProducts,
        average_cogs: averageCOGS,
        total_cogs_value: totalCOGSValue,
        average_profit_margin: averageProfitMargin,
        products_without_formula: products.filter(p => !p.formula_version_id).length,
        products_without_packaging: products.filter(p => !p.packaging_material_id).length,
        products_without_label: products.filter(p => !p.label_material_id).length,
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - metrics change frequently
  })
}