"use strict";

module.exports = {
	env: "jsdom",
	moduleScope(scope) {
		scope.window.location.reload = () => {
			scope.window.location.__reloadCount__ =
				(scope.window.location.__reloadCount__ || 0) + 1;
		};
	}
};
