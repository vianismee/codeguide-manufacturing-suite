"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Package, 
  FlaskConical, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  BarChart3,
  PieChart
} from 'lucide-react'
import { useProductsMetrics } from '@/hooks/use-products'
import { useFormulas } from '@/hooks/use-formulas'
import { useMaterials } from '@/hooks/use-inventory'

export function DashboardMetrics() {
  const { data: productsMetrics, isLoading: productsLoading } = useProductsMetrics()
  const { data: formulasData, isLoading: formulasLoading } = useFormulas()
  const { data: materialsData, isLoading: materialsLoading } = useMaterials()

  if (productsLoading || formulasLoading || materialsLoading) {
    return <div>Loading metrics...</div>
  }

  const totalMaterials = materialsData?.length || 0
  const lowStockMaterials = materialsData?.filter(m => 
    m.current_stock <= m.min_stock_level
  ).length || 0

  const totalFormulas = formulasData?.length || 0
  const activeFormulas = formulasData?.filter(f => 
    f.formula_versions?.some(v => v.is_active)
  ).length || 0

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaterials}</div>
            <p className="text-xs text-muted-foreground">
              {lowStockMaterials > 0 && (
                <span className="text-destructive">
                  {lowStockMaterials} low stock
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Formulas</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFormulas}</div>
            <p className="text-xs text-muted-foreground">
              of {totalFormulas} total formulas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productsMetrics?.active_products || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {productsMetrics?.total_products || 0} total products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productsMetrics?.average_profit_margin?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across active products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* COGS Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              COGS Analysis
            </CardTitle>
            <CardDescription>
              Cost of goods sold breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total COGS Value</span>
                <span className="font-medium">
                  ${productsMetrics?.total_cogs_value.toFixed(2) || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Average COGS</span>
                <span className="font-medium">
                  ${productsMetrics?.average_cogs.toFixed(2) || 0}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Missing COGS</span>
                <Badge variant="outline">
                  {productsMetrics?.total_products ? 
                    productsMetrics.total_products - (productsMetrics.average_cogs > 0 ? 1 : 0) : 0
                  }
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Calculation Needed</span>
                <Badge variant={productsMetrics?.total_cogs_value === 0 ? "destructive" : "outline"}>
                  {productsMetrics?.total_cogs_value === 0 ? "Required" : "Up to date"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Completeness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Product Completeness
            </CardTitle>
            <CardDescription>
              Configuration completeness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Has Formula</span>
                  <span className="text-muted-foreground">
                    {productsMetrics?.total_products ? 
                      Math.round(((productsMetrics.total_products - productsMetrics.products_without_formula) / productsMetrics.total_products) * 100) : 0
                    }%
                  </span>
                </div>
                <Progress 
                  value={productsMetrics?.total_products ? 
                    ((productsMetrics.total_products - productsMetrics.products_without_formula) / productsMetrics.total_products) * 100 : 0
                  } 
                  className="h-2" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Has Packaging</span>
                  <span className="text-muted-foreground">
                    {productsMetrics?.total_products ? 
                      Math.round(((productsMetrics.total_products - productsMetrics.products_without_packaging) / productsMetrics.total_products) * 100) : 0
                    }%
                  </span>
                </div>
                <Progress 
                  value={productsMetrics?.total_products ? 
                    ((productsMetrics.total_products - productsMetrics.products_without_packaging) / productsMetrics.total_products) * 100 : 0
                  } 
                  className="h-2" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Has Label</span>
                  <span className="text-muted-foreground">
                    {productsMetrics?.total_products ? 
                      Math.round(((productsMetrics.total_products - productsMetrics.products_without_label) / productsMetrics.total_products) * 100) : 0
                    }%
                  </span>
                </div>
                <Progress 
                  value={productsMetrics?.total_products ? 
                    ((productsMetrics.total_products - productsMetrics.products_without_label) / productsMetrics.total_products) * 100 : 0
                  } 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Status Overview
            </CardTitle>
            <CardDescription>
              Product status distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Active</span>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {productsMetrics?.active_products || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Draft</span>
                </div>
                <Badge variant="outline">
                  {productsMetrics?.draft_products || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Discontinued</span>
                </div>
                <Badge variant="destructive">
                  {productsMetrics?.discontinued_products || 0}
                </Badge>
              </div>
            </div>
            
            {lowStockMaterials > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {lowStockMaterials} materials need restocking
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}