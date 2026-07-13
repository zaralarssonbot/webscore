# M7 — Monitoring, Scheduled Reanalysis & Alerts

**Status:** Specification (blueprint only — not implemented)
**Depends on (frozen):** M0 landing · M1 analysis · M2 reports · M3 AI · M4 PDF · M5 accounts · M6 billing
**Constraint:** M7 is **strictly additive**. No frozen M0–M6 table, column, policy, Edge Function, route, or the analysis/scoring engines may be modified unless fixing a *critical production bug*. M7 builds a queue + workers + diff/alert engines *around* the existing pieces. Where an M5/M6 SQL function must evolve (the due-domains selector), it is done via `create or replace` in a new migration — same discipline as M6 §7.6.

---

## 0. Audit (pre-work)

### 0.1 What exists and is reused

| Capability | Where | M7 use |
| --- | --- | --- |
| Owned domain + monitoring flags | M5 `domains` (`monitoring_enabled`, `verified`, `verified_at`, `last_analyzed_at`, `latest_report_id`, `latest_score`, `user_id`, `normalized_domain`) | Base of a monitored target. Adds pause/frequency/state/SSL columns (§7.6). |
| Immutable report snapshots | M2 `reports` (`report_data`: `auditChecks[]`, `categoryScores`, `pageSpeed`, `pageInfo`, `final_score`, `status`, `measured_at`, versions) | The **diff source**: compare latest vs previous *completed* report. Never mutated. |
| Plan-aware due selector | M5/M6 `domains_due_for_rescan()` (excludes `monitoring='none'`, weekly/daily cadence, service-role only) | Evolved into the M7 scheduler's candidate query (adds paused + already-queued guard). |
| Per-domain rescan runner | M5 `rescan-domain` (refreshes via `analyze-website`, saves owned report, emits `analysis_complete`/`score_changed`) | Logic folded into the M7 worker; `rescan-domain` stays frozen (manual re-run now goes through the queue). |
| Entitlement resolution | M6 `resolveEntitlements` + `plan_entitlements.monitoring` (`none`/`weekly`/`daily`) | Authoritative cadence + gating at enqueue AND worker time. |
| Analysis engine (failure-safe) | M1 `analyze-website` + `decideRefreshAction` (**keeps the previous good measurement when a fresh scan is degraded**) | The key primitive for "no false regression": a degraded scan never overwrites good data. |
| Notifications + enum | M5 `notifications` + `notification_type` | In-app channel; extended with alert types (§7.4). |
| Shared infra | `_shared/{auth (rate limit, cron secret, ip hash, audit), notify, entitlements}`, `bump_rate_limit`, `rate_limits`, `audit_log`, pg_cron + pg_net (guarded) | Reused directly. |

### 0.2 What does NOT exist (build in M7)

- **No live monitoring cron** — nothing is scheduled to run scans; the rescan trigger was left "configure in dashboard".
- **No job queue** — no `monitoring_jobs`, no idempotency window, no retries/backoff, no attempt tracking.
- **No structured diff** — no category/check/PageSpeed/metadata deltas; no diff storage.
- **No alert engine** — only a flat `score_changed`; no severity, thresholds, hysteresis, SSL/robots/canonical rules.
- **No SSL expiry capture** — only a reachability boolean.
- **No email/webhook channels, no observability/metrics.**

### 0.3 Load-bearing decisions forced by the audit

1. **Deterministic first, AI last.** All change detection + severity are pure deterministic functions of two immutable report snapshots. AI only *explains* an already-computed diff; if AI fails, the alert still ships with deterministic text.
2. **Degraded scans never alert or overwrite.** Only a **completed** fresh report becomes the new `latest`; a `partial`/`failed` scan preserves the previous good report and produces no regression diff. This is enforced by both `analyze-website`'s existing preservation and the M7 worker.
3. **Idempotent per (domain, monitoring window).** The schedule bucket (ISO week for weekly, date for daily) is the dedup key; a `unique(domain_id, window_key)` prevents a domain being scanned twice in the same window even if the scheduler double-fires.
4. **Queue over fan-out.** A durable `monitoring_jobs` table with atomic `FOR UPDATE SKIP LOCKED` claiming — survives crashes, supports retries/backoff, and gives observability. The cron only *pokes* thin scheduler/worker functions.
5. **Manual re-run == a queued job.** Manual re-runs enqueue a `trigger_source='manual'` job (rate-limited) processed by the same worker — one code path, no duplication, `rescan-domain` stays frozen.

