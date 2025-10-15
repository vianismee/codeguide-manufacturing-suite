"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { DashboardMetrics } from '@/components/dashboard-metrics'
import { useMaterials } from '@/hooks/use-inventory'
import { useFormulas } from '@/hooks/use-formulas'
import { useProducts } from '@/hooks/use-products'

export default function DashboardOverview() {
  const { data: materialsData } = useMaterials()
  const { data: formulasData } = useFormulas({ include_versions: true })
  const { data: productsData } = useProducts()

  const recentActivity = [
    {
      id: 1,
      type: 'material',
      action: 'created',
      name: 'Citric Acid',
      timestamp: '2 hours ago'
    },
    {
      id: 2,
      type: 'formula',
      action: 'updated',
      name: 'Face Cream v2.1',
      timestamp: '4 hours ago'
    },
    {
      id: 3,
      type: 'product',
      action: 'created',
      name: 'Anti-Aging Serum',
      timestamp: '1 day ago'
    }
  ]

  const lowStockItems = materialsData?.filter(m => 
    m.current_stock <= m.min_stock_level
  ).map(m => ({
    id: m.id,
    name: m.name,
    currentStock: m.current_stock,
    minStock: m.min_stock_level,
    unit: m.unit_type
  })) || []

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to PAWGLOW Manufacturing Suite. Here's an overview of your operations.
        </p>
      </div>

      {/* Dashboard Metrics */}
      <DashboardMetrics />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to perform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/inventory/new">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Add New Material
              </Button>
            </Link>
            <Link href="/dashboard/formulas/new">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create Formula
              </Button>
            </Link>
            <Link href="/dashboard/products/new">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates to your manufacturing data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {activity.type === 'material' && <Package className="h-4 w-4 text-blue-500" />}
                    {activity.type === 'formula' && <FlaskConical className="h-4 w-4 text-green-500" />}
                    {activity.type === 'product' && <ShoppingCart className="h-4 w-4 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action} • {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="ghost" className="w-full">
                View All Activity
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>
              The following materials need to be restocked soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Current: {item.currentStock} {item.unit} • Minimum: {item.minStock} {item.unit}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    Low Stock
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/dashboard/inventory">
                <Button>
                  Manage Inventory
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}