import { redirect } from "next/navigation"

/**
 * Root page — /
 *
 * This page has no UI. It just immediately redirects based on
 * the fact that middleware already handles auth checking.
 *
 * If the user is logged in → middleware lets them through →
 *   this redirects to /dashboard
 * If the user is not logged in → middleware catches them first →
 *   redirects to /login before this even runs
 */
export default function RootPage() {
  redirect("/dashboard")
}