---

## 1. Vision

Webscore watches every verified, entitled domain continuously — reanalyzing on a plan-based cadence, comparing each new result to the last, detecting *meaningful* change (not Lighthouse noise), and alerting the owner with a clear before→after story and a link to the new report. It works while the customer is logged out; they return to a dashboard that already knows what changed and why.

**Non-goals for M7:** real-time/continuous (sub-daily) monitoring, uptime/ping monitoring, monitoring of unverified or third-party domains, synthetic transaction monitoring, changing the analysis or scoring engines.

## 2. User value

- **Peace of mind:** find regressions (a broken canonical, an expiring cert, a PageSpeed collapse after a deploy) before customers do.
- **Zero effort:** no need to remember to re-run; the report is waiting.
- **Signal, not noise:** thresholds + hysteresis mean alerts are worth reading.
- **Explanation:** each alert says what changed, by how much, and (via AI) why it matters.

## 3. Business value

- **Retention & stickiness:** continuous value between logins is the core reason to keep paying.
- **Upgrade driver:** monitoring cadence (weekly→daily) and alert channels (email→webhook) are concrete Pro/Business/Enterprise differentiators (M6).
- **Cost-bounded:** scans are metered per plan and rate-limited; observability tracks cost per monitored domain.

---

## 4. Monitoring architecture

```
        pg_cron (hourly)                 pg_cron (every ~5 min)
              │ net.http_post (CRON_SECRET)      │ net.http_post (CRON_SECRET)
              ▼                                   ▼
     ┌──────────────────┐              ┌───────────────────────────┐
     │ monitor-schedule │  enqueue     │ monitor-run (worker)      │
     │ (Edge, svc role) │──────────────▶ claim N jobs (SKIP LOCKED)│
     │ due, entitled,   │  monitoring_ │ per job:                  │
     │ verified, !paused│  jobs        │  analyze-website (fresh)  │──▶ analyze-website (frozen)
     │ idempotent window│              │  if COMPLETE:             │
     └──────────────────┘              │   save report (immutable) │──▶ reports (frozen shape)
                                        │   ssl-probe → notAfter    │
                                        │   diff vs prev completed  │──▶ report-diff.ts (pure)
                                        │   alert-rules(diff)       │──▶ alert-rules.ts (pure)
                                        │   create alerts + deliver │──▶ alerts, notifications, email, webhook
                                        │   AI explain (best-effort)│──▶ ai-insight (grounded, optional)
                                        │  else PARTIAL/FAILED:     │
                                        │   preserve prev, backoff  │
                                        │  record metrics           │──▶ monitoring_runs
                                        └───────────────────────────┘
```

- **Source of truth for "what changed":** the two immutable report snapshots. Diffs/alerts are derived and stored, never authoritative over the reports.
- **Everything privileged is service-role.** Users only *read* their own monitoring rows via RLS.

---

## 5. Scheduling model

- **Cadence** comes from M6 entitlements: `free/none` (never), `pro/weekly`, `business/daily`, `enterprise/configurable`. Enterprise cadence is stored per domain in `domains.monitoring_frequency` (`weekly|daily`), defaulting to `daily`, and may be overridden by `entitlement_overrides`.
- **Monitoring window** (dedup bucket) is deterministic:
  - `weekly` → `weekly:<ISO-year>-W<ISO-week>` (e.g. `weekly:2026-W29`)
  - `daily` → `daily:<YYYY-MM-DD>` (UTC)
- **`monitor-schedule`** runs hourly and, for each domain that is `verified` + `monitoring_enabled` + not `paused` + entitled (cadence ≠ none), computes the current window and `insert … on conflict (domain_id, window_key) do nothing` a `queued` job with `scheduled_for = now()`. Idempotent by construction. A per-window spread (hash(domain_id) % 60 minutes) avoids thundering herds.
- **Entitlement re-check at worker time** (defensive, like M6 `rescan-domain`): if the plan lost monitoring between enqueue and run, the job is `canceled` with `last_error='not_in_plan'`.

---

## 6. Queue model

