"use strict";

module.exports = {
	/**
	 * @param {{ FILE_CHANGE_REPORTED?: boolean }} scope test scope
	 * @param {{ plugins: { reported: boolean }[] }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.FILE_CHANGE_REPORTED = options.plugins[0].reported;
	}
};
