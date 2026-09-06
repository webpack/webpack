"use strict";

module.exports = (config) => {
	const [major] = process.versions.node.split(".").map(Number);
	// The case pins target "web" itself, and the other runners export no tests
	// from the bundle it builds.
	return config.target === "web" && major >= 18;
};
