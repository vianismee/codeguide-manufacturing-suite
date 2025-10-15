import { createAdminClient } from '@/utils/supabase/admin';
import { Database, TablesUpdate } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/inventory/materials/[id] - Fetch a single material
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

    const { data, error } = await supabase
      .from('materials')
      .select(`
        *,
        material_categories (
          id,
          name,
          prefix
        )
      `)
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Material not found' }, { status: 404 });
      }
      console.error('Error fetching material:', error);
      return NextResponse.json({ error: 'Failed to fetch material' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/inventory/materials/[id] - Update a material
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
      category_id, 
      name, 
      code, 
      description, 
      cost_per_unit, 
      unit_type, 
      material_type,
      supplier,
      min_stock_level,
      current_stock 
    } = body;

    // Verify material belongs to user
    const { data: existingMaterial, error: fetchError } = await supabase
      .from('materials')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !existingMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // If changing category, verify new category belongs to user
    if (category_id && category_id !== existingMaterial.id) {
      const { data: category, error: categoryError } = await supabase
        .from('material_categories')
        .select('id')
        .eq('id', category_id)
        .eq('tenant_id', userId)
        .single();

      if (categoryError || !category) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
    }

    // Check if code already exists (if changing code)
    if (code && code !== existingMaterial.id) {
      const { data: existingCode } = await supabase
        .from('materials')
        .select('id')
        .eq('code', code)
        .eq('tenant_id', userId)
        .neq('id', id)
        .single();

      if (existingCode) {
        return NextResponse.json({ error: 'Material code already exists' }, { status: 409 });
      }
    }

    const updateData: TablesUpdate<'materials'> = {
      ...(category_id && { category_id }),
      ...(name && { name }),
      ...(code !== undefined && { code }),
      ...(description !== undefined && { description }),
      ...(cost_per_unit !== undefined && { cost_per_unit }),
      ...(unit_type && { unit_type }),
      ...(material_type && { material_type }),
      ...(supplier !== undefined && { supplier }),
      ...(min_stock_level !== undefined && { min_stock_level }),
      ...(current_stock !== undefined && { current_stock }),
    };

    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', userId)
      .select(`
        *,
        material_categories (
          id,
          name,
          prefix
        )
      `)
      .single();

    if (error) {
      console.error('Error updating material:', error);
      return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/inventory/materials/[id] - Delete a material
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

    // Check if material is used in any formulas
    const { data: formulaIngredients, error: checkError } = await supabase
      .from('formula_ingredients')
      .select('id')
      .eq('material_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking material usage:', checkError);
      return NextResponse.json({ error: 'Failed to check material usage' }, { status: 500 });
    }

    if (formulaIngredients && formulaIngredients.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete material that is used in formulas' 
      }, { status: 400 });
    }

    // Check if material is used as packaging or label in products
    const { data: productUsage, error: productCheckError } = await supabase
      .from('manufacturing_products')
      .select('id')
      .or(`packaging_material_id.eq.${id},label_material_id.eq.${id}`)
      .limit(1);

    if (productCheckError) {
      console.error('Error checking product usage:', productCheckError);
      return NextResponse.json({ error: 'Failed to check product usage' }, { status: 500 });
    }

    if (productUsage && productUsage.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete material that is used in products' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error deleting material:', error);
      return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}