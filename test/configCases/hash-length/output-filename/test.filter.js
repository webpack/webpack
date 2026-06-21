"use strict";

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
// (The order-dependent filename match is fixed in test.config.js.)
module.exports = () => !process.versions.deno;
