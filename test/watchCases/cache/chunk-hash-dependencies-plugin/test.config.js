"use strict";

module.exports = {
	/**
	 * @param {number} index compiler index
	 * @returns {string} bundle containing the assertions
	 */
	findBundle(index) {
		return `./bundle${index}.js`;
	}
};
