---
"webpack": minor
---

The `generator.exportsConvention` function form for CSS modules now accepts `string[]` in addition to `string`. Returning an array exports the local under every name in the array, matching `css-loader`'s behaviour and letting consumers expose multiple aliases (e.g. `[name, name.toUpperCase()]`) for a single class.
