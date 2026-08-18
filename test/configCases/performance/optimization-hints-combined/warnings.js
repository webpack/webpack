"use strict";

module.exports = [
	[/scope hoisting: \d+ modules? (was|were) not merged/],
	[/dynamic exports: webpack cannot tell what 1 module exports/],
	// Both unused modules of the package are counted against it.
	[
		/missing sideEffects: 1 package keeps \d+ bytes/,
		/leaky \(\d+ bytes in 2 modules\)/
	]
];
