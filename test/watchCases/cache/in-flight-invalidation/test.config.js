"use strict";

/** @typedef {import("./webpack.config").Events} Events */

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} bundle to execute
	 */
	findBundle: (index) => `./bundle${index}.js`,
	/**
	 * @param {{ WATCH_EVENTS?: Events }} scope test scope
	 * @param {{ plugins: { events: Events }[] }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.WATCH_EVENTS = options.plugins[0].events;
	}
};
