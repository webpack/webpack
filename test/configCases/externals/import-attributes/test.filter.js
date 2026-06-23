"use strict";

// Stable, unflagged `with` import-attributes syntax landed in Node.js v22.
module.exports = () => {
	const [major] = process.versions.node.split(".").map(Number);
	return major >= 22;
};
