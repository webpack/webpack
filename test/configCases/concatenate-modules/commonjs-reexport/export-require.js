"use strict";

(global.__ran || (global.__ran = [])).push("export-require");

// CommonJsExportRequireDependency: advertises `inner` as a static alias of
// ./target's exports, so ./target is pulled into the concatenation too and the
// alias resolves to its wrapped exports
exports.inner = require("./target");
exports.tag = "export-require";
