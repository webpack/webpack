"use strict";

// TODO Bun's module execution does not throw the expected error for an
// unsupported `this` external in a universal ESM target, so the case differs.
module.exports = () => !process.versions.bun;
