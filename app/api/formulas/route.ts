import { createAdminClient } from '@/utils/supabase/admin';
import { Database, Tables, TablesInsert } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/formulas - Fetch all formulas with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeVersions = searchParams.get('include_versions') === 'true';
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
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching formulas:', error);
      return NextResponse.json({ error: 'Failed to fetch formulas' }, { status: 500 });
    }

    // If includeIngredients is true, fetch ingredients for active versions
    if (includeIngredients && data) {
      const formulasWithIngredients = await Promise.all(
        data.map(async (formula) => {
          const activeVersion = formula.formula_versions?.find((v: any) => v.is_active);
          if (activeVersion) {
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
              .eq('formula_version_id', activeVersion.id)
              .order('created_at');

            return {
              ...formula,
              active_ingredients: ingredients || []
            };
          }
          return formula;
        })
      );
      return NextResponse.json({ data: formulasWithIngredients });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/formulas - Create a new formula
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, ingredients } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ error: 'Formula name is required' }, { status: 400 });
    }

    if (ingredients && Array.isArray(ingredients)) {
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
    }

    // Start a transaction-like operation
    const { data: formulaData, error: formulaError } = await supabase
      .from('formulas')
      .insert([{
        name,
        description: description || null,
        created_by: userId,
        tenant_id: userId,
      }])
      .select()
      .single();

    if (formulaError) {
      console.error('Error creating formula:', formulaError);
      return NextResponse.json({ error: 'Failed to create formula' }, { status: 500 });
    }

    // Create initial version if ingredients provided
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      const { data: versionData, error: versionError } = await supabase
        .from('formula_versions')
        .insert([{
          formula_id: formulaData.id,
          version_number: 1,
          is_active: true,
          notes: 'Initial version',
          created_by: userId,
          tenant_id: userId,
        }])
        .select()
        .single();

      if (versionError) {
        // Rollback formula creation
        await supabase.from('formulas').delete().eq('id', formulaData.id);
        console.error('Error creating formula version:', versionError);
        return NextResponse.json({ error: 'Failed to create formula version' }, { status: 500 });
      }

      // Create ingredients
      const ingredientsData = ingredients.map((ing: any) => ({
        formula_version_id: versionData.id,
        material_id: ing.material_id,
        percentage: parseFloat(ing.percentage),
        tenant_id: userId,
      }));

      const { error: ingredientsError } = await supabase
        .from('formula_ingredients')
        .insert(ingredientsData);

      if (ingredientsError) {
        // Rollback
        await supabase.from('formula_ingredients').delete().eq('formula_version_id', versionData.id);
        await supabase.from('formula_versions').delete().eq('id', versionData.id);
        await supabase.from('formulas').delete().eq('id', formulaData.id);
        console.error('Error creating formula ingredients:', ingredientsError);
        return NextResponse.json({ error: 'Failed to create formula ingredients' }, { status: 500 });
      }

      // Fetch complete formula with version and ingredients
      const { data: completeFormula } = await supabase
        .from('formulas')
        .select(`
          *,
          formula_versions!formula_versions_formula_id_fkey (
            id,
            version_number,
            is_active,
            notes,
            created_at,
            created_by,
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
          )
        `)
        .eq('id', formulaData.id)
        .single();

      return NextResponse.json({ data: completeFormula }, { status: 201 });
    }

    return NextResponse.json({ data: formulaData }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}