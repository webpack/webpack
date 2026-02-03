---
"webpack": minor
---

Added the `tsconfig` option for the `resolver` options (replacement for `tsconfig-paths-webpack-plugin`). Can be `false` (disabled), `true` (use the default `tsconfig.json` file to search for it), a string path to `tsconfig.json`, or an object with `configFile` and `references` options.
