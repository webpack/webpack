"use strict";

module.exports = {
	/**
	 * @returns {string} emitted test bundle
	 */
	findBundle() {
		return "main.mjs";
	},
	modules: {
		"actual-module": { value: 1 },
		"nested-module": { inner: { innerValue: 2 } }
	}
};
