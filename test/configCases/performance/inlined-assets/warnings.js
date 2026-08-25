"use strict";

module.exports = [
	[
		/inlined assets: \d+ bytes of asset data are embedded in the JavaScript/,
		// Largest first, then by name where the size ties.
		/\n {2}\.\/big\.svg \(\d+ bytes\)\n {2}\.\/first\.svg \(\d+ bytes\)\n {2}\.\/second\.svg \(\d+ bytes\)/
	]
];
