


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."job_roof_type" AS ENUM (
    'reroof',
    'newroof'
);


ALTER TYPE "public"."job_roof_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'salesperson',
    'manager',
    'owner'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_user"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and is_active = true
  );
$$;


ALTER FUNCTION "public"."is_active_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and is_active = true
    and role = 'manager'
  );
$$;


ALTER FUNCTION "public"."is_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager_or_owner"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select is_manager() or is_owner();
$$;


ALTER FUNCTION "public"."is_manager_or_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_owner"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and is_active = true
    and role = 'owner'
  );
$$;


ALTER FUNCTION "public"."is_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_address" "text" NOT NULL,
    "notes" "text",
    "division_id" "uuid" NOT NULL,
    "date_quoted" "date" NOT NULL,
    "date_sold" "date",
    "sold" boolean DEFAULT false NOT NULL,
    "exclude_from_quote_metrics" boolean DEFAULT false NOT NULL,
    "work_type_id" "uuid" NOT NULL,
    "roof_type" "public"."job_roof_type",
    "salesperson_id" "uuid" NOT NULL,
    "squares" numeric(10,2) DEFAULT 0 NOT NULL,
    "days" numeric(10,2) DEFAULT 0 NOT NULL,
    "materials" numeric(12,2) DEFAULT 0 NOT NULL,
    "labour" numeric(12,2) DEFAULT 0 NOT NULL,
    "disposal" numeric(12,2) DEFAULT 0 NOT NULL,
    "warranty" numeric(12,2) DEFAULT 0 NOT NULL,
    "other" numeric(12,2) DEFAULT 0 NOT NULL,
    "gutters" numeric(12,2) DEFAULT 0 NOT NULL,
    "actual_materials" numeric(12,2) DEFAULT 0 NOT NULL,
    "actual_labour" numeric(12,2) DEFAULT 0 NOT NULL,
    "actual_disposal" numeric(12,2) DEFAULT 0 NOT NULL,
    "actual_warranty" numeric(12,2) DEFAULT 0 NOT NULL,
    "actual_other" numeric(12,2) DEFAULT 0 NOT NULL,
    "actual_gutters" numeric(12,2) DEFAULT 0 NOT NULL,
    "sales_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_job_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    "mgn" numeric(12,2) DEFAULT 0 NOT NULL,
    "date_entered" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entered_by" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "markup_pct" numeric DEFAULT 40 NOT NULL,
    CONSTRAINT "jobs_notes_check" CHECK (("char_length"("notes") <= 5000))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "role" "public"."user_role" DEFAULT 'salesperson'::"public"."user_role" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_roof_type_required" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_types" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."jobs_with_calculations" WITH ("security_invoker"='true') AS
 SELECT "j"."id",
    "j"."job_address",
    "j"."notes",
    "j"."division_id",
    "d"."name" AS "division_name",
    "j"."work_type_id",
    "wt"."name" AS "work_type_name",
    "wt"."is_roof_type_required",
    "j"."roof_type",
    "j"."date_quoted",
    "j"."date_sold",
    "j"."sold",
    "j"."exclude_from_quote_metrics",
    "j"."salesperson_id",
    "sp"."full_name" AS "salesperson_name",
    "j"."squares",
    "j"."days",
    "j"."materials",
    "j"."labour",
    "j"."disposal",
    "j"."warranty",
    "j"."other",
    "j"."gutters",
    "j"."actual_materials",
    "j"."actual_labour",
    "j"."actual_disposal",
    "j"."actual_warranty",
    "j"."actual_other",
    "j"."actual_gutters",
    "j"."sales_price",
    "j"."total_job_cost",
    "j"."mgn",
    "j"."markup_pct",
    "j"."date_entered",
    "j"."entered_by",
    "eb"."full_name" AS "entered_by_name",
    "j"."updated_at",
        CASE
            WHEN ("j"."sales_price" = (0)::numeric) THEN NULL::numeric
            ELSE "round"((("j"."total_job_cost" / "j"."sales_price") * (100)::numeric), 2)
        END AS "total_cost_percent",
        CASE
            WHEN ("j"."squares" = (0)::numeric) THEN NULL::numeric
            ELSE "round"(("j"."sales_price" / "j"."squares"), 2)
        END AS "dollar_per_square",
        CASE
            WHEN ("j"."days" = (0)::numeric) THEN NULL::numeric
            ELSE "round"(("j"."mgn" / "j"."days"), 2)
        END AS "mgn_per_day",
        CASE
            WHEN ("j"."days" = (0)::numeric) THEN NULL::numeric
            ELSE "round"(("j"."labour" / "j"."days"), 2)
        END AS "ee_mgn_per_day",
    ((((("j"."actual_materials" + "j"."actual_labour") + "j"."actual_disposal") + "j"."actual_warranty") + "j"."actual_other") + "j"."actual_gutters") AS "actual_total_job_cost"
   FROM (((("public"."jobs" "j"
     LEFT JOIN "public"."divisions" "d" ON (("j"."division_id" = "d"."id")))
     LEFT JOIN "public"."work_types" "wt" ON (("j"."work_type_id" = "wt"."id")))
     LEFT JOIN "public"."profiles" "sp" ON (("j"."salesperson_id" = "sp"."id")))
     LEFT JOIN "public"."profiles" "eb" ON (("j"."entered_by" = "eb"."id")));


ALTER VIEW "public"."jobs_with_calculations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_types"
    ADD CONSTRAINT "work_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."work_types"
    ADD CONSTRAINT "work_types_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active users can insert jobs" ON "public"."jobs" FOR INSERT WITH CHECK ("public"."is_active_user"());



CREATE POLICY "Active users can insert work types" ON "public"."work_types" FOR INSERT WITH CHECK ("public"."is_active_user"());



CREATE POLICY "Active users can read all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_active_user"());



CREATE POLICY "Active users can read jobs" ON "public"."jobs" FOR SELECT USING ("public"."is_active_user"());



CREATE POLICY "Auth callback can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can read divisions" ON "public"."divisions" FOR SELECT USING ("public"."is_active_user"());



CREATE POLICY "Authenticated users can read work types" ON "public"."work_types" FOR SELECT USING ("public"."is_active_user"());



CREATE POLICY "Owners can delete divisions" ON "public"."divisions" FOR DELETE USING ("public"."is_owner"());



CREATE POLICY "Owners can delete work types" ON "public"."work_types" FOR DELETE USING ("public"."is_owner"());



CREATE POLICY "Owners can insert divisions" ON "public"."divisions" FOR INSERT WITH CHECK ("public"."is_owner"());



CREATE POLICY "Owners can update profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_owner"());



CREATE POLICY "Owners can update work types" ON "public"."work_types" FOR UPDATE USING ("public"."is_owner"());



CREATE POLICY "Users can delete own jobs, managers and owners can delete any" ON "public"."jobs" FOR DELETE USING (("public"."is_active_user"() AND (("salesperson_id" = "auth"."uid"()) OR "public"."is_manager_or_owner"())));



CREATE POLICY "Users can update own jobs, managers and owners can update any" ON "public"."jobs" FOR UPDATE USING (("public"."is_active_user"() AND (("salesperson_id" = "auth"."uid"()) OR "public"."is_manager_or_owner"())));



ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_types" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."work_types" TO "anon";
GRANT ALL ON TABLE "public"."work_types" TO "authenticated";
GRANT ALL ON TABLE "public"."work_types" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."jobs_with_calculations" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."jobs_with_calculations" TO "authenticated";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."jobs_with_calculations" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";







