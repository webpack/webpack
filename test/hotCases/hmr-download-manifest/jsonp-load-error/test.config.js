"use strict";

module.exports = {
	moduleScope(scope) {
		// A browser rejects fetch with a TypeError when the request fails.
		scope.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
	}
};
