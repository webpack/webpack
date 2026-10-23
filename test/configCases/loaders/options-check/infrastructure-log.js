"use strict";

module.exports = [
	// `b.js` and `f.js` fail to build with the validation error, so the cache writes again
	/^Pack got invalid because of write to: Compilation\/modules.+loaders[/\\]options-check[/\\][bf]\.js$/
];
