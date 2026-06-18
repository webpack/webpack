"use strict";

const supportsNodePrefix = require("../../../helpers/supportsNodePrefix");

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = () => !process.versions.deno && supportsNodePrefix();
