"use strict";

module.exports = function filter(config) {
	// usedExports analysis only runs outside development mode.
	return config.mode !== "development";
};
