---
"webpack": patch
---

Only mark asset modules as side-effect-free when `experimental.futureDefaults` is set to true, so asset-copying use cases (e.g. `import "./x.png"`) won’t break unless the option is enabled.
