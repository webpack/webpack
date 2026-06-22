"use strict";

// The deno target emits ESM that relies on Deno-only behaviour (node.js
// built-ins resolved through the required `node:` specifier). Only run under
// the Deno runtime.
module.exports = () => typeof Deno !== "undefined";
