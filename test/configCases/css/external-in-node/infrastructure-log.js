"use strict";

module.exports = (options) => {
	if (options[0].cache && options[0].cache.type === "filesystem") {
		return [
			/Pack got invalid because of write to/,
			/Pack got invalid because of write to/
		];
	}

	return [];
};
