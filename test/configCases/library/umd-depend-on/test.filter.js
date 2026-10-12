"use strict";

// Skip on Node 10: this case sets `output.globalObject` to `globalThis`
// (added in Node 12.0.0).
module.exports = () => !process.version.startsWith("v10.");
