---
"webpack": minor
---

Add a `pure` parser option for `css/module` and `css/auto` types matching `postcss-modules-local-by-default`'s pure mode: every selector must contain at least one local class or id, otherwise webpack emits a build error.
