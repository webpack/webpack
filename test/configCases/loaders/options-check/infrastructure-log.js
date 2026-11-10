"use strict";

module.exports = [
	// `b.js`, `f.js` and `g.js` fail to build with the validation error and `d.js`
	// is not cacheable, so the cache writes again. It logs only the first write,
	// and the build order decides which one that is.
	/^Pack got invalid because of write to: Compilation\/modules.+loaders[/\\]options-check[/\\][bdfg]\.js$/
];
