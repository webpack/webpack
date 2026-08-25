"use strict";

module.exports = [
	[
		/duplicate modules: copies of the same module across chunks add/,
		// Equal waste, so only the name tie-break orders these. The size itself is
		// platform-dependent, so match it back to alpha's rather than fixing it.
		/\.\/alpha\.js \(in main, other, 2 chunks, (\d+) bytes extra\)\n {2}\.\/zebra\.js \(in main, other, 2 chunks, \1 bytes extra\)\n/
	]
];
