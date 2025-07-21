"use strict";

module.exports = {
	moduleScope(scope, options) {
		if (
			(options.target === "web" || options.target === "webworker") &&
			!scope.process
		) {
			scope.process = process;
		}
	}
};
