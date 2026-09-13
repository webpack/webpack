"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} emitted test bundle
	 */
	findBundle(index) {
		return `main${index}.mjs`;
	}
};
