-- Put the ownership rule on INSERT that the UPDATE and DELETE policies already
-- enforce. "Active users can insert jobs" checked only that the caller was active,
-- so any salesperson could create a job attributed to a colleague — and the
-- dashboard reads salesperson_id as whose commission it is.
--
-- Managers and owners may still attribute to anyone, matching
-- canChangeSalesperson() in src/lib/authorization/jobPermissions.ts.


DROP POLICY "Active users can insert jobs" ON "public"."jobs";


CREATE POLICY "Active users can insert jobs" ON "public"."jobs"
  FOR INSERT WITH CHECK (
    "public"."is_active_user"()
    AND (("salesperson_id" = "auth"."uid"()) OR "public"."is_manager_or_owner"())
  );
