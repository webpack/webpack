---
"webpack": patch
---

Fix a spurious `TypeError: Cannot mix BigInt and other types, use explicit conversions` (or `Cannot convert a BigInt value to a number`) warning that the parser printed on every build of valid JavaScript that throws at runtime, e.g. `const x = 1n - 1;`
