"use strict";

module.exports = {
	moduleScope(scope, options) {
		if (options.name.includes("node")) {
			// empty
		} else {
			delete scope.Buffer;
			scope.window = {
				document: {}
			};
		}
	},
	findBundle() {
		return ["main.mjs"];
	}
};
