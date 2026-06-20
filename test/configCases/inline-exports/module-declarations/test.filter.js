"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// Deno evaluates the inlined-const modules differently, so the recorded
// side-effect count doesn't match; skip the case under Deno.
module.exports = () => !process.versions.deno && supportsGlobalThis();
