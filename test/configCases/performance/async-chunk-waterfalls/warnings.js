"use strict";

module.exports = [
	[
		// index → a → b → c → d is four requests in series; only the deepest
		// chain is named, not each of its prefixes.
		/async chunk waterfall: 1 chain loads 4 levels deep/,
		/\n {2}\d+ → \d+ → \d+ → \d+ \(\d+ bytes\)/
	]
];
