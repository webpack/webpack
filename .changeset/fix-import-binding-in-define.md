---
"webpack": patch
---

Link import bindings used inside `define(...)` callbacks in ES modules. Previously, `HarmonyDetectionParserPlugin` skipped walking the arguments of `define` calls in harmony modules, so references to imported bindings inside an inline AMD `define` factory (e.g. `define(function () { console.log(foo); })`) were not rewritten to their imported references and could cause `ReferenceError` at runtime. Inner graph usage analysis is also fixed for the related pattern `const fn = function () { foo; }; define(fn);`.
