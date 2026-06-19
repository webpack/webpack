"use strict";

// Deno resolves the AMD library's default export to undefined (AMD runtime
// interop differs), so these variants fail; skip the case under Deno.
module.exports = () => !process.versions.deno;
