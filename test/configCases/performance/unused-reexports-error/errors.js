"use strict";

module.exports = [
	[
		// Two, not four: `polyfill` is imported for its side effect on purpose,
		// `one` is re-exported and used, and `empty` exports nothing at all.
		/unused re-exports: 2 modules are bundled although nothing uses what they export, adding 166 bytes:/,
		// Exact sizes, largest first, and they add up to the reported total.
		/\n {2}\.\/three\.js \(85 bytes\)\n {2}\.\/two\.js \(81 bytes\)/
	]
];
