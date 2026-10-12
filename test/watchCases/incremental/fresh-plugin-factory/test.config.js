"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle path
	 */
	findBundle: (index) => `./bundle${index}.js`
};
