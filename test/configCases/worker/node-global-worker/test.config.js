"use strict";

module.exports = {
	findBundle() {
		return "./bundle0.mjs";
	},
	moduleScope(scope) {
		scope.URL = URL;
	}
};
