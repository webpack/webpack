---
"webpack": minor
---

Skip import specifiers, `require()` and `import()` calls in dead conditional branches gated by inlined imported constants (`isDEV ? A : B`), evaluated via `getCondition`.
