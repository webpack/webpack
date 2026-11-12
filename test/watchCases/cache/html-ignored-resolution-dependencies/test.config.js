"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle to execute
	 */
	findBundle: (index) => `./app${index}.js`
};
