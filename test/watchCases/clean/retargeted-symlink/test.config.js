"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle path
	 */
	findBundle(index) {
		return `./${index === 0 ? "normal" : "dry"}/bundle.js`;
	},
	/**
	 * @param {{ OUTPUT_PATH?: string, DRY_RUN?: boolean }} scope test scope
	 * @param {{ output: { path: string, clean: { dry: boolean } } }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.OUTPUT_PATH = options.output.path;
		scope.DRY_RUN = options.output.clean.dry;
	}
};
