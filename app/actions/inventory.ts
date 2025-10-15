'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { 
  MaterialCategory, 
  Material, 
  CreateMaterialCategoryRequest,
  CreateMaterialRequest,
  UpdateMaterialRequest 
} from '@/types/inventory';

const supabase = createAdminClient();

// Material Categories Server Actions
export async function getMaterialCategories(): Promise<{
  success: boolean;
  data?: MaterialCategory[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('material_categories')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching material categories:', error);
      return { success: false, error: 'Failed to fetch categories' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function createMaterialCategory(categoryData: CreateMaterialCategoryRequest): Promise<{
  success: boolean;
  data?: MaterialCategory;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if prefix already exists for this user
    const { data: existingCategory } = await supabase
      .from('material_categories')
      .select('id')
      .eq('prefix', categoryData.prefix)
      .eq('tenant_id', userId)
      .single();

    if (existingCategory) {
      return { success: false, error: 'Prefix already exists' };
    }

    const { data, error } = await supabase
      .from('material_categories')
      .insert([{
        ...categoryData,
        tenant_id: userId,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating material category:', error);
      return { success: false, error: 'Failed to create category' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Materials Server Actions
export async function getMaterials(filters?: {
  material_type?: 'raw_material' | 'packaging' | 'label';
  category_id?: string;
}): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = supabase
      .from('materials')
      .select(`
        *,
        material_categories (
          id,
          name,
          prefix
        )
      `)
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters?.material_type) {
      query = query.eq('material_type', filters.material_type);
    }
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching materials:', error);
      return { success: false, error: 'Failed to fetch materials' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function createMaterial(materialData: CreateMaterialRequest): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify category belongs to user
    const { data: category, error: categoryError } = await supabase
      .from('material_categories')
      .select('id')
      .eq('id', materialData.category_id)
      .eq('tenant_id', userId)
      .single();

    if (categoryError || !category) {
      return { success: false, error: 'Invalid category' };
    }

    // Check if code already exists
    if (materialData.code) {
      const { data: existingMaterial } = await supabase
        .from('materials')
        .select('id')
        .eq('code', materialData.code)
        .eq('tenant_id', userId)
        .single();

      if (existingMaterial) {
        return { success: false, error: 'Material code already exists' };
      }
    }

    const { data, error } = await supabase
      .from('materials')
      .insert([{
        ...materialData,
        tenant_id: userId,
      }])
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
      console.error('Error creating material:', error);
      return { success: false, error: 'Failed to create material' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateMaterial(
  id: string, 
  materialData: UpdateMaterialRequest
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

    // Verify material belongs to user
    const { data: existingMaterial, error: fetchError } = await supabase
      .from('materials')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', userId)
      .single();

    if (fetchError || !existingMaterial) {
      return { success: false, error: 'Material not found' };
    }

    const { data, error } = await supabase
      .from('materials')
      .update(materialData)
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
      return { success: false, error: 'Failed to update material' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteMaterial(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if material is used in any formulas
    const { data: formulaIngredients, error: checkError } = await supabase
      .from('formula_ingredients')
      .select('id')
      .eq('material_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking material usage:', checkError);
      return { success: false, error: 'Failed to check material usage' };
    }

    if (formulaIngredients && formulaIngredients.length > 0) {
      return { success: false, error: 'Cannot delete material that is used in formulas' };
    }

    // Check if material is used as packaging or label in products
    const { data: productUsage, error: productCheckError } = await supabase
      .from('manufacturing_products')
      .select('id')
      .or(`packaging_material_id.eq.${id},label_material_id.eq.${id}`)
      .limit(1);

    if (productCheckError) {
      console.error('Error checking product usage:', productCheckError);
      return { success: false, error: 'Failed to check product usage' };
    }

    if (productUsage && productUsage.length > 0) {
      return { success: false, error: 'Cannot delete material that is used in products' };
    }

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)
      .eq('tenant_id', userId);

    if (error) {
      console.error('Error deleting material:', error);
      return { success: false, error: 'Failed to delete material' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function generateMaterialCode(categoryPrefix: string): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify the category belongs to the user
    const { data: category, error: categoryError } = await supabase
      .from('material_categories')
      .select('prefix')
      .eq('prefix', categoryPrefix)
      .eq('tenant_id', userId)
      .single();

    if (categoryError || !category) {
      return {
        success: false,
        error: 'Category not found or access denied'
      };
    }

    // Call the database function to generate the next code
    const { data, error } = await supabase
      .rpc('generate_material_code', { 
        p_category_prefix: categoryPrefix 
      });

    if (error) {
      console.error('Error generating material code:', error);
      return {
        success: false,
        error: 'Failed to generate material code'
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Unexpected error generating material code:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}