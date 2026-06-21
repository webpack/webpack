"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when the worker loads the public-path chunk; the panic aborts the process and
// cannot be caught, so skip the case under Deno.
module.exports = () => !process.versions.deno && supportsWorker();
