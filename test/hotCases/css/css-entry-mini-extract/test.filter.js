"use strict";

module.exports = (config) => {
	const [major] = process.versions.node.split(".").map(Number);
	// TODO: oom
	return config.target === "web" && major >= 18;
};