`monitoring_jobs` is a durable queue. **Claiming** is atomic via a SQL function using `FOR UPDATE SKIP LOCKED`, so concurrent workers never double-process.

- **States:** `queued → running → (completed | partial | failed | canceled)`; `failed`/`partial` with attempts left → back to `queued` with a future `scheduled_for` (backoff).
- **Idempotency:** `unique(domain_id, window_key)` — one job per domain per window. A `manual` re-run uses `window_key='manual:<uuid>'` (never dedup-collides) but is rate-limited.
- **Retry:** exponential backoff `delay = base * 2^attempt` (base 5 min, cap 2 h), `MAX_ATTEMPTS = 4`. Backoff/attempts tracked on the row.
- **Fields (exactly as required):** `domain_id, user_id, scheduled_for, started_at, completed_at, status, attempt_count, last_error, trigger_source, analysis_version, scoring_version` (+ `id, window_key, next_attempt_at, report_id, created_at`).

Claim function:
```sql
create or replace function public.claim_monitoring_jobs(p_limit int default 10)
returns setof public.monitoring_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.monitoring_jobs j set status='running', started_at=now(), attempt_count=attempt_count+1
  where j.id in (
    select id from public.monitoring_jobs
    where status='queued' and scheduled_for <= now()
    order by scheduled_for asc
    for update skip locked
    limit greatest(p_limit,1)
  )
  returning j.*;
end $$;
revoke all on function public.claim_monitoring_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_monitoring_jobs(int) to service_role;
```

---

## 7. Database schema

Additive, idempotent migrations `supabase/migrations/20260715*`. RLS: own-read for users, service-role-only writes. Enum additions ship in their own first migration (M6 lesson).

### 7.1 Enums
```sql
-- 20260715010000_m7_enums.sql
do $$ begin create type public.monitor_job_status as enum ('queued','running','completed','partial','failed','canceled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.monitor_state as enum ('disabled','unverified','active','degraded','failing','paused'); exception when duplicate_object then null; end $$;
do $$ begin create type public.alert_severity as enum ('positive','info','warning','critical'); exception when duplicate_object then null; end $$;
-- Additive notification types for alerts (new values only).
alter type public.notification_type add value if not exists 'monitoring_alert';
alter type public.notification_type add value if not exists 'monitoring_positive';
alter type public.notification_type add value if not exists 'monitoring_failed';
alter type public.notification_type add value if not exists 'ssl_expiring';
```

### 7.2 `monitoring_jobs` (queue)
```sql
-- 20260715020000_monitoring_jobs.sql
create table if not exists public.monitoring_jobs (
  id                uuid primary key default gen_random_uuid(),
  domain_id         uuid not null references public.domains(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  window_key        text not null,                         -- 'weekly:2026-W29' | 'daily:...' | 'manual:<uuid>'
  status            public.monitor_job_status not null default 'queued',
  trigger_source    text not null default 'scheduled' check (trigger_source in ('scheduled','manual','retry')),
  scheduled_for     timestamptz not null default now(),
  started_at        timestamptz,
  completed_at      timestamptz,
  attempt_count     integer not null default 0,
  next_attempt_at   timestamptz,
  last_error        text,
  report_id         uuid references public.reports(id) on delete set null,
  analysis_version  text,
  scoring_version   text,
  created_at        timestamptz not null default now(),
  unique (domain_id, window_key)                            -- idempotency
);
create index if not exists monitoring_jobs_claim_idx on public.monitoring_jobs (status, scheduled_for);
create index if not exists monitoring_jobs_domain_idx on public.monitoring_jobs (domain_id, created_at desc);
create index if not exists monitoring_jobs_user_idx on public.monitoring_jobs (user_id, created_at desc);
alter table public.monitoring_jobs enable row level security;
create policy "own jobs read" on public.monitoring_jobs for select to authenticated using (auth.uid() = user_id);
-- writes: service role only.
```

