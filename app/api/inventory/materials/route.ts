import { createAdminClient } from '@/utils/supabase/admin';
import { Database, Tables, TablesInsert } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/inventory/materials - Fetch all materials with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const materialType = searchParams.get('material_type');
    const categoryId = searchParams.get('category_id');

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
    if (materialType) {
      query = query.eq('material_type', materialType);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching materials:', error);
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/materials - Create a new material
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      category_id, 
      name, 
      code, 
      description, 
      cost_per_unit, 
      unit_type, 
      material_type,
      supplier,
      min_stock_level,
      current_stock 
    } = body;

    // Validation
    if (!category_id || !name || !cost_per_unit || !unit_type || !material_type) {
      return NextResponse.json({ 
        error: 'Category ID, name, cost per unit, unit type, and material type are required' 
      }, { status: 400 });
    }

    // Verify category belongs to user
    const { data: category, error: categoryError } = await supabase
      .from('material_categories')
      .select('id')
      .eq('id', category_id)
      .eq('tenant_id', userId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Check if code already exists
    if (code) {
      const { data: existingMaterial } = await supabase
        .from('materials')
        .select('id')
        .eq('code', code)
        .eq('tenant_id', userId)
        .single();

      if (existingMaterial) {
        return NextResponse.json({ error: 'Material code already exists' }, { status: 409 });
      }
    }

    const materialData: TablesInsert<'materials'> = {
      category_id,
      name,
      code: code || null,
      description: description || null,
      cost_per_unit,
      unit_type,
      material_type,
      supplier: supplier || null,
      min_stock_level: min_stock_level || 0,
      current_stock: current_stock || 0,
      tenant_id: userId,
    };

    const { data, error } = await supabase
      .from('materials')
      .insert([materialData])
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
      return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}