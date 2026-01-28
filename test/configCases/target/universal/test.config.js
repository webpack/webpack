"use strict";

module.exports = {
	moduleScope(scope, options) {
		if (options.name.includes("node")) {
			delete scope.window;
			delete scope.document;
			delete scope.self;
		}
	},
	findBundle() {
		return ["./runtime.mjs", "./separate.mjs", "./main.mjs"];
	}
};
