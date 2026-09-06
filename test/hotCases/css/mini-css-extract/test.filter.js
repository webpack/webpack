"use strict";

module.exports = (config) => {
	const [major] = process.versions.node.split(".").map(Number);
	// The case pins target "web" itself, so every other runner would build and
	// run the same bundle again.
	return config.target === "web" && major >= 18;
};
