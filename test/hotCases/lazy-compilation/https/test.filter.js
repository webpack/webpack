"use strict";

// TODO Bun's HTTPS handling for the lazy-compilation backend never delivers the
// update ("No update available"), so the lazy module is never recompiled.
module.exports = () => !process.versions.bun;
