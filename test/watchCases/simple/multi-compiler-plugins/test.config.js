"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string | null} the bundle holding the tests, from `a` only
	 */
	findBundle: (index) => (index === 0 ? "./bundle.js" : null),
	/**
	 * @param {{ EVENTS?: string[], STATE?: { applied: number, thisIsCompiler: boolean, optionsPlugins: boolean } }} scope test scope
	 * @returns {void}
	 */
	moduleScope(scope) {
		const config = require("./webpack.config");

		scope.EVENTS = config.events;
		scope.STATE = config.state;
	}
};
