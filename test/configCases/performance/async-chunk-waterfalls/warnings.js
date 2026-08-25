"use strict";

module.exports = [
	[
		// index → a → b → c → d is four requests in series; only the deepest
		// chain is named, not each of its prefixes.
		/async chunk waterfall: 3 chains load 4 levels deep/,
		// Deepest first, then largest where the depth ties.
		/\n {2}a → b → c → d \(\d+ bytes\)\n {2}a → heavy → heavy-leaf \(\d+ bytes\)\n {2}a → light → light-leaf \(\d+ bytes\)/
	]
];
