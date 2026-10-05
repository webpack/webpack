"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle to execute
	 */
	findBundle: (index) => `./bundle${index}.js`,
	/**
	 * @param {{ CLOSE_PENDING?: () => Promise<void> }} scope test scope
	 * @param {{ plugins: { run?: () => Promise<void> }[] }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.CLOSE_PENDING = options.plugins[0].run;
	}
};
