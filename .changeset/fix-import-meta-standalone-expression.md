---
"webpack": patch
---

fix: `import.meta` as standalone expression now returns a complete object with known properties (`url`, `webpack`, `main`, `env`) instead of an empty object `({})`, and hoists it as a module-level variable to ensure `import.meta === import.meta` identity. In `preserve-unknown` mode (ESM output), the hoisted object merges runtime `import.meta` properties via `Object.assign`.
