"use strict";

module.exports = {
	get(module) {
		return Promise.resolve(() => `fallback ${module}`);
	}
};
