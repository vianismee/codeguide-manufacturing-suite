"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Tag, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
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
const mockMaterials = [
  {
    id: '1',
    name: 'Vitamin C',
    code: 'AI001',
    category: { name: 'Active Ingredients', prefix: 'AI' },
    cost_per_unit: 45.50,
    unit_type: 'kg',
    material_type: 'raw_material',
    current_stock: 15.5,
    min_stock_level: 5,
    supplier: 'ChemSupplier Inc',
    status: 'in_stock'
  },
  {
    id: '2',
    name: 'Hyaluronic Acid',
    code: 'AI002',
    category: { name: 'Active Ingredients', prefix: 'AI' },
    cost_per_unit: 120.00,
    unit_type: 'kg',
    material_type: 'raw_material',
    current_stock: 2.1,
    min_stock_level: 5,
    supplier: 'BioTech Labs',
    status: 'low_stock'
  },
  {
    id: '3',
    name: '50ml Airless Pump',
    code: 'PK001',
    category: { name: 'Packaging', prefix: 'PK' },
    cost_per_unit: 1.25,
    unit_type: 'units',
    material_type: 'packaging',
    current_stock: 250,
    min_stock_level: 100,
    supplier: 'PackCo',
    status: 'in_stock'
  }
]

const mockCategories = [
  {
    id: '1',
    name: 'Active Ingredients',
    prefix: 'AI',
    description: 'Primary active ingredients for formulations',
    materials_count: 12
  },
  {
    id: '2',
    name: 'Packaging',
    prefix: 'PK',
    description: 'Bottles, pumps, caps, and containers',
    materials_count: 8
  },
  {
    id: '3',
    name: 'Labels',
    prefix: 'LB',
    description: 'Product labels and stickers',
    materials_count: 5
  }
]

function getStockStatus(currentStock: number, minStock: number) {
  if (currentStock <= minStock) {
    return <Badge variant="destructive">Low Stock</Badge>
  } else if (currentStock <= minStock * 1.5) {
    return <Badge variant="outline">Reorder Soon</Badge>
  }
  return <Badge variant="default">In Stock</Badge>
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  const filteredMaterials = mockMaterials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || material.category.name === selectedCategory
    const matchesType = selectedType === 'all' || material.material_type === selectedType
    
    return matchesSearch && matchesCategory && matchesType
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your materials, categories, and track stock levels
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/dashboard/inventory/categories/new">
            <Button variant="outline">
              <Tag className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </Link>
          <Link href="/dashboard/inventory/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search materials..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="all">All Categories</option>
                    {mockCategories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                  <select 
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="all">All Types</option>
                    <option value="raw_material">Raw Materials</option>
                    <option value="packaging">Packaging</option>
                    <option value="label">Labels</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials Table */}
          <Card>
            <CardHeader>
              <CardTitle>Materials ({filteredMaterials.length})</CardTitle>
              <CardDescription>
                Manage your material inventory and stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Cost/Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-sm text-muted-foreground">{material.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{material.category.name}</div>
                          <div className="text-sm text-muted-foreground">{material.category.prefix}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {material.material_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {material.current_stock} {material.unit_type}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Min: {material.min_stock_level} {material.unit_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>${material.cost_per_unit.toFixed(2)}</TableCell>
                      <TableCell>
                        {getStockStatus(material.current_stock, material.min_stock_level)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Material
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Material
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {/* Categories Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {category.name}
                    <Badge variant="outline">{category.prefix}</Badge>
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Materials</p>
                      <p className="text-2xl font-bold">{category.materials_count}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Category
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Category
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}