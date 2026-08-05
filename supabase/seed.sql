-- Reference data for local dev + CI. Loaded automatically after migrations on
-- `supabase db reset` / `supabase start` — the app can't create a job without a
-- division and a work type to reference.
--
-- These are representative roofing-industry values chosen for the demo, not any
-- real company's service catalogue. `is_roof_type_required` is the column that
-- matters behaviourally: those work types make the job form prompt for
-- reroof/newroof, which the sheet export renders as an "RR_"/"NR_" prefix.
--
-- Tables are schema-qualified (public.*) below: the schema migration leaves an
-- empty search_path, and it doesn't reliably persist into the seed's connection,
-- so qualifying the names is the robust way to resolve them.

insert into public.divisions (name, is_active) values
  ('Residential',  true),
  ('Commercial',   true),
  ('Multi-Family', true);

-- Roof systems — quoted as either a reroof or a new roof.
insert into public.work_types (name, is_active, is_roof_type_required) values
  ('Asphalt Shingle',      true,  true),
  ('Architectural Shingle',true,  true),
  ('Cedar Shake',          true,  true),
  ('Standing Seam Metal',  true,  true),
  ('Modified Bitumen',     true,  true),
  ('Clay Tile',            true,  true),
  ('Slate',                true,  true),
  -- Services and components — no roof type applies.
  ('TPO Membrane',         true,  false),
  ('EPDM Membrane',        true,  false),
  ('Built-Up Roof',        true,  false),
  ('Inspection',           true,  false),
  ('Repair',               true,  false),
  ('Skylights',            true,  false),
  ('Gutters',              true,  false),
  ('Soffit & Fascia',      true,  false),
  ('Ventilation',          true,  false),
  ('Maintenance',          true,  false),
  ('Waterproofing',        true,  false),
  ('Miscellaneous',        true,  false);
