"use strict";

module.exports = {
	env: "jsdom",
	moduleScope(scope) {
		// Reload tracker so the test can assert that body/title-only
		// changes never fall back to `window.location.reload()` — that
		// fallback is reserved for non-title head changes.
		scope.window.location.reload = () => {
			scope.window.location.__reloadCount__ =
				(scope.window.location.__reloadCount__ || 0) + 1;
		};
	}
};
