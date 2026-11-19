"use strict";

module.exports = {
	/**
	 * @param {{ CLOSE_BACKEND?: () => Promise<void> }} scope test scope
	 * @param {{ plugins: { run?: () => Promise<void> }[] }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.CLOSE_BACKEND = options.plugins[0].run;
	}
};
