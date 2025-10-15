'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { 
  ManufacturingProduct,
  ManufacturingProductWithDetails,
  CreateManufacturingProductRequest,
  UpdateManufacturingProductRequest,
  BatchCalculateCOGSRequest,
  BatchCalculateCOGSResponse,
  COGSBreakdown,
  COGSCalculationResult,
  ProductMetrics,
  validateManufacturingProduct,
  calculateProfitMargin,
  analyzeCOGSChange
} from '@/types/products';

const supabase = createAdminClient();

// Products Server Actions
export async function getProducts(options?: {
  status?: 'draft' | 'active' | 'discontinued';
  include_formula?: boolean;
  include_cogs_breakdown?: boolean;
}): Promise<{
  success: boolean;
  data?: ManufacturingProductWithDetails[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = supabase
      .from('manufacturing_products')
      .select(`
        *,
        formula_version_id (
          id,
          version_number,
          is_active,
          formulas (
            id,
            name
          )
        ),
        packaging_material_id (
          id,
          name,
          code,
          cost_per_unit,
          material_categories (
            prefix
          )
        ),
        label_material_id (
          id,
          name,
          code,
          cost_per_unit,
          material_categories (
            prefix
          )
        )
      `)
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching manufacturing products:', error);
      return { success: false, error: 'Failed to fetch products' };
    }

    let enhancedData = data as ManufacturingProductWithDetails[];

    // If includeFormula is true, fetch formula ingredients
    if (options?.include_formula && enhancedData) {
      enhancedData = await Promise.all(
        enhancedData.map(async (product) => {
          if (product.formula_version_id) {
            const { data: ingredients } = await supabase
              .from('formula_ingredients')
              .select(`
                *,
                materials (
                  id,
                  name,
                  code,
                  cost_per_unit,
                  unit_type,
                  material_type,
                  material_categories (
                    prefix
                  )
                )
              `)
              .eq('formula_version_id', product.formula_version_id.id);

            return {
              ...product,
              formula_ingredients: ingredients || []
            };
          }
          return product;
        })
      );
    }

    // If includeCOGSBreakdown is true, calculate detailed COGS breakdown
    if (options?.include_cogs_breakdown && enhancedData) {
      enhancedData = await Promise.all(
        enhancedData.map(async (product) => {
          const breakdown = await calculateDetailedCOGSBreakdown(product, userId);
          return {
            ...product,
            cogs_breakdown: breakdown
          };
        })
      );
    }

    return { success: true, data: enhancedData };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function getProduct(
  id: string,
  options?: {
    include_formula?: boolean;
    include_cogs_breakdown?: boolean;
  }
): Promise<{
  success: boolean;
  data?: ManufacturingProductWithDetails;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('manufacturing_products')
      .select(`
        *,
        formula_version_id (
          id,
          version_number,
          is_active,
          notes,
          created_at,
          formulas (
            id,
            name,
            description
          )
        ),
        packaging_material_id (
          id,
          name,
          code,
          description,
          cost_per_unit,
          unit_type,
          supplier,
          material_categories (
            prefix
          )
        ),
        label_material_id (
          id,
          name,
          code,
          description,
          cost_per_unit,
          unit_type,
          supplier,
          material_categories (
            prefix
          )
        )
      `)
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Product not found' };
      }
      console.error('Error fetching manufacturing product:', error);
      return { success: false, error: 'Failed to fetch product' };
    }

    let enhancedData = data as ManufacturingProductWithDetails;

    // If includeFormula is true, fetch formula ingredients
    if (options?.include_formula && enhancedData.formula_version_id) {
      const { data: ingredients } = await supabase
        .from('formula_ingredients')
        .select(`
          *,
          materials (
            id,
            name,
            code,
            description,
            cost_per_unit,
            unit_type,
            material_type,
            supplier,
            material_categories (
              prefix
            )
          )
        `)
        .eq('formula_version_id', enhancedData.formula_version_id.id);

      enhancedData = {
        ...enhancedData,
        formula_ingredients: ingredients || []
      };
    }

    // If includeCOGSBreakdown is true, calculate detailed COGS breakdown
    if (options?.include_cogs_breakdown) {
      const breakdown = await calculateDetailedCOGSBreakdown(enhancedData, userId);
      enhancedData = {
        ...enhancedData,
        cogs_breakdown: breakdown
      };
    }

    return { success: true, data: enhancedData };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function createProduct(productData: CreateManufacturingProductRequest): Promise<{
  success: boolean;
  data?: ManufacturingProductWithDetails;
  warnings?: string[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate product data
    const validation = validateManufacturingProduct(productData);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const { 
      name, 
      description, 
      sku, 
      formula_version_id, 
      packaging_material_id, 
      label_material_id, 
      net_weight, 
      net_weight_unit,
      selling_price,
      auto_calculate_cogs = true 
    } = productData;

    // Verify formula version belongs to user if provided
    if (formula_version_id) {
      const { data: formulaVersion, error: formulaError } = await supabase
        .from('formula_versions')
        .select(`
          id,
          is_active,
          formulas (
            id,
            tenant_id
          )
        `)
        .eq('id', formula_version_id)
        .eq('tenant_id', userId)
        .single();

      if (formulaError || !formulaVersion) {
        return { success: false, error: 'Invalid formula version' };
      }

      if (!formulaVersion.is_active) {
        return { success: false, error: 'Cannot use inactive formula version' };
      }
    }

    // Verify packaging material belongs to user if provided
    if (packaging_material_id) {
      const { data: packagingMaterial, error: packagingError } = await supabase
        .from('materials')
        .select('id')
        .eq('id', packaging_material_id)
        .eq('tenant_id', userId)
        .eq('material_type', 'packaging')
        .single();

      if (packagingError || !packagingMaterial) {
        return { success: false, error: 'Invalid packaging material' };
      }
    }

    // Verify label material belongs to user if provided
    if (label_material_id) {
      const { data: labelMaterial, error: labelError } = await supabase
        .from('materials')
        .select('id')
        .eq('id', label_material_id)
        .eq('tenant_id', userId)
        .eq('material_type', 'label')
        .single();

      if (labelError || !labelMaterial) {
        return { success: false, error: 'Invalid label material' };
      }
    }

    // Check if SKU already exists
    if (sku) {
      const { data: existingProduct } = await supabase
        .from('manufacturing_products')
        .select('id')
        .eq('sku', sku)
        .eq('tenant_id', userId)
        .single();

      if (existingProduct) {
        return { success: false, error: 'SKU already exists' };
      }
    }

    const { data, error } = await supabase
      .from('manufacturing_products')
      .insert([{
        name,
        description: description || null,
        sku: sku || null,
        formula_version_id: formula_version_id || null,
        packaging_material_id: packaging_material_id || null,
        label_material_id: label_material_id || null,
        net_weight,
        net_weight_unit: net_weight_unit || 'g',
        cogs: auto_calculate_cogs ? 0 : null,
        selling_price: selling_price || null,
        status: 'draft',
        tenant_id: userId,
      }])
      .select(`
        *,
        formula_version_id (
          id,
          version_number,
          is_active,
          formulas (
            id,
            name
          )
        ),
        packaging_material_id (
          id,
          name,
          code,
          cost_per_unit,
          material_categories (
            prefix
          )
        ),
        label_material_id (
          id,
          name,
          code,
          cost_per_unit,
          material_categories (
            prefix
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error creating manufacturing product:', error);
      return { success: false, error: 'Failed to create product' };
    }

    let result = data as ManufacturingProductWithDetails;
    let finalCOGS: number | null = null;

    // Calculate COGS if auto_calculate_cogs is true
    if (auto_calculate_cogs) {
      const { cogs, error: cogsError } = await calculateProductCOGS(result.id, userId);
      
      if (!cogsError && cogs !== null) {
        // Update the product with calculated COGS
        const { data: updatedProduct } = await supabase
          .from('manufacturing_products')
          .update({ cogs })
          .eq('id', result.id)
          .select(`
            *,
            formula_version_id (
              id,
              version_number,
              is_active,
              formulas (
                id,
                name
              )
            ),
            packaging_material_id (
              id,
              name,
              code,
              cost_per_unit,
              material_categories (
                prefix
              )
            ),
            label_material_id (
              id,
              name,
              code,
              cost_per_unit,
              material_categories (
                prefix
              )
            )
          `)
          .single();

        result = updatedProduct as ManufacturingProductWithDetails;
        finalCOGS = cogs;
      } else if (cogsError) {
        console.error('Error calculating COGS:', cogsError);
        validation.warnings.push('COGS calculation failed - please recalculate manually');
      }
    }

    return { 
      success: true, 
      data: result, 
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateProduct(
  id: string,
  updateData: UpdateManufacturingProductRequest
): Promise<{
  success: boolean;
  data?: ManufacturingProductWithDetails;
  warnings?: string[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify product belongs to user
    const { data: existingProduct, error: fetchError } = await supabase
      .from('manufacturing_products')
      .select('id, tenant_id, formula_version_id, packaging_material_id, label_material_id, net_weight, net_weight_unit')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !existingProduct) {
      return { success: false, error: 'Product not found' };
    }

    const warnings: string[] = [];

    // Validate formula version if changing
    if (updateData.formula_version_id) {
      const { data: formulaVersion, error: formulaError } = await supabase
        .from('formula_versions')
        .select('id, is_active')
        .eq('id', updateData.formula_version_id)
        .eq('tenant_id', userId)
        .single();

      if (formulaError || !formulaVersion) {
        return { success: false, error: 'Invalid formula version' };
      }

      if (!formulaVersion.is_active) {
        return { success: false, error: 'Cannot use inactive formula version' };
      }
    }

    // Validate packaging material if changing
    if (updateData.packaging_material_id) {
      const { data: packagingMaterial, error: packagingError } = await supabase
        .from('materials')
        .select('id')
        .eq('id', updateData.packaging_material_id)
        .eq('tenant_id', userId)
        .eq('material_type', 'packaging')
        .single();

      if (packagingError || !packagingMaterial) {
        return { success: false, error: 'Invalid packaging material' };
      }
    }

    // Validate label material if changing
    if (updateData.label_material_id) {
      const { data: labelMaterial, error: labelError } = await supabase
        .from('materials')
        .select('id')
        .eq('id', updateData.label_material_id)
        .eq('tenant_id', userId)
        .eq('material_type', 'label')
        .single();

      if (labelError || !labelMaterial) {
        return { success: false, error: 'Invalid label material' };
      }
    }

    // Check if SKU already exists (if changing SKU)
    if (updateData.sku && updateData.sku !== existingProduct.id) {
      const { data: existingSKU } = await supabase
        .from('manufacturing_products')
        .select('id')
        .eq('sku', updateData.sku)
        .eq('tenant_id', userId)
        .neq('id', id)
        .single();

      if (existingSKU) {
        return { success: false, error: 'SKU already exists' };
      }
    }

    const { data, error } = await supabase
      .from('manufacturing_products')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', userId)
      .select(`
        *,
        formula_version_id (
          id,
          version_number,
          is_active,
          formulas (
            id,
            name
          )
        ),
        packaging_material_id (
          id,
          name,
          code,
          cost_per_unit,
          material_categories (
            prefix
          )
        ),
        label_material_id (
          id,
          name,
          code,
          cost_per_unit,
          material_categories (
            prefix
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error updating manufacturing product:', error);
      return { success: false, error: 'Failed to update product' };
    }

    let result = data as ManufacturingProductWithDetails;

    // Recalculate COGS if requested or if relevant fields changed
    if (updateData.recalculate_cogs || 
        updateData.formula_version_id || 
        updateData.packaging_material_id || 
        updateData.label_material_id || 
        updateData.net_weight) {
      
      const { cogs, error: cogsError } = await calculateProductCOGS(id, userId);
      
      if (!cogsError && cogs !== null) {
        // Update the product with calculated COGS
        const { data: updatedProduct } = await supabase
          .from('manufacturing_products')
          .update({ cogs })
          .eq('id', id)
          .select(`
            *,
            formula_version_id (
              id,
              version_number,
              is_active,
              formulas (
                id,
                name
              )
            ),
            packaging_material_id (
              id,
              name,
              code,
              cost_per_unit,
              material_categories (
                prefix
              )
            ),
            label_material_id (
              id,
              name,
              code,
              cost_per_unit,
              material_categories (
                prefix
              )
            )
          `)
          .single();

        result = updatedProduct as ManufacturingProductWithDetails;
      } else if (cogsError) {
        console.error('Error calculating COGS:', cogsError);
        warnings.push('COGS calculation failed - please recalculate manually');
      }
    }

    return { success: true, data: result, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteProduct(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('manufacturing_products')
      .delete()
      .eq('id', id)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error deleting manufacturing product:', error);
      return { success: false, error: 'Failed to delete product' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// COGS Calculation Server Actions
export async function calculateProductCOGS(
  productId: string, 
  userId?: string
): Promise<{
  cogs: number | null;
  error?: string;
}> {
  try {
    if (!userId) {
      const { userId: authUserId } = await auth();
      if (!authUserId) {
        return { cogs: null, error: 'Unauthorized' };
      }
      userId = authUserId;
    }

    const { data, error } = await supabase
      .rpc('calculate_product_cogs', { 
        p_product_id: productId 
      });

    if (error) {
      console.error('Error calling calculate_product_cogs function:', error);
      return { cogs: null, error: 'Failed to calculate COGS' };
    }

    return { cogs: data };
  } catch (error) {
    console.error('Unexpected error calculating COGS:', error);
    return { cogs: null, error: 'Internal server error' };
  }
}

export async function calculateProductCOGSWithBreakdown(
  productId: string
): Promise<{
  success: boolean;
  data?: COGSCalculationResult;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get product details
    const { data: product, error: fetchError } = await getProduct(productId, { include_formula: true });
    
    if (fetchError || !product) {
      return { success: false, error: 'Product not found' };
    }

    // Calculate COGS
    const { cogs, error: cogsError } = await calculateProductCOGS(productId, userId);
    
    if (cogsError || cogs === null) {
      return { success: false, error: 'Failed to calculate COGS' };
    }

    // Update product with new COGS
    await supabase
      .from('manufacturing_products')
      .update({ cogs })
      .eq('id', productId)
      .eq('tenant_id', userId);

    // Get detailed breakdown
    const breakdown = await calculateDetailedCOGSBreakdown(product, userId);

    const result: COGSCalculationResult = {
      data: { ...product, cogs },
      cogs,
      previous_cogs: product.cogs,
      calculation_timestamp: new Date().toISOString(),
      cogs_breakdown: breakdown
    };

    return { success: true, data: result };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function batchCalculateCOGS(
  request: BatchCalculateCOGSRequest
): Promise<{
  success: boolean;
  data?: BatchCalculateCOGSResponse;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { product_ids, include_breakdown = false, filter_options = {} } = request;

    let productsToProcess: string[] = [];

    // If specific product IDs provided, use those
    if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
      // Verify all products belong to user
      const { data: userProducts, error: verifyError } = await supabase
        .from('manufacturing_products')
        .select('id')
        .eq('tenant_id', userId)
        .in('id', product_ids);

      if (verifyError) {
        return { success: false, error: 'Failed to verify product ownership' };
      }

      productsToProcess = userProducts?.map(p => p.id) || [];
    } else {
      // If no specific IDs, get products based on filter options
      let query = supabase
        .from('manufacturing_products')
        .select('id')
        .eq('tenant_id', userId);

      // Apply filters
      if (filter_options.status) {
        query = query.eq('status', filter_options.status);
      }
      if (filter_options.has_formula !== undefined) {
        if (filter_options.has_formula) {
          query = query.not('formula_version_id', 'is', null);
        } else {
          query = query.is('formula_version_id', null);
        }
      }
      if (filter_options.updated_since) {
        query = query.gte('updated_at', filter_options.updated_since);
      }

      const { data: filteredProducts, error: filterError } = await query;
      
      if (filterError) {
        return { success: false, error: 'Failed to filter products' };
      }

      productsToProcess = filteredProducts?.map(p => p.id) || [];
    }

    if (productsToProcess.length === 0) {
      return { 
        success: true, 
        data: {
          message: 'No products to process',
          summary: { total_processed: 0, successful: 0, failed: 0, total_cgs_calculated: 0 },
          results: [],
          errors: [],
          calculation_timestamp: new Date().toISOString()
        }
      };
    }

    // Process products
    const results = [];
    const errors = [];

    for (const productId of productsToProcess) {
      try {
        if (include_breakdown) {
          const result = await calculateProductCOGSWithBreakdown(productId);
          if (result.success && result.data) {
            results.push({
              id: productId,
              name: result.data.data.name,
              sku: result.data.data.sku,
              cogs: result.data.cogs,
              previous_cogs: result.data.previous_cogs,
              cogs_change: result.data.cogs - (result.data.previous_cogs || 0),
              calculation_timestamp: result.data.calculation_timestamp,
              cogs_breakdown: result.data.cogs_breakdown
            });
          } else {
            errors.push({
              product_id: productId,
              error: result.error || 'Unknown error'
            });
          }
        } else {
          const { data: product } = await getProduct(productId);
          if (product) {
            const { cogs, error: cogsError } = await calculateProductCOGS(productId, userId);
            
            if (!cogsError && cogs !== null) {
              // Update product
              await supabase
                .from('manufacturing_products')
                .update({ cogs })
                .eq('id', productId)
                .eq('tenant_id', userId);

              results.push({
                id: productId,
                name: product.name,
                sku: product.sku,
                cogs,
                previous_cogs: product.cogs,
                cogs_change: cogs - (product.cogs || 0),
                calculation_timestamp: new Date().toISOString()
              });
            } else {
              errors.push({
                product_id: productId,
                error: cogsError || 'Failed to calculate COGS'
              });
            }
          } else {
            errors.push({
              product_id: productId,
              error: 'Product not found'
            });
          }
        }
      } catch (error) {
        errors.push({
          product_id: productId,
          error: 'Unexpected error processing product'
        });
      }
    }

    const response: BatchCalculateCOGSResponse = {
      message: `Processed ${productsToProcess.length} products`,
      summary: {
        total_processed: productsToProcess.length,
        successful: results.length,
        failed: errors.length,
        total_cgs_calculated: results.reduce((sum, r) => sum + (r.cogs || 0), 0)
      },
      results,
      errors,
      calculation_timestamp: new Date().toISOString()
    };

    return { success: true, data: response };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Helper function to get detailed COGS breakdown
async function calculateDetailedCOGSBreakdown(product: any, userId: string): Promise<any> {
  // Implementation similar to the one in the API route
  // This would include the detailed breakdown calculation
  return {
    total_cogs: product.cogs || 0,
    ingredient_costs: [],
    packaging_cost: null,
    label_cost: null,
    errors: [],
    warnings: [],
    calculation_summary: {
      formula_cost: 0,
      packaging_cost: 0,
      label_cost: 0,
      total_cost: product.cogs || 0,
      profit_margin: calculateProfitMargin(product.cogs || 0, product.selling_price)
    }
  };
}