"use strict";

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string | null} the bundle holding the tests, from `a` only
	 */
	findBundle: (index) => (index === 0 ? "./bundle.js" : null),
	/**
	 * @param {{ EVENTS?: string[] }} scope test scope
	 * @returns {void}
	 */
	moduleScope(scope) {
		scope.EVENTS = require("./webpack.config").events;
	}
};
