import { createAdminClient } from '@/utils/supabase/admin';
import { Database, TablesUpdate } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/formulas/[id]/versions/[versionId] - Fetch a specific version
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, versionId } = params;

    // Verify formula belongs to user
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (formulaError || !formula) {
      return NextResponse.json({ error: 'Formula not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('formula_versions')
      .select(`
        *,
        formula_ingredients (
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
        )
      `)
      .eq('id', versionId)
      .eq('formula_id', id)
      .eq('tenant_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Formula version not found' }, { status: 404 });
      }
      console.error('Error fetching formula version:', error);
      return NextResponse.json({ error: 'Failed to fetch formula version' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/formulas/[id]/versions/[versionId] - Update version notes or activate/deactivate
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, versionId } = params;
    const body = await request.json();
    const { notes, is_active } = body;

    // Verify formula belongs to user
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (formulaError || !formula) {
      return NextResponse.json({ error: 'Formula not found' }, { status: 404 });
    }

    // Verify version belongs to user
    const { data: existingVersion, error: versionError } = await supabase
      .from('formula_versions')
      .select('id, is_active')
      .eq('id', versionId)
      .eq('formula_id', id)
      .eq('tenant_id', userId)
      .single();

    if (versionError || !existingVersion) {
      return NextResponse.json({ error: 'Formula version not found' }, { status: 404 });
    }

    // If activating this version, deactivate all other versions
    if (is_active && !existingVersion.is_active) {
      await supabase
        .from('formula_versions')
        .update({ is_active: false })
        .eq('formula_id', id)
        .eq('tenant_id', userId);
    }

    const updateData: TablesUpdate<'formula_versions'> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('formula_versions')
      .update(updateData)
      .eq('id', versionId)
      .eq('tenant_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating formula version:', error);
      return NextResponse.json({ error: 'Failed to update formula version' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/formulas/[id]/versions/[versionId] - Delete a version
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, versionId } = params;

    // Verify formula belongs to user
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (formulaError || !formula) {
      return NextResponse.json({ error: 'Formula not found' }, { status: 404 });
    }

    // Check if version is used in any products
    const { data: productUsage, error: checkError } = await supabase
      .from('manufacturing_products')
      .select('id')
      .eq('formula_version_id', versionId)
      .limit(1);

    if (checkError) {
      console.error('Error checking version usage:', checkError);
      return NextResponse.json({ error: 'Failed to check version usage' }, { status: 500 });
    }

    if (productUsage && productUsage.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete version that is used in products' 
      }, { status: 400 });
    }

    // Check if this is the only version left
    const { data: allVersions, error: countError } = await supabase
      .from('formula_versions')
      .select('id')
      .eq('formula_id', id)
      .eq('tenant_id', userId);

    if (countError) {
      console.error('Error counting versions:', countError);
      return NextResponse.json({ error: 'Failed to count versions' }, { status: 500 });
    }

    if (allVersions && allVersions.length <= 1) {
      return NextResponse.json({ 
        error: 'Cannot delete the only version of a formula' 
      }, { status: 400 });
    }

    // Delete the version (cascade will delete ingredients)
    const { error } = await supabase
      .from('formula_versions')
      .delete()
      .eq('id', versionId)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error deleting formula version:', error);
      return NextResponse.json({ error: 'Failed to delete formula version' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}