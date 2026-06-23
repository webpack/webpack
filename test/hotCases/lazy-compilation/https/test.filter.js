"use strict";

// TODO Bun's HTTPS handling for the lazy-compilation backend intermittently
// never delivers the update ("No update available"), so the lazy module is not
// recompiled; skip on Bun until that is fixed.
module.exports = () => !process.versions.bun;
