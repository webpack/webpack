"use strict";

const [major, minor] = process.versions.node.split(".").map(Number);

module.exports = function filter(config) {
	// usedExports analysis only runs outside development mode; the output
	// contains class static blocks, which require Node.js >= 16.11.
	return (
		config.mode !== "development" &&
		(major > 16 || (major === 16 && minor >= 11))
	);
};
