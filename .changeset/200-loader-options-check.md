---
"webpack": minor
---

Accept a check precompiled with `schema-utils precompile` and a function returning the schema in `this.getOptions(schema, check)`, as `compiler.validate` does, and let `compiler.validate` read the name and data path of its errors from a schema titled `"<name> <baseDataPath>"`, as `getOptions` does.
