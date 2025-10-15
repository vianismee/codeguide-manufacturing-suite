import { createAdminClient } from '@/utils/supabase/admin';
import { Database, TablesUpdate } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/formulas/[id] - Fetch a single formula with versions
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
    const includeIngredients = searchParams.get('include_ingredients') === 'true';

    let query = supabase
      .from('formulas')
      .select(`
        *,
        formula_versions!formula_versions_formula_id_fkey (
          id,
          version_number,
          is_active,
          notes,
          created_at,
          created_by
        )
      `)
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Formula not found' }, { status: 404 });
      }
      console.error('Error fetching formula:', error);
      return NextResponse.json({ error: 'Failed to fetch formula' }, { status: 500 });
    }

    // If includeIngredients is true, fetch ingredients for all versions
    if (includeIngredients && data.formula_versions) {
      const versionsWithIngredients = await Promise.all(
        data.formula_versions.map(async (version: any) => {
          const { data: ingredients } = await supabase
            .from('formula_ingredients')
            .select(`
              *,
              materials (
                id,
                name,
                code,
                material_type,
                unit_type,
                cost_per_unit,
                material_categories (
                  prefix
                )
              )
            `)
            .eq('formula_version_id', version.id)
            .order('created_at');

          return {
            ...version,
            ingredients: ingredients || []
          };
        })
      );

      data.formula_versions = versionsWithIngredients;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/formulas/[id] - Update a formula (name and description only)
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
    const { name, description } = body;

    // Verify formula belongs to user
    const { data: existingFormula, error: fetchError } = await supabase
      .from('formulas')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !existingFormula) {
      return NextResponse.json({ error: 'Formula not found' }, { status: 404 });
    }

    const updateData: TablesUpdate<'formulas'> = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    };

    const { data, error } = await supabase
      .from('formulas')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating formula:', error);
      return NextResponse.json({ error: 'Failed to update formula' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/formulas/[id] - Soft delete a formula
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

    // Check if formula is used in any products
    const { data: productUsage, error: checkError } = await supabase
      .from('manufacturing_products')
      .select('id')
      .eq('formula_version_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking formula usage:', checkError);
      return NextResponse.json({ error: 'Failed to check formula usage' }, { status: 500 });
    }

    if (productUsage && productUsage.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete formula that is used in products' 
      }, { status: 400 });
    }

    // Delete all versions and ingredients (cascade will handle this)
    const { error } = await supabase
      .from('formulas')
      .delete()
      .eq('id', id)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error deleting formula:', error);
      return NextResponse.json({ error: 'Failed to delete formula' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}