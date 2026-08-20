"use strict";

module.exports = [
	[
		/entrypoint overlap: modules shipped by more than one entrypoint/,
		// Equal waste, so only the name tie-break orders these. The size itself is
		// platform-dependent, so match it back to alpha's rather than fixing it.
		/\.\/alpha\.js \(in main, other, (\d+) bytes extra\)\n {2}\.\/zebra\.js \(in main, other, \1 bytes extra\)\n/
	]
];
