"use strict";

module.exports = (options) => {
	const opt = Array.isArray(options) ? options[0] : options;
	if (opt && opt.cache && opt.cache.type === "filesystem") {
		return [/Pack got invalid because of write to/];
	}

	return [];
};
