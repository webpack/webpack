"use strict";

let globalContext;

module.exports = {
	moduleScope(scope) {
		globalContext = scope.window;
	},
	// the runtime reads the sloppy-mode `this`, which is the global object
	nonEsmThis: () => globalContext,
	findBundle: () => ["./runtime.js", "./main.js"]
};
