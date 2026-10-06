"use strict";

// The case needs optimization.usedExports, which cacheUnaffected refuses.
module.exports = (config) =>
	!(config.experiments && config.experiments.cacheUnaffected);
