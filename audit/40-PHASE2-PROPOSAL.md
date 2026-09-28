# Phase 2 Proposal — Safe Fixes for CRITICAL + HIGH Findings

**Awaiting approval.** Scope = the 4 CRITICAL + 34 HIGH findings only. No drive-by refactors, no dependency upgrades, no schema changes without a migration + rollback note.

## Gates (from the brief, restated)

1. `git status` clean and committed before branching; branch: `hardening/phase-2`.
2. One issue (or tightly-related cluster) per commit; commit message references the finding ID(s).
3. Never change behavior the audit didn't flag.
4. Regression test first where no test exists (or a manual verification script in `app/api/__tests__` or `scripts/`).
5. After each cluster: full test suite + build; **stop and report on any failure**.
6. Running log: finding ID → commit hash → how verified (kept in `audit/FIX-LOG.md` as we go).

## Proposed commit clusters (ordered)

> PAY-3 (webhooks) is HIGH but needs PayPal developer-portal configuration (webhook URL + signature verification setup). Proposed: **code the endpoint + verification in Phase 2, leave activation/config as an explicit ops step** — or defer to Phase 3 with your call. Flagged as the one HIGH item that may not be fully verifiable locally.
>
> DB-2 (float money) is HIGH but **effort L with migration risk** — proposed to defer to Phase 3 (Month-2 roadmap) rather than a quick fix; included here as a decision point.

### Cluster 1 — Response-shape PII leaks (CRITICAL/HIGH, shared fix pattern)
- SOC-1, SOC-2, SOC-3, SOC-4, SOC-5, SOC-6 — explicit public-field `select`s; remove email from search OR; add `isPublic: true` to DJ lookups.
- Test: response-shape regression tests asserting absence of `idDocumentUrl`/`payoutMethod`/`legalName`/`email` in public payloads.
- **Verifiable locally: yes.**

### Cluster 2 — Paid-content exposure (CRITICAL/HIGH)
- UPL-1 (stop returning raw `audioUrl` for gated mixes; gate static `mixes/` or route through authorized streaming), UPL-2 (remove `documents`/`subscription-proofs`/`tickets` from public static mount), UPL-8 (stop returning `directAudioUrl`).
- Note: client (`app/src`) may reference `audioUrl` for playback of free mixes — the fix must preserve free-mix playback (flagged for a careful diff against `MixPlayer` usage; may need a thin `/api/mixes/:id/stream` that enforces gates).
- Test: unauthenticated request for a Pro-gated mix returns no playable URL; subscription-gated folders 404 anonymously.
- **Verifiable locally: yes (behavior); CDN/signed-URL hardening (full M–L fix) may be reduced to "authorized endpoint" scope for Phase 2 — decision point.**

### Cluster 3 — Arbitrary file deletion + SSRF proxy (HIGH)
- UPL-3 (deleteFile containment + avatar URL validation), UPL-4/INFRA-5 (proxy allowlist + private-IP blocking + size cap; move behind rate limiter), UPL-10 (separator-aware containment — cheap, same file).
- Test: traversal attempts (`/uploads/../../.env`) rejected; proxying `http://169.254.169.254/` and `http://127.0.0.1/` rejected; `https://decksalone.com/...` allowed.
- **Verifiable locally: yes.**

### Cluster 4 — Admin/moderator authorization (HIGH)
- ADM-1 (protect SUPER_ADMIN targets), ADM-3 (per-route role map for messages/payments/campaigns), MOD-1 (stop moderator writes to `user.status`), AUTH-7 (role-enum/guard alignment — folds in here as same file/cluster).
- Test: FINANCE_ADMIN forbidden from `/admin/messages`; moderator toggle cannot change `user.status`; ADMIN cannot demote SUPER_ADMIN.
- **Verifiable locally: yes.**

### Cluster 5 — Ticketing leaks (HIGH)
- ETK-1 (strip `onsitePassword` from dashboard/onsite responses), ETK-2 (remove blanket Pro+ guest-list grant).
- Test: dashboard payloads contain no password hash; Pro DJ gets 403 on another event's guest list.
- **Verifiable locally: yes.**

### Cluster 6 — Play-count & ranking integrity (CRITICAL/HIGH)
- RANK-1 (dedup per (userId|ipHash, mixId, 24h) + count only authenticated plays toward ranking; keep interim limiter), RANK-2 (distinct listener counting), RANK-4 (battle mixId ownership), RANK-5 (atomic battle close), RANK-10 + DB-6 (`@@unique([djId, week])` migration + rollback note).
- Note RANK-1's full fix (M) may be split: Phase 2 ships dedup + authenticated-only ranking input; Phase 3 adds the signed playback-token hardening.
- Test: replaying `/play` doesn't double-count within window; anonymous plays don't affect ranking; non-owned mixId rejected; double-close returns 409; weekly job rerun doesn't duplicate history rows.
- **Verifiable locally: yes, except the race behavior (marked static: no — tests assert the atomic guard, real concurrency goes to Phase 3e/3a).**

