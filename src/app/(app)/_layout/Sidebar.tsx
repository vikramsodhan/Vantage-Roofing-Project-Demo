"use client"

import { Briefcase, LayoutDashboard, LogOut, Plus, Shield, Target } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { BrandLogo } from "@/components/custom"
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { isManagerOrOwner, isOwner } from "@/lib/authorization/roles"
import { createClient } from "@/lib/supabase/client"
import { Profile } from "@/types"

// App-wide nav, gated per item by role via NavItem.isVisible.
interface AppSidebarProps {
  profile: Pick<Profile, "full_name" | "role" | "email">
}

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  isActive: (pathname: string) => boolean
  /** Omit to show the item to everyone. Nav visibility is a convenience, never
   *  the gate — each restricted page re-checks the role server-side. */
  isVisible?: (profile: AppSidebarProps["profile"]) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    isActive: (p) => p.startsWith("/dashboard"),
  },
  {
    href: "/year-end-plan",
    label: "Year-End Plan",
    icon: Target,
    isActive: (p) => p.startsWith("/year-end-plan"),
    isVisible: isManagerOrOwner,
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: Briefcase,
    isActive: (p) => p === "/jobs" || (p.startsWith("/jobs/") && p !== "/jobs/new"),
  },
  {
    href: "/jobs/new",
    label: "New Job",
    icon: Plus,
    isActive: (p) => p === "/jobs/new",
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    isActive: (p) => p.startsWith("/admin"),
    isVisible: isOwner,
  },
]

function getInitials(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export default function AppSidebar({ profile }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const showProfileTooltip = state === "collapsed" && !isMobile

  function closeOnMobile() {
    if (isMobile) setOpenMobile(false)
  }

  async function handleSignOut() {
    closeOnMobile()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => item.isVisible?.(profile) ?? true)

  const displayName = profile.full_name?.trim() || profile.email?.trim() || "Account"
  const initials = getInitials(profile.full_name, profile.email)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/dashboard"
            onClick={closeOnMobile}
            className="flex shrink-0 items-center group-data-[collapsible=icon]:hidden"
          >
            <BrandLogo className="h-8 shrink-0" />
          </Link>
          <SidebarTrigger className="ml-auto shrink-0 group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive(pathname)}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={closeOnMobile}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                {initials}
              </div>
              <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{displayName}</span>
                <span className="truncate text-xs capitalize text-sidebar-foreground/70">
                  {profile.role}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" hidden={!showProfileTooltip}>
            {displayName}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm font-medium text-sidebar-foreground outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
            >
              <span className="flex size-8 shrink-0 items-center justify-center">
                <LogOut className="size-4" />
              </span>
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" hidden={!showProfileTooltip}>
            Sign out
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  )
}
