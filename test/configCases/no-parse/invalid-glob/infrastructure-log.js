"use strict";

module.exports = (options) =>
	options.cache && options.cache.type === "filesystem"
		? [/Pack got invalid because of write to/]
		: [];
