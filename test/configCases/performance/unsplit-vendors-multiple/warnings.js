"use strict";

module.exports = [
	[
		/unsplit vendors: initial chunks carry node_modules code/,
		// Equal vendor size, so only the name tie-break orders these. The size
		// itself is platform-dependent, so match it back to alpha's.
		/alpha \(1 modules from node_modules, (\d+) bytes\)\n {2}zebra \(1 modules from node_modules, \1 bytes\)/
	]
];
