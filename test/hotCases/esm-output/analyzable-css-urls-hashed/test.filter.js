"use strict";

// A node-only build registers its css without a loader, so there is no map to read.
module.exports = (config) =>
	config.target === "web" || Array.isArray(config.target);
