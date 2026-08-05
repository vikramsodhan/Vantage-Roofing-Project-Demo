/**
 * scripts/buildJobs.ts — generates the demo's job rows.
 *
 * Shared by seed.ts (fresh bootstrap) and resetDemo.ts (restore after
 * vandalism) so the demo looks identical either way. A second generator would
 * drift, and the difference would only ever show up as "the demo looks
 * different after a reset than after a seed", which nobody would trace back.
 */

import { faker } from "@faker-js/faker"

import type { Database } from "../src/types/database.types"

export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"]

export const JOB_COUNT = 400

/**
 * Re-applied at the start of every build rather than once at module load, so
 * the output doesn't depend on how many faker calls the caller made first.
 * seed.ts generates user names before building jobs; resetDemo.ts doesn't.
 * Without this, the two would produce different data from the same seed.
 */
const FAKER_SEED = 20260731

export type JobReferenceData = {
  divisionIds: string[]
  workTypes: { id: string; is_roof_type_required: boolean | null }[]
}

export type JobUsers = {
  owner: string
  manager: string
  salespeople: string[]
}

// Quotes span this year and the two before it, anchored to the real clock
// rather than fixed dates: the year-end plan reads *this* year's jobs, so a
// hardcoded end date would leave that page empty the moment the year rolled
// over. Faker still runs off a fixed seed, so the figures stay deterministic —
// only the window they land in moves.
const ymd = (date: Date) => date.toISOString().slice(0, 10)

export function buildJobs(ref: JobReferenceData, users: JobUsers): JobInsert[] {
  faker.seed(FAKER_SEED)

  const today = new Date()
  const oldestQuote = new Date(Date.UTC(today.getUTCFullYear() - 2, 0, 1))
  const money = (min: number, max: number) => faker.number.int({ min, max })
  const enteredByPool = [...users.salespeople, users.owner, users.manager]

  return Array.from({ length: JOB_COUNT }, () => {
    const workType = faker.helpers.arrayElement(ref.workTypes)
    const roof_type = workType.is_roof_type_required
      ? faker.helpers.arrayElement(["reroof", "newroof"] as const)
      : null

    const dateQuoted = faker.date.between({ from: oldestQuote, to: today })
    const sold = faker.datatype.boolean(0.45)
    // A sale can't land in the future, so a close date past today collapses to
    // today — otherwise a recently quoted job could report revenue next year.
    const soldAt = faker.date.soon({
      days: faker.number.int({ min: 5, max: 200 }),
      refDate: dateQuoted,
    })
    const dateSold = sold ? (soldAt > today ? today : soldAt) : null

    const materials = money(2000, 15000)
    const labour = money(1500, 12000)
    const disposal = money(200, 2000)
    const warranty = money(0, 1500)
    const other = money(0, 1000)
    const gutters = money(0, 2000)

    const total_job_cost = materials + labour + disposal + warranty + other + gutters
    const markup_pct = faker.number.int({ min: 30, max: 55 })
    const sales_price = Math.round(total_job_cost * (1 + markup_pct / 100))

    // Actual costs only exist once a job is sold (mirrors zeroActualsWhenUnsold).
    const actual = (v: number) =>
      sold ? Math.round(v * faker.number.float({ min: 0.85, max: 1.15 })) : 0

    // A few genuine cross-year sold jobs are flagged as carry-overs, to exercise
    // the dashboard's carry-over handling on real data.
    const crossYear = dateSold != null && dateSold.getFullYear() > dateQuoted.getFullYear()
    const exclude_from_quote_metrics = crossYear && faker.datatype.boolean(0.5)

    return {
      job_address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      division_id: faker.helpers.arrayElement(ref.divisionIds),
      work_type_id: workType.id,
      roof_type,
      salesperson_id: faker.helpers.arrayElement(users.salespeople),
      entered_by: faker.helpers.arrayElement(enteredByPool),
      date_quoted: ymd(dateQuoted),
      date_sold: dateSold ? ymd(dateSold) : null,
      sold,
      exclude_from_quote_metrics,
      squares: faker.number.int({ min: 8, max: 60 }),
      days: faker.number.float({ min: 0.5, max: 12, fractionDigits: 1 }),
      materials,
      labour,
      disposal,
      warranty,
      other,
      gutters,
      actual_materials: actual(materials),
      actual_labour: actual(labour),
      actual_disposal: actual(disposal),
      actual_warranty: actual(warranty),
      actual_other: actual(other),
      actual_gutters: actual(gutters),
      total_job_cost,
      sales_price,
      mgn: sales_price - total_job_cost,
      markup_pct,
    }
  })
}
