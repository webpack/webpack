"use strict";

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
module.exports = () => !process.versions.deno;
