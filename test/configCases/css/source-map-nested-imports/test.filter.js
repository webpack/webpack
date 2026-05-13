"use strict";

// Skip on Node 10/12: this case uses `globalThis` (added in Node 12.0.0)
// and `String.prototype.matchAll` (added in Node 12.0.0). The sibling
// `source-map-export-types` and `nosources-source-map-export-types` cases
// in this directory use the same filter for the same reason.
module.exports = () =>
	!process.version.startsWith("v10.") && !process.version.startsWith("v12.");
