"use strict";

// TODO Deno 2.8.3 returns an undefined CSS export for this case, so skip it.
// (The non-deterministic emitted-file order is fixed in test.config.js.)
module.exports = () => !process.versions.deno;
