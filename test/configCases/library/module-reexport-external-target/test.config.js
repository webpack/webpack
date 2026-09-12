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
		"actual-module": { value: 1 },
		"actual-array-module": { arrayValue: 2 },
		"actual-record-module": { recordValue: 3 }
	}
};
