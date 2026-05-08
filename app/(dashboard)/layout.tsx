import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 64)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <div className="flex flex-1 flex-col min-h-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
