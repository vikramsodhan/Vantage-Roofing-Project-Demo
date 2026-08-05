-- Months remaining is only ever displayed as whole month labels ("Aug–Dec"), so
-- a fractional half-month has no meaning the UI can express. Narrow the column
-- to integer rather than keep rounding fractions at every read site.
ALTER TABLE "public"."year_end_plans"
    DROP CONSTRAINT "year_end_plans_months_remaining_override_check";

ALTER TABLE "public"."year_end_plans"
    ALTER COLUMN "months_remaining_override" TYPE integer
    USING "round"("months_remaining_override");

ALTER TABLE "public"."year_end_plans"
    ADD CONSTRAINT "year_end_plans_months_remaining_override_check"
    CHECK (("months_remaining_override" BETWEEN 1 AND 12));
