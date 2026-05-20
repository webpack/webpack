"use strict";

module.exports = {
	env: "jsdom",
	moduleScope(scope) {
		// FakeDocument's `location` global has no `reload` method by
		// default — patch a counter onto it so the test can verify the
		// HMR shim fell back to `window.location.reload()` on head change.
		scope.window.location.reload = () => {
			scope.window.location.__reloadCount__ =
				(scope.window.location.__reloadCount__ || 0) + 1;
		};
	}
};
