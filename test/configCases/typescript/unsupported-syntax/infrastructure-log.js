"use strict";

// the case's subject is a build error, which is retried every build
module.exports = (options) => {
	if (options.cache && options.cache.type === "filesystem") {
		return [/Pack got invalid because of write to/];
	}

	return [];
};
