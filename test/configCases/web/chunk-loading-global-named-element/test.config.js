"use strict";

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle(i) {
		return i === 0 ? ["main.js"] : ["single-main.js", "single-runtime.js"];
	},
	moduleScope(scope) {
		// Named access on `window`: a `<div id="webpackChunkmy_app">` in the page
		// is found under the chunk loading global's name until a script assigns it.
		if (!("webpackChunkmy_app" in scope.self)) {
			scope.self.webpackChunkmy_app = {
				tagName: "DIV",
				id: "webpackChunkmy_app"
			};
		}
	}
};
