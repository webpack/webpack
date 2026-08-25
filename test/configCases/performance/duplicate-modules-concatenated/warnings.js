"use strict";

module.exports = [
	[
		/duplicate modules: copies of the same module across chunks add/,
		// Concatenation makes this one module per entrypoint, so the chunk graph
		// alone shows no duplication at all.
		/\.\/shared\.js \(in main, other/
	]
];
