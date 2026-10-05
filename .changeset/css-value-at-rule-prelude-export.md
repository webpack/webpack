---
"webpack": patch
---

Export a CSS Modules `@keyframes`, `@counter-style` or `@container` named by a local `@value` under the name the value resolves to, so `@value animName: pulseAnim; @keyframes animName {}` exports `pulseAnim`.
