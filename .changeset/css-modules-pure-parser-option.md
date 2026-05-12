---
"webpack": minor
---

Add a `pure` parser option for `css/module` and `css/auto` types matching `postcss-modules-local-by-default`'s pure mode: every selector must contain at least one local class or id, otherwise webpack emits a build error. Two comments opt out — `/* cssmodules-pure-ignore */` directly before a rule suppresses that rule's check (per-rule, not propagated to children, matching PCSL), and `/* cssmodules-pure-no-check */` placed among the leading comments of the file (before any rule) disables the check for the whole file. Nested rules inside a local-bearing ancestor are treated as pure-compliant; `&` resolves to the parent rule's purity; `@keyframes` and `@counter-style` body contents are exempt; rules whose body contains only nested rules don't trigger the check (the children carry it instead).
