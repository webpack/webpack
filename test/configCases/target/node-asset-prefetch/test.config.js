"use strict";

module.exports = {
	// A worker has no document; the harness gives every web-like run a fake one.
	moduleScope(scope, options, target) {
		if (target === "webworker") scope.document = undefined;
	}
};
