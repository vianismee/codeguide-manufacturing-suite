import { createAdminClient } from '@/utils/supabase/admin';
import { Database, TablesUpdate } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/products/[id] - Fetch a single manufacturing product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeFormula = searchParams.get('include_formula') === 'true';
    const includeCOGSBreakdown = searchParams.get('include_cogs_breakdown') === 'true';

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
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error fetching manufacturing product:', error);
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }

    let enhancedData = { ...data };

    // If includeFormula is true, fetch formula ingredients
    if (includeFormula && data.formula_version_id) {
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
        .eq('formula_version_id', data.formula_version_id.id)
        .order('created_at');

      enhancedData = {
        ...enhancedData,
        formula_ingredients: ingredients || []
      };
    }

    // If includeCOGSBreakdown is true, calculate detailed COGS breakdown
    if (includeCOGSBreakdown) {
      const breakdown = await calculateDetailedCOGSBreakdown(enhancedData, userId);
      enhancedData = {
        ...enhancedData,
        cogs_breakdown: breakdown
      };
    }

    return NextResponse.json({ data: enhancedData });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/products/[id] - Update a manufacturing product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
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
      status,
      recalculate_cogs = false 
    } = body;

    // Verify product belongs to user
    const { data: existingProduct, error: fetchError } = await supabase
      .from('manufacturing_products')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Validate formula version if changing
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
        return NextResponse.json({ error: 'Invalid formula version' }, { status: 400 });
      }

      if (!formulaVersion.is_active) {
        return NextResponse.json({ 
          error: 'Cannot use inactive formula version' 
        }, { status: 400 });
      }
    }

    // Validate packaging material if changing
    if (packaging_material_id) {
      const { data: packagingMaterial, error: packagingError } = await supabase
        .from('materials')
        .select('id')
        .eq('id', packaging_material_id)
        .eq('tenant_id', userId)
        .eq('material_type', 'packaging')
        .single();

      if (packagingError || !packagingMaterial) {
        return NextResponse.json({ error: 'Invalid packaging material' }, { status: 400 });
      }
    }

    // Validate label material if changing
    if (label_material_id) {
      const { data: labelMaterial, error: labelError } = await supabase
        .from('materials')
        .select('id')
        .eq('id', label_material_id)
        .eq('tenant_id', userId)
        .eq('material_type', 'label')
        .single();

      if (labelError || !labelMaterial) {
        return NextResponse.json({ error: 'Invalid label material' }, { status: 400 });
      }
    }

    // Check if SKU already exists (if changing SKU)
    if (sku && sku !== existingProduct.id) {
      const { data: existingSKU } = await supabase
        .from('manufacturing_products')
        .select('id')
        .eq('sku', sku)
        .eq('tenant_id', userId)
        .neq('id', id)
        .single();

      if (existingSKU) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
    }

    const updateData: TablesUpdate<'manufacturing_products'> = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(sku !== undefined && { sku }),
      ...(formula_version_id !== undefined && { formula_version_id }),
      ...(packaging_material_id !== undefined && { packaging_material_id }),
      ...(label_material_id !== undefined && { label_material_id }),
      ...(net_weight !== undefined && { net_weight }),
      ...(net_weight_unit && { net_weight_unit }),
      ...(selling_price !== undefined && { selling_price }),
      ...(status && { status }),
    };

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
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    // Recalculate COGS if requested or if relevant fields changed
    if (recalculate_cogs || formula_version_id || packaging_material_id || label_material_id || net_weight) {
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

        return NextResponse.json({ data: updatedProduct });
      } else if (cogsError) {
        console.error('Error calculating COGS:', cogsError);
        // Still return the updated product even if COGS calculation failed
        return NextResponse.json({ 
          data,
          warning: 'Product updated but COGS calculation failed'
        });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a manufacturing product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { error } = await supabase
      .from('manufacturing_products')
      .delete()
      .eq('id', id)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error deleting manufacturing product:', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate COGS for a product
async function calculateProductCOGS(productId: string, userId: string): Promise<{
  cogs: number | null;
  error?: string;
}> {
  try {
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
    cost_calculation: string;
  }>;
  packaging_cost: {
    material_id: string;
    material_name: string;
    material_code: string;
    cost_per_unit: number;
  } | null;
  label_cost: {
    material_id: string;
    material_name: string;
    material_code: string;
    cost_per_unit: number;
  } | null;
  errors: string[];
  warnings: string[];
}> {
  const breakdown = {
    total_cogs: 0,
    ingredient_costs: [] as any[],
    packaging_cost: null as any,
    label_cost: null as any,
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
          let costCalculation = '';

          // Convert units and calculate cost
          const weightInMaterialUnits = convertWeight(
            product.net_weight,
            product.net_weight_unit,
            material.unit_type
          );

          calculatedCost = (ingredient.percentage / 100) * weightInMaterialUnits * material.cost_per_unit;
          ingredientTotal += calculatedCost;

          costCalculation = `${ingredient.percentage}% × ${weightInMaterialUnits} ${material.unit_type} × $${material.cost_per_unit}/${material.unit_type}`;

          breakdown.ingredient_costs.push({
            material_id: material.id,
            material_name: material.name,
            material_code: material.code,
            percentage: ingredient.percentage,
            cost_per_unit: material.cost_per_unit,
            unit_type: material.unit_type,
            calculated_cost: calculatedCost,
            cost_calculation: costCalculation
          });
        }

        breakdown.total_cogs += ingredientTotal;
      }
    } else {
      breakdown.warnings.push('No formula assigned - ingredient costs not calculated');
    }

    // Add packaging cost
    if (product.packaging_material_id) {
      breakdown.packaging_cost = {
        material_id: product.packaging_material_id.id,
        material_name: product.packaging_material_id.name,
        material_code: product.packaging_material_id.code,
        cost_per_unit: product.packaging_material_id.cost_per_unit
      };
      breakdown.total_cogs += product.packaging_material_id.cost_per_unit;
    } else {
      breakdown.warnings.push('No packaging material assigned - packaging cost not included');
    }

    // Add label cost
    if (product.label_material_id) {
      breakdown.label_cost = {
        material_id: product.label_material_id.id,
        material_name: product.label_material_id.name,
        material_code: product.label_material_id.code,
        cost_per_unit: product.label_material_id.cost_per_unit
      };
      breakdown.total_cogs += product.label_material_id.cost_per_unit;
    } else {
      breakdown.warnings.push('No label material assigned - label cost not included');
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