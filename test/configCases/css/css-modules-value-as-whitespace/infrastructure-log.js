"use strict";

module.exports = (options) => {
	if (options.cache && options.cache.type === "filesystem") {
		return [/Serializing big strings/];
	}

	return [];
};
