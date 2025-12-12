---
"webpack": patch
---

fix(security): re-validate HttpUriPlugin redirects against allowedUris; restrict to http(s) and add a conservative redirect limit to prevent SSRF and untrusted content inclusion. Redirects failing policy are rejected before caching/lockfile writes.\*\*\*
