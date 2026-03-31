"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	moduleScope(scope) {
		// Provide a fake App2 remote container in the global scope.
		// The container must have get() and init() methods per the
		// Module Federation container contract.
		scope.App2 = {
			init() {},
			get(module) {
				// Return a factory that produces the module's exports
				return Promise.resolve(() => ({
					__esModule: true,
					default: `app2 ${module}`
				}));
			}
		};
	}
};
