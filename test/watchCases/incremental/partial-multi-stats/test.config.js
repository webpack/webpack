"use strict";

const assert = require("assert");

module.exports = {
	findBundle: (index) => `./bundle${index}.js`,
	/**
	 * @param {{ REBUILD?: (callback: (error?: Error | null) => void) => void }} scope test scope
	 * @param {{ plugins: { compiler: import("../../../..").Compiler }[] }} options compiler options
	 * @returns {void}
	 */
	moduleScope(scope, options) {
		scope.REBUILD = (callback) => {
			const watching = options.plugins[0].compiler.watching;
			assert(watching);
			watching.invalidate(callback);
		};
	}
};
