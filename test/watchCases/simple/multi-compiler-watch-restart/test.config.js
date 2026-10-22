"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string | null} the bundle holding the tests
	 */
	findBundle: (index) => (index === 0 ? "./bundle-a.js" : null)
};
