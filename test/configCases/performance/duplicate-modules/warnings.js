"use strict";

module.exports = [
	[
		/duplicate modules: copies of the same module across chunks/,
		// Equal waste, so only a name tie-break makes the order stable; `zebra`
		// is reached first, which is the order a tie would otherwise keep.
		/\.\/alpha\.js \(in 2 chunks[\s\S]*\.\/zebra\.js \(in 2 chunks/
	]
];
