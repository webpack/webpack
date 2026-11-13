"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle containing the assertions
	 */
	findBundle(index) {
		return `${index === 0 ? "memory" : "filesystem"}-main.js`;
	}
};
