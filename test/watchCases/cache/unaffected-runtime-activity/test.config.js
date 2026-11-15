"use strict";

module.exports = {
	/**
	 * @param {number} index compiler index
	 * @returns {string[]} bundles containing the runtime assertions
	 */
	findBundle(index) {
		return [`${index}-a.js`, `${index}-b.js`];
	}
};
