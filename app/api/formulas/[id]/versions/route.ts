import { createAdminClient } from '@/utils/supabase/admin';
import { Database, TablesInsert } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/formulas/[id]/versions - Fetch all versions of a formula
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

    let query = supabase
      .from('formula_versions')
      .select('*')
      .eq('formula_id', id)
      .eq('tenant_id', userId)
      .order('version_number', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching formula versions:', error);
      return NextResponse.json({ error: 'Failed to fetch formula versions' }, { status: 500 });
    }

    // If includeIngredients is true, fetch ingredients for each version
    if (includeIngredients && data) {
      const versionsWithIngredients = await Promise.all(
        data.map(async (version) => {
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

      return NextResponse.json({ data: versionsWithIngredients });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/formulas/[id]/versions - Create a new version of a formula
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
    const { notes, ingredients, make_active } = body;

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

    // Validate ingredients
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients are required' }, { status: 400 });
    }

    // Validate ingredients array
    const totalPercentage = ingredients.reduce((sum: number, ing: any) => sum + parseFloat(ing.percentage), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json({ 
        error: 'Ingredient percentages must sum to exactly 100%' 
      }, { status: 400 });
    }

    // Check for duplicate materials
    const materialIds = ingredients.map((ing: any) => ing.material_id);
    const uniqueMaterialIds = new Set(materialIds);
    if (materialIds.length !== uniqueMaterialIds.size) {
      return NextResponse.json({ 
        error: 'Duplicate materials in formula ingredients' 
      }, { status: 400 });
    }

    // Get the next version number
    const { data: lastVersion, error: versionError } = await supabase
      .from('formula_versions')
      .select('version_number')
      .eq('formula_id', id)
      .eq('tenant_id', userId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

    // If make_active is true, deactivate all existing versions
    if (make_active) {
      await supabase
        .from('formula_versions')
        .update({ is_active: false })
        .eq('formula_id', id)
        .eq('tenant_id', userId);
    }

    // Create new version
    const versionData: TablesInsert<'formula_versions'> = {
      formula_id: id,
      version_number: nextVersionNumber,
      is_active: make_active || false,
      notes: notes || `Version ${nextVersionNumber}`,
      created_by: userId,
      tenant_id: userId,
    };

    const { data: newVersion, error: createVersionError } = await supabase
      .from('formula_versions')
      .insert([versionData])
      .select()
      .single();

    if (createVersionError) {
      console.error('Error creating formula version:', createVersionError);
      return NextResponse.json({ error: 'Failed to create formula version' }, { status: 500 });
    }

    // Create ingredients
    const ingredientsData = ingredients.map((ing: any) => ({
      formula_version_id: newVersion.id,
      material_id: ing.material_id,
      percentage: parseFloat(ing.percentage),
      tenant_id: userId,
    }));

    const { error: ingredientsError } = await supabase
      .from('formula_ingredients')
      .insert(ingredientsData);

    if (ingredientsError) {
      // Rollback version creation
      await supabase.from('formula_versions').delete().eq('id', newVersion.id);
      console.error('Error creating formula ingredients:', ingredientsError);
      return NextResponse.json({ error: 'Failed to create formula ingredients' }, { status: 500 });
    }

    // Fetch complete version with ingredients
    const { data: completeVersion } = await supabase
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
      .eq('id', newVersion.id)
      .single();

    return NextResponse.json({ data: completeVersion }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}