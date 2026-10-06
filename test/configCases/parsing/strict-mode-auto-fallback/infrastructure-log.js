"use strict";

module.exports = (options) => {
	if (options.cache && options.cache.type === "filesystem") {
		// Modules with parse errors are rebuilt on each run.
		return [/Pack got invalid because of write to/];
	}

	return [];
};