### 7.3 `report_diffs` (structured deterministic diff)
```sql
-- 20260715030000_report_diffs.sql
create table if not exists public.report_diffs (
  id             uuid primary key default gen_random_uuid(),
  domain_id      uuid not null references public.domains(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  report_id      uuid not null references public.reports(id) on delete cascade,   -- the NEW report
  prev_report_id uuid references public.reports(id) on delete set null,           -- the baseline
  overall_delta  integer,
  category_deltas jsonb not null default '{}'::jsonb,   -- {seo:-3, performance:+6, ...}
  checks         jsonb not null default '{}'::jsonb,    -- {new_failed:[...], resolved:[...], changed:[...]}
  pagespeed_deltas jsonb not null default '{}'::jsonb,  -- {score:-12, lcp:+800, cls:+0.05, ...}
  metadata_changes jsonb not null default '{}'::jsonb,  -- {title:{before,after}, canonical:{...}, robots:{...}, h1:{...}}
  content_changes  jsonb not null default '{}'::jsonb,  -- {wordCount:{before,after}, sectionCount:..., imgCount:...}
  ssl            jsonb,                                  -- {expires_at, days_left}
  has_material_change boolean not null default false,    -- passed threshold/hysteresis
  measured_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (report_id)                                     -- one diff per new report
);
create index if not exists report_diffs_domain_idx on public.report_diffs (domain_id, created_at desc);
alter table public.report_diffs enable row level security;
create policy "own diffs read" on public.report_diffs for select to authenticated using (auth.uid() = user_id);
```

### 7.4 `alerts`
```sql
-- 20260715040000_alerts.sql
create table if not exists public.alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  domain_id    uuid not null references public.domains(id) on delete cascade,
  report_id    uuid references public.reports(id) on delete set null,
  diff_id      uuid references public.report_diffs(id) on delete set null,
  rule_key     text not null,                    -- 'overall_drop','category_drop:seo','ssl_expiry:14','check_fail:...'
  severity     public.alert_severity not null,
  title        text not null,                    -- deterministic
  summary      text not null,                    -- deterministic; AI explanation appended separately
  ai_explanation text,                           -- optional, best-effort
  before_value text,
  after_value  text,
  report_url   text,
  measured_at  timestamptz,
  delivered    jsonb not null default '{}'::jsonb,  -- {in_app:true,email:true,webhook:200}
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (report_id, rule_key)                    -- dedup: one alert per rule per report
);
create index if not exists alerts_user_unread_idx on public.alerts (user_id, created_at desc) where read_at is null;
create index if not exists alerts_domain_idx on public.alerts (domain_id, created_at desc);
alter table public.alerts enable row level security;
create policy "own alerts read"   on public.alerts for select to authenticated using (auth.uid() = user_id);
create policy "own alerts update" on public.alerts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id); -- read_at only (guard trigger)
```
A column-guard trigger (M5 pattern) restricts authenticated `alerts` updates to `read_at`.

### 7.5 `monitoring_runs` (observability, append-only)
```sql
-- 20260715050000_monitoring_runs.sql
create table if not exists public.monitoring_runs (
  id            bigint generated always as identity primary key,
  job_id        uuid references public.monitoring_jobs(id) on delete set null,
  domain_id     uuid,
  outcome       text not null,                 -- 'completed','partial','failed'
  duration_ms   integer,
  attempt       integer,
  upstream      jsonb not null default '{}'::jsonb,  -- {crawl:ok, pagespeed:ok, ssl:ok}
  alerts_created integer not null default 0,
  emails_sent   integer not null default 0,
  cost_units    integer not null default 0,    -- estimated (analyze + psi + email)
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists monitoring_runs_created_idx on public.monitoring_runs (created_at desc);
alter table public.monitoring_runs enable row level security;   -- no policies → service role only
```

### 7.6 `domains` additive columns (frozen M5 table, additive)
```sql
-- 20260715060000_domains_monitoring.sql
alter table public.domains add column if not exists monitoring_frequency text
  check (monitoring_frequency in ('weekly','daily'));           -- Enterprise/override; null = plan default
alter table public.domains add column if not exists monitoring_paused boolean not null default false;
alter table public.domains add column if not exists monitoring_state public.monitor_state not null default 'disabled';
alter table public.domains add column if not exists next_scheduled_at timestamptz;
alter table public.domains add column if not exists last_success_at timestamptz;
alter table public.domains add column if not exists last_failure_at timestamptz;
alter table public.domains add column if not exists consecutive_failures integer not null default 0;
alter table public.domains add column if not exists ssl_expires_at timestamptz;
alter table public.domains add column if not exists ssl_last_checked_at timestamptz;
create index if not exists domains_ssl_expiry_idx on public.domains (ssl_expires_at) where ssl_expires_at is not null;
-- These server-owned columns are added to the M5 domains column-guard trigger
-- (guard_domain_server_columns) so clients cannot write them. pause/frequency
-- are user-writable via a dedicated function (§13) that the guard permits.
```
> The M5 guard trigger is extended (via `create or replace`) to also protect `monitoring_state/next_scheduled_at/last_*_at/consecutive_failures/ssl_*`, while allowing owner writes to `monitoring_paused` and `monitoring_frequency` only when the domain is verified + entitled.

