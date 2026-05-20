---
"webpack": patch
---

Fix `[fullhash:N]` and `[hash:N]` (with length suffix) in `output.publicPath` not being interpolated at runtime. The detection regex in `RuntimePlugin` only matched `[fullhash]` / `[hash]` without a length suffix, so the `PublicPathRuntimeModule` was not flagged as a full-hash module and `__webpack_require__.p` was emitted with the placeholder `XXXX` left in place (e.g. `out/XXXX/`) instead of the real hash truncated to the requested length.
