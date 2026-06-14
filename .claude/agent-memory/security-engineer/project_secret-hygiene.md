---
name: project-secret-hygiene
description: GDG Quantum repo is PUBLIC; .env.example leaked real live secrets once (Phase 8) — treat secret hygiene as high-risk here
metadata:
  type: project
---

The GDG Quantum repo is PUBLIC (https://github.com/GDGuzman11/GDGQuantumWeb). On 2026-06-14 (Phase 8 audit) `.env.example` was found git-tracked with REAL live secrets (RESEND_API_KEY, TURNSTILE_SECRET_KEY, UPSTASH_REDIS_REST_URL+TOKEN, IP_HASH_SALT), committed in `2b78e6a` and already on origin/main. Replaced with placeholders; Gabe given mandatory rotation steps.

**Why:** A public repo means any committed secret is immediately exposed and lives in git history forever — file edits don't undo it; only rotation does.

**How to apply:** Whenever touching `.env.example`, README, or any committed file, verify NO real secret values land in tracked files (only placeholders). When secrets are exposed, always pair the file fix with a rotation instruction — never imply the file edit alone closes the exposure. `.env` itself is correctly gitignored. Also note next@14.2.35 carries GHSA-ffhc-5mcf-pf4q (CSP-nonce XSS) — relevant because this app uses a per-request nonce CSP; flagged for an upgrade decision.