### 7.7 `user_settings` additive columns (alert channels)
```sql
-- 20260715070000_alert_channels.sql
alter table public.user_settings add column if not exists notify_monitoring_alerts boolean not null default true;
alter table public.user_settings add column if not exists alert_email_enabled boolean not null default true;
alter table public.user_settings add column if not exists alert_webhook_url text;        -- future-ready
alter table public.user_settings add column if not exists alert_webhook_secret text;      -- HMAC signing (future)
```

### 7.8 Migration order & rollback
Order: enums → monitoring_jobs → report_diffs → alerts → monitoring_runs → domains_monitoring → alert_channels → RLS/guard updates (inline) → scheduler/worker SQL helpers (`claim_monitoring_jobs`, evolved due-selector) → cron scheduling (last). Idempotent. **Rollback** (reverse): restore M5 guard trigger, drop M7 tables/columns/functions/cron jobs; extra enum values remain (harmless). Feature-flag rollback instant (§20).

---

## 8. Monitoring states

`domains.monitoring_state` (derived + stored by the worker/scheduler):

| State | Meaning |
| --- | --- |
| `disabled` | plan cadence = none, or `monitoring_enabled=false` |
| `unverified` | not verified → cannot monitor |
| `active` | verified, enabled, last scan succeeded |
| `degraded` | last completed scan produced a material regression alert |
| `failing` | `consecutive_failures ≥ 2` (dependency failures) |
| `paused` | owner paused monitoring |

Transitions: enable+verify → `active`; regression alert → `degraded` (until a clean scan → `active`); 2+ failures → `failing`; pause → `paused`; downgrade/none → `disabled`.

---

## 9. Change detection

Pure, unit-tested module `_shared/report-diff.ts` — `diffReports(prev, next) → ReportDiff`. Inputs are two immutable report snapshots; output is the structured diff stored in `report_diffs`. **No I/O, no AI.**

Computed:
- `overall_delta = next.final_score − prev.final_score`
- `category_deltas[k] = next.categoryScores[k] − prev.categoryScores[k]` for `performance, seo, conversion, trust, security`
- `checks`: by check `id` → `new_failed` (was pass/absent, now fail), `resolved` (was fail, now pass), `changed` (detail/impact changed); each carries `{id,label,category,impact}`
- `pagespeed_deltas`: `score, lcp, fcp, tbt, cls, speedIndex` deltas (only when both present)
- `metadata_changes`: `title, metaDesc, h1, canonical, robots` before/after (from `pageInfo`/measurement; canonical + robots require capture — see §9.1)
- `content_changes`: `wordCount, sectionCount, imgCount, ctaCount` before/after
- `ssl`: `{expires_at, days_left}` from the SSL probe

**Thresholds + hysteresis (noise suppression):**
- `has_material_change` is true only if any of: `|overall_delta| ≥ 5`; any `|category_delta| ≥ 8`; a **critical** check (impact `high`) flipped pass↔fail; PageSpeed `|score delta| ≥ 10` **or** a Core-Web-Vitals band crossing (LCP 2.5s/4s, CLS 0.1/0.25); SSL `days_left ≤ 30`; robots/canonical/homepage structural change.
- **Hysteresis:** deltas are compared on the two *completed* reports only (never a partial). PageSpeed uses **band crossing OR ≥10-point** change so ±2–3 Lighthouse jitter is ignored; borderline category regressions (8–9) require the regression to persist into the next completed scan before escalating from `info` to `warning` (a `pending` flag on the diff; confirmed next run).
- Metadata/content changes below materiality are recorded in the diff (for history) but do **not** alert.

