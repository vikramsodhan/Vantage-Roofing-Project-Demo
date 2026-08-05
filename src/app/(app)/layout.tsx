import { DemoBanner } from "@/components/custom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { requireActiveProfile } from "@/lib/supabase/getProfile"

import MobileSidebarTrigger from "./_layout/MobileSidebarTrigger"
import AppSidebar from "./_layout/Sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireActiveProfile()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          profile={{
            full_name: profile.full_name,
            role: profile.role,
            email: profile.email,
          }}
        />
        <SidebarInset className="min-w-0">
          <DemoBanner />
          <MobileSidebarTrigger />
          <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
