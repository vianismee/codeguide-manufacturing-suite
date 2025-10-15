import { createAdminClient } from '@/utils/supabase/admin';
import { Database } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// POST /api/products/batch-calculate-cogs - Calculate COGS for multiple products
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { product_ids, include_breakdown = false, filter_options = {} } = body;

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
        console.error('Error verifying product ownership:', verifyError);
        return NextResponse.json({ error: 'Failed to verify product ownership' }, { status: 500 });
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
        console.error('Error filtering products:', filterError);
        return NextResponse.json({ error: 'Failed to filter products' }, { status: 500 });
      }

      productsToProcess = filteredProducts?.map(p => p.id) || [];
    }

    if (productsToProcess.length === 0) {
      return NextResponse.json({ 
        message: 'No products to process',
        results: []
      });
    }

    // Process products in batches to avoid timeout
    const batchSize = 10;
    const results = [];
    const errors = [];

    for (let i = 0; i < productsToProcess.length; i += batchSize) {
      const batch = productsToProcess.slice(i, i + batchSize);
      
      for (const productId of batch) {
        try {
          const result = await calculateProductCOGS(productId, userId, include_breakdown);
          if (result.success) {
            results.push(result.data);
          } else {
            errors.push({
              product_id: productId,
              error: result.error
            });
          }
        } catch (error) {
          errors.push({
            product_id: productId,
            error: 'Unexpected error processing product'
          });
        }
      }
    }

    const response = {
      message: `Processed ${productsToProcess.length} products`,
      summary: {
        total_processed: productsToProcess.length,
        successful: results.length,
        failed: errors.length,
        total_cgs_calculated: results.reduce((sum, r) => sum + (r.cogs || 0), 0)
      },
      results: results,
      errors: errors,
      calculation_timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate COGS for a single product
async function calculateProductCOGS(
  productId: string, 
  userId: string, 
  includeBreakdown: boolean = false
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // Get product details
    const { data: product, error: fetchError } = await supabase
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
          unit_type,
          material_categories (
            prefix
          )
        ),
        label_material_id (
          id,
          name,
          code,
          cost_per_unit,
          unit_type,
          material_categories (
            prefix
          )
        )
      `)
      .eq('id', productId)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !product) {
      return { success: false, error: 'Product not found' };
    }

    // Calculate COGS using database function
    const { data: cogs, error: cogsError } = await supabase
      .rpc('calculate_product_cogs', { 
        p_product_id: productId 
      });

    if (cogsError) {
      return { success: false, error: 'Failed to calculate COGS' };
    }

    // Update product with new COGS
    const { data: updatedProduct, error: updateError } = await supabase
      .from('manufacturing_products')
      .update({ cogs })
      .eq('id', productId)
      .select(`
        id,
        name,
        sku,
        cogs,
        selling_price,
        updated_at
      `)
      .single();

    if (updateError) {
      return { success: false, error: 'Failed to update product COGS' };
    }

    const result: any = {
      ...updatedProduct,
      previous_cogs: product.cogs,
      cogs_change: cogs - (product.cogs || 0),
      calculation_timestamp: new Date().toISOString()
    };

    // Include detailed breakdown if requested
    if (includeBreakdown) {
      const breakdown = await calculateDetailedCOGSBreakdown(product, userId);
      result.cogs_breakdown = breakdown;
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error calculating product COGS:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Helper function to get detailed COGS breakdown
async function calculateDetailedCOGSBreakdown(product: any, userId: string): Promise<{
  total_cogs: number;
  ingredient_costs: Array<{
    material_id: string;
    material_name: string;
    material_code: string;
    percentage: number;
    cost_per_unit: number;
    unit_type: string;
    calculated_cost: number;
  }>;
  packaging_cost: any;
  label_cost: any;
  errors: string[];
  warnings: string[];
}> {
  const breakdown = {
    total_cogs: 0,
    ingredient_costs: [] as any[],
    packaging_cost: null,
    label_cost: null,
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    // Calculate ingredient costs if formula is set
    if (product.formula_version_id) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('formula_ingredients')
        .select(`
          *,
          materials (
            id,
            name,
            code,
            cost_per_unit,
            unit_type
          )
        `)
        .eq('formula_version_id', product.formula_version_id.id);

      if (ingredientsError) {
        breakdown.errors.push('Failed to fetch formula ingredients');
      } else if (ingredients) {
        let ingredientTotal = 0;
        
        for (const ingredient of ingredients) {
          const material = ingredient.materials;
          let calculatedCost = 0;

          // Convert units and calculate cost
          const weightInMaterialUnits = convertWeight(
            product.net_weight,
            product.net_weight_unit,
            material.unit_type
          );

          calculatedCost = (ingredient.percentage / 100) * weightInMaterialUnits * material.cost_per_unit;
          ingredientTotal += calculatedCost;

          breakdown.ingredient_costs.push({
            material_id: material.id,
            material_name: material.name,
            material_code: material.code,
            percentage: ingredient.percentage,
            cost_per_unit: material.cost_per_unit,
            unit_type: material.unit_type,
            calculated_cost: calculatedCost
          });
        }

        breakdown.total_cogs += ingredientTotal;
      }
    }

    // Add packaging cost
    if (product.packaging_material_id) {
      const packagingCost = product.packaging_material_id.cost_per_unit;
      breakdown.packaging_cost = {
        material_id: product.packaging_material_id.id,
        material_name: product.packaging_material_id.name,
        material_code: product.packaging_material_id.code,
        cost_per_unit: packagingCost
      };
      breakdown.total_cogs += packagingCost;
    }

    // Add label cost
    if (product.label_material_id) {
      const labelCost = product.label_material_id.cost_per_unit;
      breakdown.label_cost = {
        material_id: product.label_material_id.id,
        material_name: product.label_material_id.name,
        material_code: product.label_material_id.code,
        cost_per_unit: labelCost
      };
      breakdown.total_cogs += labelCost;
    }

  } catch (error) {
    breakdown.errors.push('Error calculating COGS breakdown');
  }

  return breakdown;
}

// Helper function to convert weight between units
function convertWeight(weight: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return weight;

  // Convert everything to grams first, then to target unit
  let weightInGrams = weight;

  switch (fromUnit) {
    case 'kg':
      weightInGrams = weight * 1000;
      break;
    case 'g':
      weightInGrams = weight;
      break;
    case 'l':
      weightInGrams = weight * 1000; // Assuming water density
      break;
    case 'ml':
      weightInGrams = weight; // Assuming water density
      break;
    default:
      weightInGrams = weight;
  }

  switch (toUnit) {
    case 'kg':
      return weightInGrams / 1000;
    case 'g':
      return weightInGrams;
    case 'l':
      return weightInGrams / 1000; // Assuming water density
    case 'ml':
      return weightInGrams; // Assuming water density
    default:
      return weightInGrams;
  }
}