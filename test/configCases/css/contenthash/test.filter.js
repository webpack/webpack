"use strict";

// Deno 2.8.3 produces different runtime/output behavior for this css case
// (undefined CSS export / non-deterministic emitted-file order), so skip it.
// TODO Bun flakily fails executing this css case (empty error from the lazy
// test env), so skip it there too.
module.exports = () => !process.versions.deno && !process.versions.bun;
