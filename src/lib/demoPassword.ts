/**
 * The password the seeded demo accounts are created with, and that the demo's
 * sign-in action authenticates with. One value, imported by both, so they
 * cannot drift into "the app signs in with a password the accounts don't have".
 *
 * Not a secret. These accounts exist only in local dev, CI, and the public
 * demo, where any stranger can sign in by clicking a button — knowing the
 * password grants nothing that button doesn't. Making it a required secret
 * would also break CI on pull requests from forks, which GitHub deliberately
 * runs without access to secrets.
 *
 * DEMO_PASSWORD is therefore optional: it exists only so the value can be
 * rotated without a commit. Set it and you must also re-run the seed, or the
 * accounts keep the old password and the demo's front door stops opening.
 *
 * Kept out of lib/demo.ts on purpose — that module is imported by the login
 * page's client component, and this string has no business in a browser
 * bundle even when it isn't secret.
 */
export const DEMO_DEFAULT_PASSWORD = "password123"

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? DEMO_DEFAULT_PASSWORD
