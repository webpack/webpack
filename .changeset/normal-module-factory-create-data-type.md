---
"webpack": patch
---

Tighten the `CreateData` typedef in `NormalModuleFactory`. `CreateData` now represents the fully-populated value passed to the `createModule`, `module`, and `createModuleClass` hooks (`NormalModuleCreateData & { settings: ModuleSettings }`), while `ResolveData.createData` is typed as `Partial<CreateData>` to reflect the empty initial state. Plugins tapping those hooks no longer need to cast individual fields away from optional.
