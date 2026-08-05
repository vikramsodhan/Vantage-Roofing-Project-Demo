// Actual (post-completion) costs only apply once a job is sold. When a job is
// explicitly NOT sold, these overrides zero every actual_* field so a row can
// never carry actual costs it shouldn't — e.g. after a sold job is toggled back
// to unsold, its now-irrelevant actuals must not persist. Spread the result over
// the payload at the write path. When the job is sold (or its sold state is
// unknown, e.g. a partial update), no override is applied.
export function zeroActualsWhenUnsold(sold: boolean | null | undefined) {
  if (sold !== false) return {}
  return {
    actual_materials: 0,
    actual_labour: 0,
    actual_disposal: 0,
    actual_warranty: 0,
    actual_other: 0,
    actual_gutters: 0,
  }
}
