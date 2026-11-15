"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle containing the assertions
	 */
	findBundle(index) {
		return `${index}-main.js`;
	}
};
