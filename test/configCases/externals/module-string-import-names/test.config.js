"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} emitted test bundle
	 */
	findBundle(index) {
		return `main${index}.mjs`;
	},
	modules: {
		"ext-module": { "a-b": 1, "c d": 2, a_b: 3, plain: 4, "caf\u00E9": 5 }
	}
};
