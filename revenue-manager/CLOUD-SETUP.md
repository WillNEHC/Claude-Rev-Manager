# Revenue Manager — cloud setup (this repo)

The Solnest bundle in this folder was written for Claude Code on a local machine.
In this repo it is wired for Claude Code cloud sessions instead:

| Piece | Where | Status |
|---|---|---|
| Skill | `.claude/skills/revenue-manager/` | Loads automatically in every session of this repo. Patched to recognise the official `mcp__PriceLabs__*` and `mcp__Supabase__*` connectors. |
| Pricing | official PriceLabs connector (claude.ai) | Already connected — nothing to install. |
| PMS (Hospitable) | `.mcp.json` → `scripts/run-hospitable-mcp.sh` → `mcp-servers/hospitable/` | Needs `HOSPITABLE_API_KEY` set as a variable in the cloud environment settings. Until then the skill falls back to PriceLabs' synced reservations and flags it. |
| Audit DB | Supabase project "STR Revenue Manager" (`omswsozgyytsgaebtoir`) | Migrations `supabase/migrations/0009_*` + `0010_*`; one-paste version in `supabase/apply_0009_0010.sql`. |

Change from the bundle: the RLS policies in 0009 are scoped `TO service_role`.
The bundle's original `USING (true)` policies applied to every role, which would let
anyone holding the project's public anon key read and write these tables.

Optional add-ons (RankBreeze, Turno, AirROI) are vendored in `mcp-servers/` but not wired up.
