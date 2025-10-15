import { createAdminClient } from '@/utils/supabase/admin';
import { Database, Tables, TablesInsert } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/products - Fetch all manufacturing products with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeFormula = searchParams.get('include_formula') === 'true';
    const includeCOGSBreakdown = searchParams.get('include_cogs_breakdown') === 'true';

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
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching manufacturing products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // If includeFormula is true, fetch formula ingredients for products with formulas
    if (includeFormula && data) {
      const productsWithFormula = await Promise.all(
        data.map(async (product) => {
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

      return NextResponse.json({ data: productsWithFormula });
    }

    // If includeCOGSBreakdown is true, calculate detailed COGS breakdown
    if (includeCOGSBreakdown && data) {
      const productsWithCOGS = await Promise.all(
        data.map(async (product) => {
          const breakdown = await calculateCOGSBreakdown(product, userId);
          return {
            ...product,
            cogs_breakdown: breakdown
          };
        })
      );

      return NextResponse.json({ data: productsWithCOGS });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products - Create a new manufacturing product
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      auto_calculate_cogs = true 
    } = body;

    // Validation
    if (!name || !net_weight) {
      return NextResponse.json({ 
        error: 'Product name and net weight are required' 
      }, { status: 400 });
    }

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
        return NextResponse.json({ error: 'Invalid formula version' }, { status: 400 });
      }

      if (!formulaVersion.is_active) {
        return NextResponse.json({ 
          error: 'Cannot use inactive formula version' 
        }, { status: 400 });
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
        return NextResponse.json({ error: 'Invalid packaging material' }, { status: 400 });
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
        return NextResponse.json({ error: 'Invalid label material' }, { status: 400 });
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
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
    }

    const productData: TablesInsert<'manufacturing_products'> = {
      name,
      description: description || null,
      sku: sku || null,
      formula_version_id: formula_version_id || null,
      packaging_material_id: packaging_material_id || null,
      label_material_id: label_material_id || null,
      net_weight,
      net_weight_unit: net_weight_unit || 'g',
      cogs: auto_calculate_cogs ? 0 : null, // Will be calculated below if needed
      selling_price: selling_price || null,
      status: 'draft',
      tenant_id: userId,
    };

    const { data, error } = await supabase
      .from('manufacturing_products')
      .insert([productData])
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
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    // Calculate COGS if auto_calculate_cogs is true
    if (auto_calculate_cogs) {
      const { cogs, error: cogsError } = await calculateProductCOGS(data.id, userId);
      
      if (!cogsError && cogs !== null) {
        // Update the product with calculated COGS
        const { data: updatedProduct } = await supabase
          .from('manufacturing_products')
          .update({ cogs })
          .eq('id', data.id)
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

        return NextResponse.json({ data: updatedProduct }, { status: 201 });
      } else if (cogsError) {
        console.error('Error calculating COGS:', cogsError);
      }
    }

    return NextResponse.json({ data }, { status: 201 });
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
async function calculateCOGSBreakdown(product: any, userId: string): Promise<{
  total_cogs: number;
  ingredient_costs: Array<{
    material_id: string;
    material_name: string;
    material_code: string;
    percentage: number;
    cost_per_unit: number;
    calculated_cost: number;
  }>;
  packaging_cost: number | null;
  label_cost: number | null;
  errors: string[];
}> {
  const breakdown = {
    total_cogs: 0,
    ingredient_costs: [] as any[],
    packaging_cost: null as number | null,
    label_cost: null as number | null,
    errors: [] as string[]
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
            calculated_cost: calculatedCost
          });
        }

        breakdown.total_cogs += ingredientTotal;
      }
    }

    // Add packaging cost
    if (product.packaging_material_id) {
      breakdown.packaging_cost = product.packaging_material_id.cost_per_unit;
      breakdown.total_cogs += product.packaging_material_id.cost_per_unit;
    }

    // Add label cost
    if (product.label_material_id) {
      breakdown.label_cost = product.label_material_id.cost_per_unit;
      breakdown.total_cogs += product.label_material_id.cost_per_unit;
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