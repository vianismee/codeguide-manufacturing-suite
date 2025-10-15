import { createAdminClient } from '@/utils/supabase/admin';
import { Database } from '@/types/database.types';

const supabase = createAdminClient();

interface GenerateMaterialCodeOptions {
  categoryPrefix: string;
  userId: string;
}

export async function generateMaterialCode({ categoryPrefix, userId }: GenerateMaterialCodeOptions): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
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