"use strict";

module.exports = {
	env: "jsdom",
	moduleScope(scope) {
		// Reload tracker so the test can assert the body/title-only change
		// DOM-patches in place instead of falling back to a full reload.
		scope.window.location.reload = () => {
			scope.window.location.__reloadCount__ =
				(scope.window.location.__reloadCount__ || 0) + 1;
		};
	}
};
