"use strict";

// `with { type: "css" }` (TC39 stage-3 import attributes for CSS modules)
// landed in the default webpack rules and is unflagged in modern Node.js
// only at v22+. Earlier versions either reject the attribute or flag it.
module.exports = () => {
	const [major] = process.versions.node.split(".").map(Number);
	return major >= 22;
};
