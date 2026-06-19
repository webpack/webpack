"use strict";

// Deno 2.8.3 produces different runtime/output behavior for this css case
// (undefined CSS export / non-deterministic emitted-file order), so skip it.
module.exports = () => !process.versions.deno;
