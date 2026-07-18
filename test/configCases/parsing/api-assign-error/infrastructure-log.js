"use strict";

module.exports = (options) => {
	if (options.cache && options.cache.type === "filesystem") {
		// modules with errors are not cacheable
		return [/Pack got invalid because of write to/];
	}

	return [];
};
