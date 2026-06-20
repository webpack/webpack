"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// Deno's `import defer` evaluation timing differs (the module evaluates eagerly
// here), so the side-effect counts don't match; skip the case under Deno.
module.exports = () => !process.versions.deno && supportsGlobalThis();