### Cluster 7 — Money-path correctness (HIGH + selected MEDIUM that are one-liners in the same code)
- PAY-1 (approval idempotency), PAY-4 (single price source via `getSubscriptionConfig()`), PAY-2 (conditional capture update), PAY-10 (revenue status constant — one-line; same file as PAY-2).
- Test: double-approve grants one period; all three flows price identically; 422-after-capture doesn't clobber CAPTURED; revenue aggregate uses a written status.
- **Verifiable locally: yes (races: guard asserted, real concurrency deferred).**

### Cluster 8 — Auth lifecycle (HIGH)
- AUTH-1 (tokenVersion + check in `getActiveUserFromToken`; bump on change/reset-password; migrate-login path too), AUTH-2 (lockout keying fix), AUTH-5 (Turnstile fail-closed in production + test-key removal + rightmost XFF).
- Test: old tokens rejected after password change; lockout requires same-IP (no cross-IP email lockout); missing Turnstile secret fails boot in production mode.
- **Verifiable locally: yes.**

### Cluster 9 — Spam/messaging abuse (HIGH)
- SOC-7 (reports: `.max(2000)` + limiter), SOC-9 (enforce `allowMessages` + sender rate limit), SOC-8 (escape user content in notification emails — never pass as raw `html`), SOC-10 (analytics limiter + path cap), SOC-17 (developer-apply limiter), ETK-8 (CSV formula escape — one-liner, same spam/abuse theme), PAY-8 (proof-upload limiter + pre-upload duplicate check).
- Test: rate limits trip; allowMessages=false blocks with 403; `<img onerror>` in a DM is not delivered as HTML email; CSV cells prefixed.
- **Verifiable locally: yes.**

### Cluster 10 — Infra/deploy (HIGH)
- INFRA-1 (rotate creds — **requires your action on the VPS**; scrub compose file), INFRA-2 (non-root user), INFRA-4 (`exec` entrypoint), INFRA-5 (folds with Cluster 3 code; nginx-level allowlist if desired), INFRA-6 (backup cron script + offsite upload — **requires your storage choice**), INFRA-7 (remove `db push --accept-data-loss` from deploy.sh).
- DB-1 migration + DB-4 purge fix ride along here (migration cluster).
- Test: container runs as non-root; `docker stop` drains gracefully; deploy script uses `migrate deploy`; backup script produces a restorable dump (restore test itself is Phase 3c).
- **Verifiable locally: partially (backup cron + credential rotation need the VPS; code changes verifiable).**

### Cluster 11 — Mobile quick wins (HIGH + cheap MEDIUM)
- MOB-1 (`usesCleartextTraffic="false"`, remove `cleartext: true`), MOB-3 (`allowBackup="false"`), MOB-5 (**secret rotation — your action**; verify `.dockerignore`), MOB-6 (navigation allowlist trim), MOB-7 (strip console logging).
- MOB-2 (secure token storage) and MOB-4 (one-time-code deeplinks) are effort M with UX implications — proposed for Phase 3 unless you want them in Phase 2.
- **Verifiable locally: manifest/config only; real-device verification in Phase 4 human-testing list.**

## Explicitly deferred from Phase 2 (with reason)

| Finding | Reason |
|---|---|
| DB-2 (float money) | Effort L + migration risk; Month-2 roadmap with reconciliation plan |
| PAY-3 (PayPal webhooks) | Needs PayPal portal config; code in Phase 2 optional — your call |
| RANK-3 (inline listener recount) | MEDIUM; cron redesign lands better with Phase 3 scheduler work |
| All MEDIUM/LOW items | Backlog, prioritized in Phase 4 report |

## Decision points for you

1. UPL-1 fix depth: (a) authorized streaming endpoint now, signed URLs/CDN later [recommended], or (b) full signed-URL redesign in Phase 2.
2. PAY-3: include endpoint code in Phase 2 (unactivated) or defer wholly to Phase 3?
3. MOB-2 / MOB-4: include in Phase 2 (bigger diff, UX changes) or Phase 3?
4. INFRA-1/MOB-5: you perform credential rotations on the VPS — confirm you'll do that during Phase 2 (I will prepare the exact rotation checklist).
5. DB-2: confirm deferral to Phase 3.