### 9.1 Robots/canonical/SSL capture (additive, not in frozen analyze-website)
The worker performs two lightweight additive probes *after* the report is saved, storing results in the diff/domain (never modifying `analyze-website`):
- **canonical/robots:** fetch `https://<domain>/robots.txt` and the homepage `<link rel=canonical>` (small HEAD/GET with timeout); compare to the previous run's stored values (kept in `report_data.monitoring` or the prior diff).
- **SSL `notAfter`:** open a TLS connection (`Deno.connectTls`) and read the peer certificate expiry; store `domains.ssl_expires_at` + `ssl_last_checked_at`. (A cert-parse helper via esm.sh is used if Deno's peer-cert API is insufficient.)

---

## 10. Alert rules

Pure module `_shared/alert-rules.ts` — `evaluate(diff, context) → Alert[]`. Deterministic; severity is assigned here, never by AI.

| Rule (`rule_key`) | Condition | Severity |
| --- | --- | --- |
| `overall_drop` | `overall_delta ≤ −5` | warning (≤−10 critical) |
| `overall_gain` | `overall_delta ≥ +5` | positive |
| `category_drop:<k>` | `category_delta ≤ −8` | warning (≤−15 critical) |
| `category_gain:<k>` | `category_delta ≥ +8` | positive |
| `check_fail:<id>` | critical check pass→fail | critical (security/trust) / warning |
| `check_resolved:<id>` | critical check fail→pass | positive |
| `pagespeed_drop` | perf `≤ −10` or CWV band worsened | warning (≥−25 or LCP>4s critical) |
| `pagespeed_gain` | perf `≥ +10` or CWV band improved | positive |
| `ssl_expiry:<30\|14\|7>` | `days_left` crosses 30/14/7 | warning (≤7 critical) |
| `robots_missing` | robots.txt was present, now absent | warning |
| `canonical_missing` | canonical was present, now absent | warning |
| `homepage_unreachable` | previously reachable, fresh crawl fails (and not a transient partial) | critical |
| `security_new` | new failed `security`-category check | critical |

- **Positive alerts** (`overall_gain`, `check_resolved`, `pagespeed_gain`, `category_gain`) use severity `positive`.
- Alerts dedup via `unique(report_id, rule_key)`.
- `homepage_unreachable` fires **only** on a confirmed failed fetch that is *not* a dependency-only partial (avoids false alarms when Firecrawl/PSI hiccups — §16).

---

## 11. Notification channels

Each alert is delivered on the channels the plan + user settings allow. Payload (all channels): `domain, rule/change summary, before_value, after_value, severity, report_url (/analys/:id), measured_at`.

- **In-app** (always): a `notifications` row (type `monitoring_alert`/`monitoring_positive`/`ssl_expiring`) referencing the alert → the M5 `NotificationsBell`. Respects `notify_monitoring_alerts`.
- **Email** (Pro+ and `alert_email_enabled`): new `send-alert-email` Edge Function using the existing email path; batched digest option for multiple alerts in one run. Records `alerts.delivered.email`.
- **Webhook** (future-ready; Business+/Enterprise): if `alert_webhook_url` set, POST a signed JSON payload (HMAC-SHA256 with `alert_webhook_secret`, `X-Webscore-Signature` header) with retry; records `alerts.delivered.webhook`. Shipped behind an entitlement flag; the column + delivery stub exist now, enabled per §14.

---

## 12. Dashboard changes

Additive to the M5 dashboard (gated by accounts; monitoring surfaces gated by entitlement):
- **Monitoring status card:** # domains monitored, health-state breakdown (active/degraded/failing/paused).
- **Next scheduled scan** (min `next_scheduled_at` across domains) and **last successful / last failed scan** timestamps.
- **Recent changes feed:** latest material `report_diffs` across domains (before→after, link to report).
- **Unread alerts** badge/count (from `alerts_user_unread_idx`), integrated with the notifications bell.

## 13. Domain detail changes

Additive tabs/sections on `/app/domains/:id`:
- **Monitoring:** current state, cadence, next/last scan; **Pause/Resume** toggle; **frequency** selector (Enterprise/override); **Manual re-run** button (rate-limited → enqueues a `manual` job).
- **Monitoring timeline:** jobs (scheduled/started/completed/failed) with outcomes.
- **Score trend / category trends:** reuse M5 `TrendCharts`.
- **Change history:** `report_diffs` list (material + minor, filterable).
- **Alert history:** `alerts` list with severity + read state.

Client mutations (pause/resume/frequency) go through a small **`update-monitoring`** Edge Function (auth, verified+entitled check) that writes the guarded columns as service role — clients never write them directly. Manual re-run goes through **`trigger-monitor`** (auth, rate-limited).

---

## 14. Plan entitlements

Reuse M6 `plan_entitlements.monitoring` + add alert-channel entitlements (new columns, additive to `plan_entitlements`, default false where unset):

| Capability | Free | Pro | Business | Enterprise |
| --- | --- | --- | --- | --- |
| `monitoring` (cadence) | none | weekly | daily | daily/configurable |
| `alert_email` | – | ✓ | ✓ | ✓ |
| `alert_webhook` | – | – | ✓ | ✓ |
| `monitoring_frequency` configurable | – | – | – | ✓ |
| manual re-runs / day | (on-demand only) | 6 | 24 | custom |

Enforced by `resolveEntitlements` at enqueue AND worker time. **No monitoring runs without an active entitlement** (cadence ≠ none); a mid-cycle downgrade cancels queued jobs and sets state `disabled`.

---

## 15. Rate limits

- **Cron endpoints** (`monitor-schedule`, `monitor-run`): `CRON_SECRET` header (fail-closed), `--no-verify-jwt`.
- **Manual re-run** (`trigger-monitor`): reuse `rate_limits` action `rescan`, per-plan/day (§14) + a hard per-domain cooldown (e.g. ≥1 job/hour/domain).
- **Worker fan-out:** claim batch size bounded (`p_limit`), global concurrency bounded by cron frequency × batch size; per-run analysis metering counts toward M6 `analyses_month` (monitoring scans consume quota — configurable).
- **Email:** per-user/hour cap; digest batching to avoid floods.

## 16. Failure handling

- **Dependency failure (Firecrawl/PSI/SSL):** `analyze-website` already returns the *previous good* measurement when a fresh scan is degraded (`decideRefreshAction`). The worker treats a non-`complete` result as **`partial`/`failed`**: it does **not** save a regressing report, does **not** diff, does **not** alert regressions, and **preserves** `latest_report_id`/`latest_score`.
- **Retry:** exponential backoff (`base 5m × 2^attempt`, cap 2h, `MAX_ATTEMPTS=4`) via `next_attempt_at`/`scheduled_for`; the scheduler/worker re-queues.
- **Give-up:** after max attempts → job `failed`, `domains.consecutive_failures++`, state → `failing` at ≥2, and a **`monitoring_failed`** notification (an operational notice, *not* a false regression alert).
- **Historical preservation:** reports are immutable; a failed run never mutates or deletes prior reports. `homepage_unreachable` alerts require a *confirmed* content failure (not a dependency-only partial) to avoid false alarms.

## 17. AI

- AI (`ai-insight`, M3 pattern) may add an **`ai_explanation`** to an alert — prose that explains the already-computed deterministic diff (grounded in the diff fields; no page text, no invented numbers).
- AI **never** decides whether a change happened, **never** sets severity, **never** creates alerts. Those are pure functions (§9, §10).
- If AI is slow/unavailable, the alert still ships with its deterministic `title`/`summary`; `ai_explanation` stays null. Same fallback discipline as M3.

## 18. Security

- **Only verified + entitled domains** are ever enqueued or processed (checked at both stages).
- **All queue processing is service-role**; `monitoring_jobs`/`report_diffs`/`alerts`/`monitoring_runs` are own-read for users, service-role-write; `monitoring_runs` has no user policy.
- **No cross-tenant access:** every table scoped by `user_id = auth.uid()`; guard triggers block client writes to server-owned columns and to alert content (only `read_at`).
- **Cron endpoints** protected by `CRON_SECRET` (fail-closed), no JWT.
- **Manual re-runs rate-limited**; **webhook payloads HMAC-signed**.
- Two-user monitoring RLS matrix is a release gate (§19).

## 19. Observability

`monitoring_runs` + aggregate views expose: jobs scheduled/started/completed/failed, average duration, retry count, alerts created, emails sent, estimated cost per monitored domain, and upstream error rates (from `upstream` jsonb). A service-role **`monitoring-metrics`** function (or SQL views) returns rollups for an internal ops dashboard. Structured `console` logs on every worker step feed Supabase function logs. Alerting-on-the-alerting: if failure rate over a window exceeds a threshold, emit an internal ops notice.

## 20. Deployment

Order (ships dark): migrations (§7.8) → deploy Edge Functions (`monitor-schedule`, `monitor-run`, `trigger-monitor`, `update-monitoring`, `send-alert-email`, `monitoring-metrics`) + `_shared/{report-diff,alert-rules,ssl-probe}.ts` → set secrets (reuse `CRON_SECRET`; add email provider key) → **verify** with a manual enqueue on a verified test domain (test-mode) → schedule pg_cron jobs (`monitor-schedule` hourly, `monitor-run` ~5-min) **last** → frontend to Cloudflare behind `VITE_MONITORING_ENABLED` (dark) → flip after DoD. **Rollback:** unschedule cron (instant stop), flag off, revert functions, reverse migrations.

## 21. Definition of Done

M7 is complete only when production supports:
1. A **verified Pro** domain receives an **automatic weekly** scan; a **verified Business** domain an **automatic daily** scan — both via the queue (idempotent per window).
2. Each scheduled scan **saves a new immutable report**; the **previous report is unchanged**; a **deterministic `report_diffs` row** is stored.
3. A **meaningful regression** (e.g. overall −5, category −8, critical check pass→fail, SSL ≤30d, robots/canonical missing, homepage unreachable) **creates an alert** with before/after/severity/report URL, delivered in-app (+ email for Pro+); a **meaningless fluctuation** (±2–3 Lighthouse) creates **no alert**.
4. **Positive alerts** fire on real improvements.
5. The **dashboard shows monitoring status** (next/last scan, health, recent changes, unread alerts); the user can **pause and resume** monitoring and trigger a **rate-limited manual re-run**.
6. A **failed scan retries with backoff** and, on give-up, marks the domain `failing` with an operational notice — **never** a false regression, **never** overwriting good history.
7. **AI explanations** are best-effort; alerts ship deterministically without AI.
8. **No cross-tenant access** (two-user RLS matrix passes); cron secret-protected; manual re-runs rate-limited.
9. **Observability** rollups populate (`monitoring_runs`).
10. `tsc`, `eslint(src)`, `vitest`, and `build+prerender` all pass; the monitoring feature flag fully hides M7 when off; anonymous + M1–M6 flows unchanged.

---

## Appendix A — New files (implementation map)
```
Migrations  supabase/migrations/20260715{01..08}0000_*.sql  (enums, monitoring_jobs, report_diffs,
                                                             alerts, monitoring_runs, domains_monitoring,
                                                             alert_channels, cron/claim helpers)
Functions   supabase/functions/monitor-schedule/index.ts     (cron: enqueue due jobs)
            supabase/functions/monitor-run/index.ts          (cron: claim + process + diff + alert)
            supabase/functions/trigger-monitor/index.ts      (auth: manual re-run, rate-limited)
            supabase/functions/update-monitoring/index.ts    (auth: pause/resume/frequency)
            supabase/functions/send-alert-email/index.ts     (service: email channel)
            supabase/functions/monitoring-metrics/index.ts   (service: observability rollups)
            supabase/functions/_shared/report-diff.ts        (pure, unit-tested)
            supabase/functions/_shared/alert-rules.ts        (pure, unit-tested)
            supabase/functions/_shared/ssl-probe.ts          (cert notAfter)
Frontend    src/lib/monitoring/{monitoring-service,alerts-service}.ts
            src/hooks/useMonitoring.ts
            src/components/app/{MonitoringStatus,ChangeFeed,AlertList,MonitoringTimeline,MonitoringControls}.tsx
            src/pages/app/DashboardPage.tsx / DomainDetailPage.tsx  (additive sections)
            src/lib/account/limits.ts  (monitoringEnabled() flag)
Config      .env  (VITE_MONITORING_ENABLED, ALERT_EMAIL_PROVIDER_KEY server-side)
```

## Appendix B — Explicit non-changes (frozen)
Analysis/scoring/AI/PDF engines; `analyze-website` (called, never modified — SSL/robots/canonical capture is additive in the worker); M2 reports shape + public-read policy; M5 accounts schema; M6 billing/entitlements schema (only additive columns on `plan_entitlements`/`user_settings`); the agency `/pricing`; the anonymous public flow. The pure diff/alert engines make deterministic decisions; AI only explains them.
```
