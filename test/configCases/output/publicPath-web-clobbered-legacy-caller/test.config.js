"use strict";

module.exports = {
	findBundle() {
		return ["./inner/main.js"];
	},
	moduleScope(scope) {
		// `<embed id="importScripts">` in browsers where embed and object
		// elements are callable, so `typeof` reports "function" like a worker's
		scope.window.importScripts = Object.assign(() => {}, { tagName: "EMBED" });
	}
};
