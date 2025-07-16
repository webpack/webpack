"use strict";

module.exports = config =>
	!(config.experiments && config.experiments.cacheUnaffected);
