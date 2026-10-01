"use strict";

// a named `define` registers a local module, which `require` reads without
// resolving a request, so the binding must not become a re-export
define("matrix-local", [], () => ({ local: "amd" }));
const local = require("matrix-local");
exports.local = local;
exports.localMember = local.local;
