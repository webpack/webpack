---
"webpack": minor
---

Accept a check precompiled with `schema-utils precompile` as the second argument of `this.getOptions(schema, check)`, so a loader validates valid options without loading `schema-utils` and compiling its schema.
