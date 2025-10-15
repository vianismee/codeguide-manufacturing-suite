import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { Database, Tables, TablesInsert } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabase = createAdminClient();

// GET /api/inventory/categories - Fetch all material categories
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('material_categories')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching material categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/categories - Create a new material category
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, prefix, description } = body;

    // Validation
    if (!name || !prefix) {
      return NextResponse.json({ error: 'Name and prefix are required' }, { status: 400 });
    }

    if (prefix.length < 2 || prefix.length > 10) {
      return NextResponse.json({ error: 'Prefix must be between 2 and 10 characters' }, { status: 400 });
    }

    // Check if prefix already exists for this user
    const { data: existingCategory } = await supabase
      .from('material_categories')
      .select('id')
      .eq('prefix', prefix)
      .eq('tenant_id', userId)
      .single();

    if (existingCategory) {
      return NextResponse.json({ error: 'Prefix already exists' }, { status: 409 });
    }

    const categoryData: TablesInsert<'material_categories'> = {
      name,
      prefix,
      description: description || null,
      tenant_id: userId,
    };

    const { data, error } = await supabase
      .from('material_categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      console.error('Error creating material category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}