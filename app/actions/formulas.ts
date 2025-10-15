'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { 
  Formula, 
  FormulaVersion, 
  FormulaComplete,
  CreateFormulaRequest,
  CreateFormulaVersionRequest,
  UpdateFormulaRequest,
  UpdateFormulaVersionRequest,
  validateFormulaIngredients,
  compareFormulaVersions,
  FormulaComparisonData
} from '@/types/formulas';

const supabase = createAdminClient();

// Formulas Server Actions
export async function getFormulas(options?: {
  include_versions?: boolean;
  include_ingredients?: boolean;
}): Promise<{
  success: boolean;
  data?: FormulaComplete[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

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
      return { success: false, error: 'Failed to fetch formulas' };
    }

    // If includeIngredients is true, fetch ingredients for active versions
    if (options?.include_ingredients && data) {
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
      return { success: true, data: formulasWithIngredients };
    }

    return { success: true, data: data as FormulaComplete[] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function getFormula(id: string, options?: {
  include_ingredients?: boolean;
}): Promise<{
  success: boolean;
  data?: FormulaComplete;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

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
        return { success: false, error: 'Formula not found' };
      }
      console.error('Error fetching formula:', error);
      return { success: false, error: 'Failed to fetch formula' };
    }

    // If includeIngredients is true, fetch ingredients for all versions
    if (options?.include_ingredients && data.formula_versions) {
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

    return { success: true, data: data as FormulaComplete };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function createFormula(formulaData: CreateFormulaRequest): Promise<{
  success: boolean;
  data?: FormulaComplete;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { name, description, ingredients } = formulaData;

    if (!name) {
      return { success: false, error: 'Formula name is required' };
    }

    // Validate ingredients if provided
    if (ingredients && Array.isArray(ingredients)) {
      const validation = validateFormulaIngredients(ingredients);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }
    }

    // Create formula
    const { data: formulaDataResult, error: formulaError } = await supabase
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
      return { success: false, error: 'Failed to create formula' };
    }

    // Create initial version if ingredients provided
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      const { data: versionData, error: versionError } = await supabase
        .from('formula_versions')
        .insert([{
          formula_id: formulaDataResult.id,
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
        await supabase.from('formulas').delete().eq('id', formulaDataResult.id);
        console.error('Error creating formula version:', versionError);
        return { success: false, error: 'Failed to create formula version' };
      }

      // Create ingredients
      const ingredientsData = ingredients.map((ing) => ({
        formula_version_id: versionData.id,
        material_id: ing.material_id,
        percentage: parseFloat(ing.percentage.toString()),
        tenant_id: userId,
      }));

      const { error: ingredientsError } = await supabase
        .from('formula_ingredients')
        .insert(ingredientsData);

      if (ingredientsError) {
        // Rollback
        await supabase.from('formula_ingredients').delete().eq('formula_version_id', versionData.id);
        await supabase.from('formula_versions').delete().eq('id', versionData.id);
        await supabase.from('formulas').delete().eq('id', formulaDataResult.id);
        console.error('Error creating formula ingredients:', ingredientsError);
        return { success: false, error: 'Failed to create formula ingredients' };
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
        .eq('id', formulaDataResult.id)
        .single();

      return { success: true, data: completeFormula as FormulaComplete };
    }

    return { success: true, data: formulaDataResult as FormulaComplete };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateFormula(
  id: string, 
  updateData: UpdateFormulaRequest
): Promise<{
  success: boolean;
  data?: Formula;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify formula belongs to user
    const { data: existingFormula, error: fetchError } = await supabase
      .from('formulas')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !existingFormula) {
      return { success: false, error: 'Formula not found' };
    }

    const { data, error } = await supabase
      .from('formulas')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating formula:', error);
      return { success: false, error: 'Failed to update formula' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteFormula(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if formula is used in any products
    const { data: productUsage, error: checkError } = await supabase
      .from('manufacturing_products')
      .select('id')
      .eq('formula_version_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking formula usage:', checkError);
      return { success: false, error: 'Failed to check formula usage' };
    }

    if (productUsage && productUsage.length > 0) {
      return { success: false, error: 'Cannot delete formula that is used in products' };
    }

    const { error } = await supabase
      .from('formulas')
      .delete()
      .eq('id', id)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error deleting formula:', error);
      return { success: false, error: 'Failed to delete formula' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Formula Versions Server Actions
export async function getFormulaVersions(
  formulaId: string,
  options?: {
    include_ingredients?: boolean;
  }
): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify formula belongs to user
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .select('id')
      .eq('id', formulaId)
      .eq('tenant_id', userId)
      .single();

    if (formulaError || !formula) {
      return { success: false, error: 'Formula not found' };
    }

    let query = supabase
      .from('formula_versions')
      .select('*')
      .eq('formula_id', formulaId)
      .eq('tenant_id', userId)
      .order('version_number', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching formula versions:', error);
      return { success: false, error: 'Failed to fetch formula versions' };
    }

    // If includeIngredients is true, fetch ingredients for each version
    if (options?.include_ingredients && data) {
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

      return { success: true, data: versionsWithIngredients };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function createFormulaVersion(
  formulaId: string,
  versionData: CreateFormulaVersionRequest
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { notes, ingredients, make_active } = versionData;

    // Verify formula belongs to user
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .select('id')
      .eq('id', formulaId)
      .eq('tenant_id', userId)
      .single();

    if (formulaError || !formula) {
      return { success: false, error: 'Formula not found' };
    }

    // Validate ingredients
    const validation = validateFormulaIngredients(ingredients);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Get the next version number
    const { data: lastVersion, error: versionError } = await supabase
      .from('formula_versions')
      .select('version_number')
      .eq('formula_id', formulaId)
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
        .eq('formula_id', formulaId)
        .eq('tenant_id', userId);
    }

    // Create new version
    const { data: newVersion, error: createVersionError } = await supabase
      .from('formula_versions')
      .insert([{
        formula_id: formulaId,
        version_number: nextVersionNumber,
        is_active: make_active || false,
        notes: notes || `Version ${nextVersionNumber}`,
        created_by: userId,
        tenant_id: userId,
      }])
      .select()
      .single();

    if (createVersionError) {
      console.error('Error creating formula version:', createVersionError);
      return { success: false, error: 'Failed to create formula version' };
    }

    // Create ingredients
    const ingredientsData = ingredients.map((ing) => ({
      formula_version_id: newVersion.id,
      material_id: ing.material_id,
      percentage: parseFloat(ing.percentage.toString()),
      tenant_id: userId,
    }));

    const { error: ingredientsError } = await supabase
      .from('formula_ingredients')
      .insert(ingredientsData);

    if (ingredientsError) {
      // Rollback version creation
      await supabase.from('formula_versions').delete().eq('id', newVersion.id);
      console.error('Error creating formula ingredients:', ingredientsError);
      return { success: false, error: 'Failed to create formula ingredients' };
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

    return { success: true, data: completeVersion };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function activateFormulaVersion(
  formulaId: string,
  versionId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify formula belongs to user
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .select('id')
      .eq('id', formulaId)
      .eq('tenant_id', userId)
      .single();

    if (formulaError || !formula) {
      return { success: false, error: 'Formula not found' };
    }

    // Deactivate all versions first
    await supabase
      .from('formula_versions')
      .update({ is_active: false })
      .eq('formula_id', formulaId)
      .eq('tenant_id', userId);

    // Activate the specified version
    const { error } = await supabase
      .from('formula_versions')
      .update({ is_active: true })
      .eq('id', versionId)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error activating formula version:', error);
      return { success: false, error: 'Failed to activate formula version' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function compareFormulaVersionsAction(
  formulaId: string,
  version1Id: string,
  version2Id: string
): Promise<{
  success: boolean;
  data?: FormulaComparisonData;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get both versions with ingredients
    const { data: version1, error: error1 } = await getFormulaVersionWithIngredients(formulaId, version1Id);
    const { data: version2, error: error2 } = await getFormulaVersionWithIngredients(formulaId, version2Id);

    if (error1 || !version1) {
      return { success: false, error: 'First version not found' };
    }

    if (error2 || !version2) {
      return { success: false, error: 'Second version not found' };
    }

    const comparison = compareFormulaVersions(version1, version2);
    return { success: true, data: comparison };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Helper function
async function getFormulaVersionWithIngredients(
  formulaId: string,
  versionId: string
): Promise<{ data?: any; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Unauthorized' };
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
    .eq('formula_id', formulaId)
    .eq('tenant_id', userId)
    .single();

  if (error) {
    return { error: 'Version not found' };
  }

  return { data };
}