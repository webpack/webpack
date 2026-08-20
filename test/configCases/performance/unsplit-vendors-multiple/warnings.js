"use strict";

module.exports = [
	[
		/unsplit vendors: initial chunks carry node_modules code/,
		// Equal vendor size, so only the name tie-break puts these in a stable order.
		/alpha \(1 modules from node_modules, 27 bytes\)\n {2}zebra \(1 modules/
	]
];
