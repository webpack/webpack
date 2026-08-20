"use strict";

module.exports = [
	[
		/entrypoint overlap: modules shipped by more than one entrypoint/,
		// Concatenation makes this one module per entrypoint, so the chunk graph
		// alone shows no duplication at all.
		/\.\/shared\.js \(in main, other/
	]
];
