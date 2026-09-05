"use strict";

module.exports = {
	// No DOM and no file system: a worker running the universal bundle.
	moduleScope(scope) {
		delete scope.window;
		delete scope.document;
		delete scope.self;
	},
	modules: {
		get fs() {
			throw new Error("Cannot find module 'fs'");
		}
	}
};
