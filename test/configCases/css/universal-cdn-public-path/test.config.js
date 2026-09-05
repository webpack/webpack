"use strict";

const path = require("path");

const CDN = "https://cdn.example/assets/";

module.exports = {
	// No DOM: the server side of the universal bundle.
	moduleScope(scope) {
		delete scope.window;
		delete scope.document;
		delete scope.self;
	},
	// The chunk's script is read from disk in its place; its stylesheet url is not.
	resolveModule(module) {
		return module.startsWith(CDN) ? `./${path.basename(module)}` : module;
	}
};
