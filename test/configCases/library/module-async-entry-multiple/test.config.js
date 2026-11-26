"use strict";

/** @import { Configuration } from "../../../../" */

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @param {Configuration} options compiler options
	 * @returns {string} test bundle
	 */
	findBundle(index, options) {
		return `./${options.name}/main.mjs`;
	}
};
