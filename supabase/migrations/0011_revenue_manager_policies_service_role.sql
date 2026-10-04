-- Scope the Revenue Manager audit-table policies to service_role.
-- Databases that ran the bundle's original 001 got these policies with no role
-- (= every role, including anon). 0009's IF NOT EXISTS guard won't touch them,
-- so this re-scopes them explicitly. Safe to re-run.
ALTER POLICY service_all ON public.market_snapshots TO service_role;
ALTER POLICY service_all ON public.pricelabs_change_log TO service_role;
ALTER POLICY service_all ON public.pricing_decisions TO service_role;
ALTER POLICY service_all ON public.property_config TO service_role;
