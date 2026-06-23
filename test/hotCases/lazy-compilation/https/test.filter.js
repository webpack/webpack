"use strict";

// TODO Bun's HTTPS handling for the lazy-compilation backend never delivers the
// update ("No update available") — the activation request is not processed, so
// even retrying the recompile can't recover it; skip on Bun only.
module.exports = () => !process.versions.bun;
