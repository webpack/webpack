"use strict";

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) executing this
// case's ESM (.mjs) output via node:vm SourceTextModule; the abort cannot be
// caught, so skip the case under Deno.
module.exports = () => !process.versions.deno;
