"use strict";

module.exports = {
	findBundle() {
		return "./bundle.mjs";
	},
	moduleScope(scope) {
		scope.URL = URL;
	}
};
