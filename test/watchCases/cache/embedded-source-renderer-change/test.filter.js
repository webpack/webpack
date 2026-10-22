"use strict";

// The renderer changes between steps, which cacheUnaffected assumes never
// happens within one watch session (as in add-defines).
module.exports = (config) =>
	!(config.experiments && config.experiments.cacheUnaffected);
