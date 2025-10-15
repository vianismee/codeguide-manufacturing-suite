import { z } from 'zod';

// Material Categories
export const MaterialCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  prefix: z.string().min(2, 'Prefix must be at least 2 characters').max(10, 'Prefix too long'),
  description: z.string().nullable().optional(),
  tenant_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type MaterialCategory = z.infer<typeof MaterialCategorySchema>;

// Materials
export const MaterialSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cost_per_unit: z.number().min(0, 'Cost must be positive'),
  unit_type: z.enum(['kg', 'g', 'l', 'ml', 'units', 'meters', 'cm']),
  material_type: z.enum(['raw_material', 'packaging', 'label']),
  supplier: z.string().nullable().optional(),
  min_stock_level: z.number().min(0, 'Min stock level must be positive').optional(),
  current_stock: z.number().min(0, 'Current stock must be positive').optional(),
  tenant_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Material = z.infer<typeof MaterialSchema>;

// Extended Material with category info
export const MaterialWithCategorySchema = MaterialSchema.extend({
  material_categories: z.object({
    id: z.string().uuid(),
    name: z.string(),
    prefix: z.string(),
  }).optional(),
});

export type MaterialWithCategory = z.infer<typeof MaterialWithCategorySchema>;

// API Request/Response types
export interface CreateMaterialCategoryRequest {
  name: string;
  prefix: string;
  description?: string;
}

export interface CreateMaterialRequest {
  category_id: string;
  name: string;
  code?: string;
  description?: string;
  cost_per_unit: number;
  unit_type: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
  material_type: 'raw_material' | 'packaging' | 'label';
  supplier?: string;
  min_stock_level?: number;
  current_stock?: number;
}

export interface UpdateMaterialRequest {
  category_id?: string;
  name?: string;
  code?: string;
  description?: string;
  cost_per_unit?: number;
  unit_type?: 'kg' | 'g' | 'l' | 'ml' | 'units' | 'meters' | 'cm';
  material_type?: 'raw_material' | 'packaging' | 'label';
  supplier?: string;
  min_stock_level?: number;
  current_stock?: number;
}

export interface GenerateCodeRequest {
  categoryPrefix: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}