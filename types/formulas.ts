import { z } from 'zod';

// Formulas
export const FormulaSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Formula name is required').max(200, 'Name too long'),
  description: z.string().nullable().optional(),
  created_by: z.string().optional(),
  tenant_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Formula = z.infer<typeof FormulaSchema>;

// Formula Versions
export const FormulaVersionSchema = z.object({
  id: z.string().uuid().optional(),
  formula_id: z.string().uuid(),
  version_number: z.number().int().min(1),
  is_active: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  created_by: z.string().optional(),
  tenant_id: z.string().optional(),
  created_at: z.string().optional(),
});

export type FormulaVersion = z.infer<typeof FormulaVersionSchema>;

// Formula Ingredients
export const FormulaIngredientSchema = z.object({
  id: z.string().uuid().optional(),
  formula_version_id: z.string().uuid(),
  material_id: z.string().uuid(),
  percentage: z.number().min(0.01).max(100),
  tenant_id: z.string().optional(),
  created_at: z.string().optional(),
});

export type FormulaIngredient = z.infer<typeof FormulaIngredientSchema>;

// Extended types with relationships
export const FormulaWithVersionsSchema = FormulaSchema.extend({
  formula_versions: z.array(FormulaVersionSchema).optional(),
});

export type FormulaWithVersions = z.infer<typeof FormulaWithVersionsSchema>;

export const FormulaVersionWithIngredientsSchema = FormulaVersionSchema.extend({
  formula_ingredients: z.array(FormulaIngredientSchema.extend({
    materials: z.object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string().nullable(),
      material_type: z.enum(['raw_material', 'packaging', 'label']),
      unit_type: z.enum(['kg', 'g', 'l', 'ml', 'units', 'meters', 'cm']),
      cost_per_unit: z.number(),
      material_categories: z.object({
        prefix: z.string(),
      }).optional(),
    }),
  })).optional(),
});

export type FormulaVersionWithIngredients = z.infer<typeof FormulaVersionWithIngredientsSchema>;

export const FormulaCompleteSchema = FormulaSchema.extend({
  formula_versions: z.array(FormulaVersionWithIngredientsSchema).optional(),
  active_ingredients: z.array(FormulaIngredientSchema.extend({
    materials: z.object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string().nullable(),
      material_type: z.enum(['raw_material', 'packaging', 'label']),
      unit_type: z.enum(['kg', 'g', 'l', 'ml', 'units', 'meters', 'cm']),
      cost_per_unit: z.number(),
      material_categories: z.object({
        prefix: z.string(),
      }).optional(),
    }),
  })).optional(),
});

export type FormulaComplete = z.infer<typeof FormulaCompleteSchema>;

// API Request/Response types
export interface CreateFormulaRequest {
  name: string;
  description?: string;
  ingredients?: Array<{
    material_id: string;
    percentage: number;
  }>;
}

export interface UpdateFormulaRequest {
  name?: string;
  description?: string;
}

export interface CreateFormulaVersionRequest {
  notes?: string;
  ingredients: Array<{
    material_id: string;
    percentage: number;
  }>;
  make_active?: boolean;
}

export interface UpdateFormulaVersionRequest {
  notes?: string;
  is_active?: boolean;
}

export interface FormulaComparisonData {
  version1: FormulaVersionWithIngredients;
  version2: FormulaVersionWithIngredients;
  added_ingredients: any[];
  removed_ingredients: any[];
  modified_ingredients: Array<{
    material: any;
    old_percentage: number;
    new_percentage: number;
  }>;
}

export interface FormulaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  total_percentage?: number;
}

export interface FormulaAuditLog {
  id: string;
  formula_id: string;
  version_number: number;
  action: 'created' | 'updated' | 'activated' | 'deactivated' | 'deleted';
  user_id: string;
  timestamp: string;
  details?: any;
}

// Validation functions
export function validateFormulaIngredients(ingredients: Array<{ material_id: string; percentage: number }>): FormulaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ingredients || ingredients.length === 0) {
    errors.push('At least one ingredient is required');
    return { valid: false, errors, warnings };
  }

  // Check for duplicate materials
  const materialIds = ingredients.map(ing => ing.material_id);
  const uniqueMaterialIds = new Set(materialIds);
  if (materialIds.length !== uniqueMaterialIds.size) {
    errors.push('Duplicate materials in formula ingredients');
  }

  // Calculate total percentage
  const totalPercentage = ingredients.reduce((sum, ing) => sum + parseFloat(ing.percentage.toString()), 0);
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push('Ingredient percentages must sum to exactly 100%');
  }

  // Check each ingredient
  ingredients.forEach((ing, index) => {
    if (ing.percentage <= 0 || ing.percentage > 100) {
      errors.push(`Ingredient ${index + 1}: Percentage must be between 0 and 100`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    total_percentage: totalPercentage
  };
}

export function compareFormulaVersions(
  version1: FormulaVersionWithIngredients,
  version2: FormulaVersionWithIngredients
): FormulaComparisonData {
  const v1Ingredients = version1.formula_ingredients || [];
  const v2Ingredients = version2.formula_ingredients || [];

  const v1Map = new Map(v1Ingredients.map(ing => [ing.material_id, ing]));
  const v2Map = new Map(v2Ingredients.map(ing => [ing.material_id, ing]));

  const added_ingredients = [];
  const removed_ingredients = [];
  const modified_ingredients = [];

  // Find added ingredients
  for (const [materialId, ingredient] of v2Map) {
    if (!v1Map.has(materialId)) {
      added_ingredients.push(ingredient);
    }
  }

  // Find removed ingredients
  for (const [materialId, ingredient] of v1Map) {
    if (!v2Map.has(materialId)) {
      removed_ingredients.push(ingredient);
    }
  }

  // Find modified ingredients
  for (const [materialId, v1Ingredient] of v1Map) {
    const v2Ingredient = v2Map.get(materialId);
    if (v2Ingredient && Math.abs(v1Ingredient.percentage - v2Ingredient.percentage) > 0.01) {
      modified_ingredients.push({
        material: v2Ingredient.materials,
        old_percentage: v1Ingredient.percentage,
        new_percentage: v2Ingredient.percentage,
      });
    }
  }

  return {
    version1,
    version2,
    added_ingredients,
    removed_ingredients,
    modified_ingredients,
  };
}