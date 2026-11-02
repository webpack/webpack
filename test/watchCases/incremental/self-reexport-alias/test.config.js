"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle to execute
	 */
	findBundle: (index) => `./bundle${index}.js`
};
