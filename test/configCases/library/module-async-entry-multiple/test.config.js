"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @param {import("../../../../").Configuration} options compiler options
	 * @returns {string} test bundle
	 */
	findBundle(index, options) {
		return `./${options.name}/main.mjs`;
	}
};
