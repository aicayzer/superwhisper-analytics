'use client'

import { BarChart3Icon, GlobeIcon, LayoutDashboardIcon, ListIcon, MicIcon, Settings2Icon, SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useProfile } from '@/components/profile-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'

const NAV_ITEMS = [
  { title: 'Overview', href: '/overview', icon: LayoutDashboardIcon },
  { title: 'Recordings', href: '/recordings', icon: ListIcon },
  { title: 'Patterns', href: '/patterns', icon: BarChart3Icon },
  { title: 'Language', href: '/language', icon: SparklesIcon },
  { title: 'Modes', href: '/modes', icon: MicIcon },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { profile, setProfile } = useProfile()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/overview" />} className="data-[slot=sidebar-menu-button]:p-1.5! h-auto">
              <MicIcon className="size-4 shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">SuperWhisper</span>
                <span className="text-xs text-muted-foreground">Analytics</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Profile switcher */}
        <div className="px-2 pt-1 pb-2">
          <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
            <button
              onClick={() => setProfile('default')}
              className={`flex-1 px-2 py-1.5 transition-colors ${
                profile === 'default'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setProfile('on')}
              className={`flex-1 px-2 py-1.5 transition-colors ${
                profile === 'on'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ON
            </button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ title, href, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/overview' && pathname.startsWith(href))
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton render={<Link href={href} />} isActive={isActive}>
                      <Icon />
                      <span>{title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/settings" />} isActive={pathname === '/settings'}>
              <Settings2Icon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="https://github.com/aicayzer/superwhisper-analytics" target="_blank" rel="noopener noreferrer" />}>
              <GlobeIcon />
              <span>GitHub</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
