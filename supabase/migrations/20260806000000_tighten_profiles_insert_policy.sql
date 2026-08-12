-- Pin new profiles to 'salesperson' in the database, not just in
-- auth/callback/route.ts. PostgREST is directly reachable with the publishable key,
-- so constraining only "id" let any authenticated user without a profile row insert
-- one for themselves as 'owner'.
--
-- Do not widen this — promotion is an UPDATE, already governed by
-- "Owners can update profiles".


DROP POLICY "Auth callback can insert profiles" ON "public"."profiles";


CREATE POLICY "Auth callback can insert profiles" ON "public"."profiles"
  FOR INSERT WITH CHECK (
    "id" = "auth"."uid"()
    AND "role" = 'salesperson'::"public"."user_role"
    AND "is_active" = true
  );
