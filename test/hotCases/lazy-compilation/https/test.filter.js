"use strict";

// TODO Bun's HTTPS handling for the lazy-compilation backend never delivers the
// update ("No update available") and Deno's HTTPS server errors communicating
// active modules ("connection error"); the activation request is not processed,
// so even retrying can't recover it. Skip on Bun and Deno.
module.exports = () => !process.versions.bun && !process.versions.deno;
