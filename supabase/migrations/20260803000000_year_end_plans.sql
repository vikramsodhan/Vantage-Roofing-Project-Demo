CREATE TABLE IF NOT EXISTS "public"."year_end_plans" (
    "year" integer NOT NULL,
    "target_revenue" numeric(14,2),
    "revenue_override" numeric(14,2),
    "jobs_sold_override" integer,
    "avg_job_value_override" numeric(14,2),
    "conversion_pct_override" numeric(6,3),
    "months_remaining_override" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "year_end_plans_year_check" CHECK (("year" BETWEEN 2000 AND 2200)),
    CONSTRAINT "year_end_plans_target_revenue_check" CHECK (("target_revenue" >= (0)::numeric)),
    CONSTRAINT "year_end_plans_revenue_override_check" CHECK (("revenue_override" >= (0)::numeric)),
    CONSTRAINT "year_end_plans_jobs_sold_override_check" CHECK (("jobs_sold_override" >= 0)),
    CONSTRAINT "year_end_plans_avg_job_value_override_check" CHECK (("avg_job_value_override" >= (0)::numeric)),
    CONSTRAINT "year_end_plans_conversion_pct_override_check" CHECK (("conversion_pct_override" BETWEEN 0 AND 100)),
    CONSTRAINT "year_end_plans_months_remaining_override_check" CHECK (("months_remaining_override" BETWEEN 1 AND 12))
);


ALTER TABLE "public"."year_end_plans" OWNER TO "postgres";


ALTER TABLE ONLY "public"."year_end_plans"
    ADD CONSTRAINT "year_end_plans_pkey" PRIMARY KEY ("year");


ALTER TABLE ONLY "public"."year_end_plans"
    ADD CONSTRAINT "year_end_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."year_end_plans" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


ALTER TABLE "public"."year_end_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Managers and owners can read year end plans" ON "public"."year_end_plans" FOR SELECT USING ("public"."is_manager_or_owner"());


CREATE POLICY "Managers and owners can insert year end plans" ON "public"."year_end_plans" FOR INSERT WITH CHECK ("public"."is_manager_or_owner"());


CREATE POLICY "Managers and owners can update year end plans" ON "public"."year_end_plans" FOR UPDATE USING ("public"."is_manager_or_owner"());


GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."year_end_plans" TO "anon";
GRANT ALL ON TABLE "public"."year_end_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."year_end_plans" TO "service_role";
