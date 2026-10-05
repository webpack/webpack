---
"webpack": patch
---

Resolve an imported CSS Modules `@value` and then scope it exactly like a local one: an at-rule, `local()` or selector it names is scoped in the importing module and exported under the resolved name (`@value animName: pulseAnim; @keyframes animName {}` exports `pulseAnim`), a value that resolves to a non-name or a property keyword (`1s`, `linear`) is substituted without scoping, and one that is not a single identifier where a name is declared now warns.
