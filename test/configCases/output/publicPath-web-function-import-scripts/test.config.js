"use strict";

module.exports = {
	findBundle() {
		return ["./inner/main.js"];
	},
	moduleScope(scope) {
		// a window with an `importScripts` function is still a window
		scope.window.importScripts = Object.assign(() => {}, { tagName: "EMBED" });
	}
};
