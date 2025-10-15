export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            graphql: {
                Args: {
                    operationName?: string
                    query?: string
                    variables?: Json
                    extensions?: Json
                }
                Returns: Json
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
    public: {
        Tables: {
            customers: {
                Row: {
                    id: string
                    stripe_customer_id: string | null
                }
                Insert: {
                    id: string
                    stripe_customer_id?: string | null
                }
                Update: {
                    id?: string
                    stripe_customer_id?: string | null
                }
                Relationships: []
            }
            prices: {
                Row: {
                    active: boolean | null
                    currency: string | null
                    description: string | null
                    id: string
                    interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
                    interval_count: number | null
                    metadata: Json | null
                    product_id: string | null
                    trial_period_days: number | null
                    type: Database["public"]["Enums"]["pricing_type"] | null
                    unit_amount: number | null
                }
                Insert: {
                    active?: boolean | null
                    currency?: string | null
                    description?: string | null
                    id: string
                    interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
                    interval_count?: number | null
                    metadata?: Json | null
                    product_id?: string | null
                    trial_period_days?: number | null
                    type?: Database["public"]["Enums"]["pricing_type"] | null
                    unit_amount?: number | null
                }
                Update: {
                    active?: boolean | null
                    currency?: string | null
                    description?: string | null
                    id?: string
                    interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
                    interval_count?: number | null
                    metadata?: Json | null
                    product_id?: string | null
                    trial_period_days?: number | null
                    type?: Database["public"]["Enums"]["pricing_type"] | null
                    unit_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "prices_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            products: {
                Row: {
                    active: boolean | null
                    description: string | null
                    id: string
                    image: string | null
                    live_mode: boolean | null
                    marketing_features: string[] | null
                    metadata: Json | null
                    name: string | null
                }
                Insert: {
                    active?: boolean | null
                    description?: string | null
                    id: string
                    image?: string | null
                    live_mode?: boolean | null
                    marketing_features?: string[] | null
                    metadata?: Json | null
                    name?: string | null
                }
                Update: {
                    active?: boolean | null
                    description?: string | null
                    id?: string
                    image?: string | null
                    live_mode?: boolean | null
                    marketing_features?: string[] | null
                    metadata?: Json | null
                    name?: string | null
                }
                Relationships: []
            }
            subscriptions: {
                Row: {
                    cancel_at: string | null
                    cancel_at_period_end: boolean | null
                    canceled_at: string | null
                    created: string
                    current_period_end: string
                    current_period_start: string
                    ended_at: string | null
                    id: string
                    metadata: Json | null
                    price_id: string | null
                    quantity: number | null
                    status: Database["public"]["Enums"]["subscription_status"] | null
                    trial_end: string | null
                    trial_start: string | null
                    user_id: string
                }
                Insert: {
                    cancel_at?: string | null
                    cancel_at_period_end?: boolean | null
                    canceled_at?: string | null
                    created?: string
                    current_period_end?: string
                    current_period_start?: string
                    ended_at?: string | null
                    id: string
                    metadata?: Json | null
                    price_id?: string | null
                    quantity?: number | null
                    status?: Database["public"]["Enums"]["subscription_status"] | null
                    trial_end?: string | null
                    trial_start?: string | null
                    user_id: string
                }
                Update: {
                    cancel_at?: string | null
                    cancel_at_period_end?: boolean | null
                    canceled_at?: string | null
                    created?: string
                    current_period_end?: string
                    current_period_start?: string
                    ended_at?: string | null
                    id?: string
                    metadata?: Json | null
                    price_id?: string | null
                    quantity?: number | null
                    status?: Database["public"]["Enums"]["subscription_status"] | null
                    trial_end?: string | null
                    trial_start?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "subscriptions_price_id_fkey"
                        columns: ["price_id"]
                        isOneToOne: false
                        referencedRelation: "prices"
                        referencedColumns: ["id"]
                    },
                ]
            }
            material_categories: {
                Row: {
                    id: string
                    name: string
                    prefix: string
                    description: string | null
                    tenant_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    prefix: string
                    description?: string | null
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    prefix?: string
                    description?: string | null
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            materials: {
                Row: {
                    id: string
                    category_id: string
                    name: string
                    code: string
                    description: string | null
                    cost_per_unit: number
                    unit_type: Database["public"]["Enums"]["unit_type"]
                    material_type: Database["public"]["Enums"]["material_type"]
                    supplier: string | null
                    min_stock_level: number
                    current_stock: number
                    tenant_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    category_id: string
                    name: string
                    code: string
                    description?: string | null
                    cost_per_unit: number
                    unit_type: Database["public"]["Enums"]["unit_type"]
                    material_type: Database["public"]["Enums"]["material_type"]
                    supplier?: string | null
                    min_stock_level?: number
                    current_stock?: number
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    category_id?: string
                    name?: string
                    code?: string
                    description?: string | null
                    cost_per_unit?: number
                    unit_type?: Database["public"]["Enums"]["unit_type"]
                    material_type?: Database["public"]["Enums"]["material_type"]
                    supplier?: string | null
                    min_stock_level?: number
                    current_stock?: number
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "materials_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "material_categories"
                        referencedColumns: ["id"]
                    },
                ]
            }
            formulas: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    created_by: string
                    tenant_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    created_by: string
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    created_by?: string
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            formula_versions: {
                Row: {
                    id: string
                    formula_id: string
                    version_number: number
                    is_active: boolean
                    notes: string | null
                    created_by: string
                    tenant_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    formula_id: string
                    version_number: number
                    is_active?: boolean
                    notes?: string | null
                    created_by: string
                    tenant_id?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    formula_id?: string
                    version_number?: number
                    is_active?: boolean
                    notes?: string | null
                    created_by?: string
                    tenant_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "formula_versions_formula_id_fkey"
                        columns: ["formula_id"]
                        isOneToOne: false
                        referencedRelation: "formulas"
                        referencedColumns: ["id"]
                    },
                ]
            }
            formula_ingredients: {
                Row: {
                    id: string
                    formula_version_id: string
                    material_id: string
                    percentage: number
                    tenant_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    formula_version_id: string
                    material_id: string
                    percentage: number
                    tenant_id?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    formula_version_id?: string
                    material_id?: string
                    percentage?: number
                    tenant_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "formula_ingredients_formula_version_id_fkey"
                        columns: ["formula_version_id"]
                        isOneToOne: false
                        referencedRelation: "formula_versions"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "formula_ingredients_material_id_fkey"
                        columns: ["material_id"]
                        isOneToOne: false
                        referencedRelation: "materials"
                        referencedColumns: ["id"]
                    },
                ]
            }
            manufacturing_products: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    sku: string | null
                    formula_version_id: string | null
                    packaging_material_id: string | null
                    label_material_id: string | null
                    net_weight: number
                    net_weight_unit: Database["public"]["Enums"]["unit_type"]
                    cogs: number | null
                    selling_price: number | null
                    status: string
                    tenant_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    sku?: string | null
                    formula_version_id?: string | null
                    packaging_material_id?: string | null
                    label_material_id?: string | null
                    net_weight: number
                    net_weight_unit?: Database["public"]["Enums"]["unit_type"]
                    cogs?: number | null
                    selling_price?: number | null
                    status?: string
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    sku?: string | null
                    formula_version_id?: string | null
                    packaging_material_id?: string | null
                    label_material_id?: string | null
                    net_weight?: number
                    net_weight_unit?: Database["public"]["Enums"]["unit_type"]
                    cogs?: number | null
                    selling_price?: number | null
                    status?: string
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "manufacturing_products_formula_version_id_fkey"
                        columns: ["formula_version_id"]
                        isOneToOne: false
                        referencedRelation: "formula_versions"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "manufacturing_products_packaging_material_id_fkey"
                        columns: ["packaging_material_id"]
                        isOneToOne: false
                        referencedRelation: "materials"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "manufacturing_products_label_material_id_fkey"
                        columns: ["label_material_id"]
                        isOneToOne: false
                        referencedRelation: "materials"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            requesting_user_id: {
                Args: Record<PropertyKey, never>
                Returns: string
            }
            generate_material_code: {
                Args: {
                    p_category_prefix: string
                }
                Returns: string
            }
            validate_formula_percentages: {
                Args: {
                    p_formula_version_id: string
                }
                Returns: boolean
            }
            calculate_product_cogs: {
                Args: {
                    p_product_id: string
                }
                Returns: number
            }
        }
        Enums: {
            pricing_plan_interval: "day" | "week" | "month" | "year"
            pricing_type: "one_time" | "recurring"
            subscription_status:
            | "trialing"
            | "active"
            | "canceled"
            | "incomplete"
            | "incomplete_expired"
            | "past_due"
            | "unpaid"
            | "paused"
            material_type: "raw_material" | "packaging" | "label"
            unit_type: "kg" | "g" | "l" | "ml" | "units" | "meters" | "cm"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never