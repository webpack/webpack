---
"webpack": patch
---

Export a CSS Modules `@keyframes`, `@counter-style` or `@container` named by a local `@value` under the ident it resolves to (`@value animName: pulseAnim; @keyframes animName {}` exports `pulseAnim`), and leave one named by an imported `@value` to the defining module instead of reporting a conflicting export.
