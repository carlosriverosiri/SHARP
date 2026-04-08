-- =============================================
-- Säkerhet: fast search_path på publika funktioner
-- Migration: 031-function-search-path-hardening.sql
-- Beskrivning: Åtgärdar Supabase linter "function_search_path_mutable" (lint 0011).
--              Sätter search_path så att anrop inte kan kapas via skadlig search_path.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================

ALTER FUNCTION public.update_prompt_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_enkat_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_ai_council_profiles_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_ai_council_projects_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_zotero_cache() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_zotero_config_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_ai_council_kb_context(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_kb_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_kb_project_structure(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.registrera_nej_svar(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.rensa_utgangna_patienter() SET search_path = public, pg_temp;
ALTER FUNCTION public.rensa_gamla_kampanjer() SET search_path = public, pg_temp;
ALTER FUNCTION public.registrera_ja_svar(text, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_enkat_response(
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  text
) SET search_path = public, pg_temp;
ALTER FUNCTION public.kontrollera_rate_limit(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.rensa_rate_limit() SET search_path = public, pg_temp;

-- Dessa finns i vissa databaser (kort varsel) men saknar motsvarande CREATE i repots migrationer.
-- Looppen är harmlös om funktionerna saknas.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      quote_ident(n.nspname)
      || '.'
      || quote_ident(p.proname)
      || '('
      || pg_catalog.pg_get_function_identity_arguments(p.oid)
      || ')' AS fq_signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'hamta_nasta_att_skicka',
        'hamta_patienter_for_kampanj',
        'uppdatera_patient_efter_svar'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn.fq_signature);
  END LOOP;
END $$;
