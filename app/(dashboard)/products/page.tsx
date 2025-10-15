"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Calculator, 
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from 'next/link'

// Mock data - in real implementation, this would come from TanStack Query
const mockProducts = [
  {
    id: '1',
    name: 'Anti-Aging Face Cream',
    sku: 'AFC-50',
    net_weight: 50,
    net_weight_unit: 'g',
    cogs: 12.45,
    selling_price: 45.00,
    status: 'active',
    formula_version: {
      version_number: 2,
      formulas: { name: 'Anti-Aging Face Cream' }
    },
    packaging_material: {
      name: '50ml Airless Pump',
      code: 'PK001'
    },
    label_material: {
      name: 'Premium Label',
      code: 'LB001'
    },
    last_cogs_calculation: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    name: 'Hydrating Serum',
    sku: 'HS-30',
    net_weight: 30,
    net_weight_unit: 'ml',
    cogs: 8.75,
    selling_price: 35.00,
    status: 'active',
    formula_version: {
      version_number: 1,
      formulas: { name: 'Hydrating Serum' }
    },
    packaging_material: {
      name: '30ml Dropper',
      code: 'PK002'
    },
    label_material: {
      name: 'Standard Label',
      code: 'LB002'
    },
    last_cogs_calculation: '2024-01-19T14:15:00Z'
  },
  {
    id: '3',
    name: 'Vitamin C Mask',
    sku: 'VCM-100',
    net_weight: 100,
    net_weight_unit: 'g',
    cogs: null,
    selling_price: 28.00,
    status: 'draft',
    formula_version: null,
    packaging_material: null,
    label_material: null,
    last_cogs_calculation: null
  }
]

function getProfitMargin(cogs: number | null, sellingPrice: number) {
  if (!cogs || !sellingPrice) return null
  return ((sellingPrice - cogs) / sellingPrice * 100)
}

function getProfitMarginStatus(margin: number | null) {
  if (!margin) return null
  if (margin >= 60) return { variant: 'default' as const, icon: TrendingUp, color: 'text-green-600' }
  if (margin >= 40) return { variant: 'secondary' as const, icon: TrendingUp, color: 'text-yellow-600' }
  return { variant: 'destructive' as const, icon: TrendingDown, color: 'text-red-600' }
}

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const totalProductsValue = filteredProducts.reduce((sum, product) => 
    sum + (product.cogs || 0), 0
  )
  const averageMargin = filteredProducts
    .filter(p => p.cogs && p.selling_price)
    .reduce((sum, product) => sum + getProfitMargin(product.cogs!, product.selling_price)!, 0) / 
    filteredProducts.filter(p => p.cogs && p.selling_price).length || 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products Management</h1>
          <p className="text-muted-foreground">
            Manage your manufacturing products and COGS calculations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Batch Calculate COGS
          </Button>
          <Link href="/dashboard/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredProducts.filter(p => p.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total COGS Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProductsValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Across active products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need COGS</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredProducts.filter(p => p.cogs === null).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting calculation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
          <CardDescription>
            Manage your manufacturing products and track profitability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>COGS</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const margin = getProfitMargin(product.cogs, product.selling_price)
                const marginStatus = getProfitMarginStatus(margin)
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.sku && `${product.sku} • `}
                          {product.net_weight} {product.net_weight_unit}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.formula_version ? (
                        <div>
                          <div className="font-medium">{product.formula_version.formulas.name}</div>
                          <div className="text-sm text-muted-foreground">
                            v{product.formula_version.version_number}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">No Formula</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        {product.cogs !== null ? (
                          <div className="font-medium">${product.cogs.toFixed(2)}</div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Not calculated</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Calculator className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {product.last_cogs_calculation && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(product.last_cogs_calculation).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      ${product.selling_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {margin !== null && marginStatus ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${marginStatus.color}`}>
                            {margin.toFixed(1)}%
                          </span>
                          <marginStatus.icon className={`h-4 w-4 ${marginStatus.color}`} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.status === 'active' ? 'default' : 'outline'}
                        className={product.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Product Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Calculator className="h-4 w-4 mr-2" />
                            Calculate COGS
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first product'}
            </p>
            <Link href="/dashboard/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}