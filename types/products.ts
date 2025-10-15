import { z } from 'zod';

// Manufacturing Products
export const ManufacturingProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required').max(200, 'Name too long'),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  formula_version_id: z.string().uuid().nullable().optional(),
  packaging_material_id: z.string().uuid().nullable().optional(),
  label_material_id: z.string().uuid().nullable().optional(),
  net_weight: z.number().min(0.001, 'Net weight must be positive'),
  net_weight_unit: z.enum(['kg', 'g', 'l', 'ml', 'units', 'meters', 'cm']).default('g'),
  cogs: z.number().min(0, 'COGS must be positive').nullable().optional(),
  selling_price: z.number().min(0, 'Selling price must be positive').nullable().optional(),
  status: z.enum(['draft', 'active', 'discontinued']).default('draft'),
  tenant_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type ManufacturingProduct = z.infer<typeof ManufacturingProductSchema>;

// Extended types with relationships
export const ManufacturingProductWithDetailsSchema = ManufacturingProductSchema.extend({
  formula_version_id: z.object({
    id: z.string().uuid(),
    version_number: z.number(),
    is_active: z.boolean(),
    formulas: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }).optional(),
  }).nullable().optional(),
  packaging_material_id: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    cost_per_unit: z.number(),
    material_categories: z.object({
      prefix: z.string(),
    }).optional(),
  }).nullable().optional(),
  label_material_id: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    cost_per_unit: z.number(),
    material_categories: z.object({
      prefix: z.string(),
    }).optional(),
  }).nullable().optional(),
  formula_ingredients: z.array(z.object({
    id: z.string().uuid(),
    percentage: z.number(),
    materials: z.object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string(),
      cost_per_unit: z.number(),
      unit_type: z.enum(['kg', 'g', 'l', 'ml', 'units', 'meters', 'cm']),
      material_type: z.enum(['raw_material', 'packaging', 'label']),
      material_categories: z.object({
        prefix: z.string(),
      }).optional(),
    }),
  })).optional(),
});

export type ManufacturingProductWithDetails = z.infer<typeof ManufacturingProductWithDetailsSchema>;

// COGS Breakdown Types
export const COGSBreakdownSchema = z.object({
  total_cogs: z.number(),
  ingredient_costs: z.array(z.object({
    material_id: z.string().uuid(),
    material_name: z.string(),
    material_code: z.string(),
    percentage: z.number(),
    cost_per_unit: z.number(),
    unit_type: z.enum(['kg', 'g', 'l', 'ml', 'units', 'meters', 'cm']),
    calculated_cost: z.number(),
    cost_calculation: z.string(),
  })),
  packaging_cost: z.object({
    material_id: z.string().uuid(),
    material_name: z.string(),
    material_code: z.string(),
    cost_per_unit: z.number(),
  }).nullable().optional(),
  label_cost: z.object({
    material_id: z.string().uuid(),
    material_name: z.string(),
    material_code: z.string(),
    cost_per_unit: z.number(),
  }).nullable().optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  calculation_summary: z.object({
    formula_cost: z.number(),
    packaging_cost: z.number(),
    label_cost: z.number(),
    total_cost: z.number(),
    profit_margin: z.number().nullable(),
  }),
});

export type COGSBreakdown = z.infer<typeof COGSBreakdownSchema>;

// API Request/Response types
export interface CreateManufacturingProductRequest {
  name: string;
  description?: string;
  sku?: string;
  formula_version_id?: string;
  packaging_material_id?: string;
  label_material_id?: string;
  net_weight: number;
  net_weight_unit?: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
  selling_price?: number;
  auto_calculate_cogs?: boolean;
}

export interface UpdateManufacturingProductRequest {
  name?: string;
  description?: string;
  sku?: string;
  formula_version_id?: string;
  packaging_material_id?: string;
  label_material_id?: string;
  net_weight?: number;
  net_weight_unit?: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
  selling_price?: number;
  status?: 'draft' | 'active' | 'discontinued';
  recalculate_cogs?: boolean;
}

export interface CalculateCOGSRequest {
  include_breakdown?: boolean;
}

export interface BatchCalculateCOGSRequest {
  product_ids?: string[];
  include_breakdown?: boolean;
  filter_options?: {
    status?: 'draft' | 'active' | 'discontinued';
    has_formula?: boolean;
    updated_since?: string;
  };
}

export interface BatchCalculateCOGSResponse {
  message: string;
  summary: {
    total_processed: number;
    successful: number;
    failed: number;
    total_cgs_calculated: number;
  };
  results: Array<{
    id: string;
    name: string;
    sku?: string;
    cogs: number;
    previous_cogs?: number;
    cogs_change: number;
    calculation_timestamp: string;
    cogs_breakdown?: COGSBreakdown;
  }>;
  errors: Array<{
    product_id: string;
    error: string;
  }>;
  calculation_timestamp: string;
}

export interface COGSCalculationResult {
  data: ManufacturingProductWithDetails;
  cogs: number;
  previous_cogs?: number;
  calculation_timestamp: string;
  cogs_breakdown?: COGSBreakdown;
}

export interface ProductMetrics {
  total_products: number;
  active_products: number;
  draft_products: number;
  discontinued_products: number;
  average_cogs: number;
  total_cogs_value: number;
  average_profit_margin: number;
  products_without_formula: number;
  products_without_packaging: number;
  products_without_label: number;
}

export interface ProductCostAnalysis {
  product_id: string;
  product_name: string;
  current_cogs: number;
  previous_cogs: number;
  cogs_change: number;
  cogs_change_percentage: number;
  selling_price?: number;
  profit_margin?: number;
  last_calculated: string;
  cost_breakdown: {
    formula_cost: number;
    packaging_cost: number;
    label_cost: number;
  };
}

// Validation functions
export function validateManufacturingProduct(data: CreateManufacturingProductRequest): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!data.net_weight || data.net_weight <= 0) {
    errors.push('Net weight must be a positive number');
  }

  if (data.sku && data.sku.trim().length === 0) {
    errors.push('SKU cannot be empty if provided');
  }

  if (data.selling_price !== undefined && data.selling_price < 0) {
    errors.push('Selling price must be positive');
  }

  // Warnings
  if (!data.formula_version_id) {
    warnings.push('No formula assigned - COGS calculation will be incomplete');
  }

  if (!data.packaging_material_id) {
    warnings.push('No packaging material assigned - packaging cost not included');
  }

  if (!data.label_material_id) {
    warnings.push('No label material assigned - label cost not included');
  }

  if (!data.selling_price) {
    warnings.push('No selling price set - profit margin cannot be calculated');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function calculateProfitMargin(cogs: number, sellingPrice: number): number | null {
  if (!sellingPrice || sellingPrice <= 0) {
    return null;
  }
  return ((sellingPrice - cogs) / sellingPrice) * 100;
}

export function analyzeCOGSChange(previousCOGS: number | null | undefined, currentCOGS: number): {
  change: number;
  changePercentage: number;
  trend: 'increase' | 'decrease' | 'unchanged';
} {
  if (!previousCOGS || previousCOGS === 0) {
    return {
      change: currentCOGS,
      changePercentage: 100,
      trend: 'increase'
    };
  }

  const change = currentCOGS - previousCOGS;
  const changePercentage = (change / previousCOGS) * 100;
  
  let trend: 'increase' | 'decrease' | 'unchanged';
  if (Math.abs(changePercentage) < 0.01) {
    trend = 'unchanged';
  } else if (change > 0) {
    trend = 'increase';
  } else {
    trend = 'decrease';
  }

  return {
    change,
    changePercentage,
    trend
  };
}