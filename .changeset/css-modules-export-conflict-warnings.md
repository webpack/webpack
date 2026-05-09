---
"webpack": minor
---

Emit a warning when a CSS module declares the same export name across different declaration kinds (e.g. a class `.foo` and a custom property `--foo`, or a class and a `@keyframes`/`@counter-style`/`@container`/`@value`/`:export` with the same name). The conflicting declaration is silently dropped or overrides the previous one, which is usually a mistake; the warning points at the location of the redeclaration and the original declaration so the conflict can be resolved.
