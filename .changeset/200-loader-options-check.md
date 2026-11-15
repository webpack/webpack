---
"webpack": minor
---

Accept a function returning the schema, the name and data path of the errors and a check precompiled with `schema-utils precompile` in `this.getOptions(schema, configuration, check)`, as `compiler.validate` does, and let both take the check in the configuration's place.
