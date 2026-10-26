"use strict";

module.exports = [
	// `b.js` fails to build with the validation error, so the cache writes it again
	/^Pack got invalid because of write to: Compilation\/modules.+loaders[/\\]options-check[/\\]b\.js$/
];
