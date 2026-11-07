"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} entry bundle
	 */
	findBundle: (index) => `./main${index}.js`
};
