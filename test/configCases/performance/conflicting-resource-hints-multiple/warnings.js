"use strict";

module.exports = [
	[
		/conflicting resource hints/,
		// Declared zebra first, so this order is the sort talking. `unnamed_js` is
		// the fallback for a chunk group no `webpackChunkName` named, and
		// `only-prefetch` is absent because one directive alone is no conflict.
		/main -> alpha\n {2}main -> unnamed_js\n {2}main -> zebra\n/
	]
];
