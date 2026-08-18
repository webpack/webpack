---
"webpack": minor
---

Stop doubling a relative `output.publicPath` in the chunks webpack loads through it, bake a wasm url under an origin-rooted one, and drop the asset javascript wrapper under an `eval` devtool.
