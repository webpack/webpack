"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} emitted test bundle
	 */
	findBundle(index) {
		return `main-${index < 2 ? "module" : "modern-module"}-${index}.mjs`;
	}
};
