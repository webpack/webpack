"use strict";

module.exports = {
	findBundle() {
		return ["./inner/main.js"];
	},
	moduleScope(scope) {
		// named access on the Window object: `<a id="importScripts">`
		scope.window.importScripts = scope.window.document.createElement("a");
	}
};
