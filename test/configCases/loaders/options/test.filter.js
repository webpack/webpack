"use strict";

// TODO Bun (JSC) stringifies schema-utils ValidationError with a stack trace
// instead of the clean message V8 produces, so the errors snapshot differs.
module.exports = () => !process.versions.bun;
