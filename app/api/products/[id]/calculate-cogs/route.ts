import { createAdminClient } from '@/utils/supabase/admin';
import { Database } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// POST /api/products/[id]/calculate-cogs - Calculate and update COGS for a product
export async function POST(
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
    const { include_breakdown = false } = body;

    // Verify product belongs to user
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
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate COGS using database function
    const { data: cogs, error: cogsError } = await supabase
      .rpc('calculate_product_cogs', { 
        p_product_id: id 
      });

    if (cogsError) {
      console.error('Error calculating COGS:', cogsError);
      return NextResponse.json({ 
        error: 'Failed to calculate COGS',
        details: cogsError.message 
      }, { status: 500 });
    }

    // Update product with new COGS
    const { data: updatedProduct, error: updateError } = await supabase
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

    if (updateError) {
      console.error('Error updating product COGS:', updateError);
      return NextResponse.json({ 
        error: 'COGS calculated but failed to update product',
        cogs: cogs,
        details: updateError.message 
      }, { status: 500 });
    }

    const response: any = {
      data: updatedProduct,
      cogs: cogs,
      previous_cogs: product.cogs,
      calculation_timestamp: new Date().toISOString()
    };

    // Include detailed breakdown if requested
    if (include_breakdown) {
      const breakdown = await calculateDetailedCOGSBreakdown(product, userId);
      response.cogs_breakdown = breakdown;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
  calculation_summary: {
    formula_cost: number;
    packaging_cost: number;
    label_cost: number;
    total_cost: number;
    profit_margin: number | null;
  };
}> {
  const breakdown = {
    total_cogs: 0,
    ingredient_costs: [] as any[],
    packaging_cost: null as any,
    label_cost: null as any,
    errors: [] as string[],
    warnings: [] as string[],
    calculation_summary: {
      formula_cost: 0,
      packaging_cost: 0,
      label_cost: 0,
      total_cost: 0,
      profit_margin: null as number | null
    }
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
        breakdown.calculation_summary.formula_cost = ingredientTotal;
      }
    } else {
      breakdown.warnings.push('No formula assigned - ingredient costs not calculated');
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
      breakdown.calculation_summary.packaging_cost = packagingCost;
    } else {
      breakdown.warnings.push('No packaging material assigned - packaging cost not included');
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
      breakdown.calculation_summary.label_cost = labelCost;
    } else {
      breakdown.warnings.push('No label material assigned - label cost not included');
    }

    // Update total cost
    breakdown.calculation_summary.total_cost = breakdown.total_cogs;

    // Calculate profit margin if selling price is available
    if (product.selling_price && product.selling_price > 0) {
      breakdown.calculation_summary.profit_margin = 
        ((product.selling_price - breakdown.total_cogs) / product.selling_price) * 100;
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