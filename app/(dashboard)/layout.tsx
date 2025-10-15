import { SidebarProvider, SidebarTrigger, SidebarContent, Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar'
import { 
  LayoutDashboard, 
  Package, 
  FlaskConical, 
  ShoppingCart, 
  Settings,
  Plus,
  Boxes,
  Tag
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  {
    title: 'Dashboard',
    items: [
      {
        title: 'Overview',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Inventory Management',
    items: [
      {
        title: 'Materials',
        url: '/dashboard/inventory',
        icon: Package,
      },
      {
        title: 'Categories',
        url: '/dashboard/inventory/categories',
        icon: Tag,
      },
    ],
  },
  {
    title: 'Formulation',
    items: [
      {
        title: 'Formulas',
        url: '/dashboard/formulas',
        icon: FlaskConical,
      },
    ],
  },
  {
    title: 'Products',
    items: [
      {
        title: 'Manufacturing',
        url: '/dashboard/products',
        icon: ShoppingCart,
      },
    ],
  },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar variant="inset">
          <SidebarContent className="bg-background">
            <div className="p-4">
              <h1 className="text-xl font-bold text-foreground">PAWGLOW</h1>
              <p className="text-sm text-muted-foreground">Manufacturing Suite</p>
            </div>
            <div className="px-3 pb-2">
              <h2 className="mb-2 px-4 text-xs font-semibold text-muted-foreground tracking-tight">
                Main Navigation
              </h2>
              <SidebarMenu>
                {navigation.map((section) => (
                  <SidebarMenuItem key={section.title}>
                    <div className="mb-2">
                      <h3 className="px-4 text-xs font-medium text-muted-foreground">
                        {section.title}
                      </h3>
                      <SidebarMenuSub>
                        {section.items.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton 
                              asChild 
                              className={cn(
                                "hover:bg-accent hover:text-accent-foreground",
                                pathname === item.url && "bg-accent text-accent-foreground"
                              )}
                            >
                              <Link href={item.url}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Link href="/dashboard/inventory/new">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add
                </button>
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}