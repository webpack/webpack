"use strict";

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
// TODO Bun produces a different output filename length here too, so the
// verifyFilenameLength assertion in test.config.js fails.
module.exports = () => !process.versions.deno && !process.versions.bun;
