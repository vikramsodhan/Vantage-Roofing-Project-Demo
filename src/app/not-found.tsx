import Link from "next/link"

import { Button } from "@/components/ui/button"

/**
 * not-found.tsx — 404 Page
 *
 * Next.js automatically renders this file when:
 *   - A route doesn't exist (e.g. /testing)
 *   - You call notFound() manually from any page or API route
 *
 * It must be a file named exactly not-found.tsx in the app/ directory.
 * Next.js looks for this filename specifically — it's a reserved name
 * just like page.tsx, layout.tsx, loading.tsx, and error.tsx.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground text-sm">
            The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
