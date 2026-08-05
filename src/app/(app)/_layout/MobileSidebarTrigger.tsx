"use client"

import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export default function MobileSidebarTrigger() {
  const { toggleSidebar, isMobile, openMobile } = useSidebar()

  if (!isMobile || openMobile) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleSidebar}
      aria-label="Open menu"
      className="fixed top-3 left-3 z-30 size-10 rounded-full bg-background/90 shadow-md backdrop-blur md:hidden"
    >
      <Menu className="size-5" />
    </Button>
  )
}
