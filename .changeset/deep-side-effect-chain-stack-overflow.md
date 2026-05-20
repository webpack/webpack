---
"webpack": patch
---

Fix `RangeError: Maximum call stack size exceeded` thrown from `HarmonyImportSideEffectDependency.getModuleEvaluationSideEffectsState` on long linear chains of side-effect-free imports. `NormalModule.getSideEffectsConnectionState` previously descended through `HarmonyImportSideEffectDependency.getModuleEvaluationSideEffectsState` recursively, adding two stack frames per module, which overflowed V8's stack at a few thousand modules deep. The traversal is now iterative.
