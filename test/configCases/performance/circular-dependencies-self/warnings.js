"use strict";

module.exports = [
	[
		/circular dependencies: 1 group of modules imports each other synchronously/,
		// Both modules must appear: a module reading its own `module.exports` is
		// not a cycle, so the path must not collapse to one repeated name.
		/\n {2}2 modules: \.\/othercyc\.js -> \.\/selfcyc\.js -> \.\/othercyc\.js/
	]
];
