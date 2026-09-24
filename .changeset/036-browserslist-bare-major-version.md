---
"webpack": patch
---

Treat a browserslist target given at a bare major version (e.g. `safari 10`) as `<major>.0` when a feature's first supported version is a `[major, minor]` pair, so it is no longer reported as unsupported.
