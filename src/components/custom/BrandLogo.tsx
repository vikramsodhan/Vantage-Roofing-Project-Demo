import Image from "next/image"

import { BRAND_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

// Intrinsic dimensions of public/VantageRoofingWordmark.png (used for aspect ratio).
const LOGO_WIDTH = 800
const LOGO_HEIGHT = 211

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <Image
      src="/VantageRoofingWordmark.png"
      alt={BRAND_NAME}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority
      className={cn("w-auto", className)}
    />
  )
}
