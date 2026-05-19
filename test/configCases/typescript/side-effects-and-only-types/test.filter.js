"use strict";

// Node.js's `module.stripTypeScriptTypes` was added in v22.6 (strip-only) and
// gained `mode: "transform"` (needed for enums/namespaces) in v22.7. Guard
// against versions that lack the API entirely.

module.exports = () => "stripTypeScriptTypes" in require("module");
