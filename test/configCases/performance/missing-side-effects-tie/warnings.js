"use strict";

module.exports = [
	[
		/missing sideEffects:/,
		// Identical packages, so the sizes tie and only the name orders them. The
		// size is platform-dependent, so match it back to alpha's.
		/alpha \((\d+) bytes in 1 module\)\n {2}zebra \(\1 bytes in 1 module\)/
	]
];
