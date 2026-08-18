"use strict";

module.exports = [
	[
		// Two, not four: `polyfill` is imported for its side effect on purpose,
		// `one` is re-exported and used, and `empty` exports nothing at all.
		/unused re-exports: 2 modules are bundled although nothing uses what they export/,
		// Largest first.
		/\n {2}\.\/three\.js \(\d+ bytes\)\n {2}\.\/two\.js \(\d+ bytes\)/
	]
];
