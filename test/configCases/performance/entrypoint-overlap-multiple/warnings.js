"use strict";

module.exports = [
	[
		/entrypoint overlap: modules shipped by more than one entrypoint/,
		// Equal waste, so only the name tie-break puts these in a stable order.
		/\.\/alpha\.js \(in main, other, 37 bytes extra\)\n {2}\.\/zebra\.js /
	]
];
