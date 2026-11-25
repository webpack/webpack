"use strict";

module.exports = (options) =>
	!(options.cache && options.cache.type === "filesystem");
