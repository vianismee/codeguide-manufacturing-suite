"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  Search, 
  FlaskConical, 
  Copy, 
  Edit,
  Trash2,
  Eye,
  History,
  CheckCircle,
  Clock
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

// Mock data - in real implementation, this would come from TanStack Query
const mockFormulas = [
  {
    id: '1',
    name: 'Anti-Aging Face Cream',
    description: 'Luxurious face cream with anti-aging properties',
    created_at: '2024-01-15',
    updated_at: '2024-01-20',
    status: 'active',
    versions: [
      { id: 'v1', version_number: 1, is_active: false, created_at: '2024-01-15' },
      { id: 'v2', version_number: 2, is_active: true, created_at: '2024-01-20' }
    ],
    active_ingredients: [
      { name: 'Vitamin C', code: 'AI001', percentage: 5.0 },
      { name: 'Hyaluronic Acid', code: 'AI002', percentage: 2.0 },
      { name: 'Retinol', code: 'AI003', percentage: 0.5 }
    ]
  },
  {
    id: '2',
    name: 'Hydrating Serum',
    description: 'Lightweight serum for deep hydration',
    created_at: '2024-01-10',
    updated_at: '2024-01-18',
    status: 'active',
    versions: [
      { id: 'v1', version_number: 1, is_active: true, created_at: '2024-01-10' }
    ],
    active_ingredients: [
      { name: 'Hyaluronic Acid', code: 'AI002', percentage: 3.0 },
      { name: 'Vitamin E', code: 'AI004', percentage: 1.0 },
      { name: 'Niacinamide', code: 'AI005', percentage: 4.0 }
    ]
  },
  {
    id: '3',
    name: 'Vitamin C Brightening Mask',
    description: 'Brightening face mask with vitamin C',
    created_at: '2024-01-05',
    updated_at: '2024-01-05',
    status: 'draft',
    versions: [
      { id: 'v1', version_number: 1, is_active: false, created_at: '2024-01-05' }
    ],
    active_ingredients: []
  }
]

export default function FormulasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filteredFormulas = mockFormulas.filter(formula => {
    const matchesSearch = formula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formula.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || formula.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formulation Management</h1>
          <p className="text-muted-foreground">
            Create and manage product formulas with version control
          </p>
        </div>
        <Link href="/dashboard/formulas/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Formula
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search formulas..."
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
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulas Grid */}
      <div className="grid gap-6">
        {filteredFormulas.map((formula) => (
          <Card key={formula.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{formula.name}</CardTitle>
                    {formula.status === 'active' ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{formula.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <History className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Formula Actions</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Formula
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Create New Version
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Formula
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Version Information */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Version Control</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      v{formula.versions[formula.versions.length - 1].version_number}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formula.versions.length} version{formula.versions.length > 1 ? 's' : ''}
                    </span>
                    {formula.versions.some(v => v.is_active) && (
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Last updated</p>
                  <p className="text-sm font-medium">{formula.updated_at}</p>
                </div>
              </div>

              {/* Active Version Ingredients */}
              {formula.active_ingredients.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Active Version Ingredients</p>
                  <div className="space-y-2">
                    {formula.active_ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{ingredient.name}</p>
                            <p className="text-xs text-muted-foreground">{ingredient.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{ingredient.percentage}%</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Total</p>
                        <p className="text-sm font-bold">
                          {formula.active_ingredients.reduce((sum, ing) => sum + ing.percentage, 0)}%
                        </p>
                      </div>
                      <Progress 
                        value={formula.active_ingredients.reduce((sum, ing) => sum + ing.percentage, 0)} 
                        className="mt-1" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Version History */}
              <div>
                <p className="text-sm font-medium mb-3">Version History</p>
                <div className="space-y-1">
                  {formula.versions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${version.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-sm font-medium">Version {version.version_number}</span>
                        {version.is_active && (
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{version.created_at}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  New Version
                </Button>
                <Button size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Formula
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFormulas.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No formulas found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first formula'}
            </p>
            <Link href="/dashboard/formulas/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Formula
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}