"use strict";

module.exports = {
	moduleScope(scope, options) {
		if (options.name.includes("node")) {
			delete scope.Worker;
		}
	},
	findBundle() {
		return ["web-main.mjs"];
	}
};
