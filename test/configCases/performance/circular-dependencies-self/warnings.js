"use strict";

module.exports = [
	[
		/circular dependencies: 1 group of modules imports each other synchronously/,
		// Three entries: a module reading its own `module.exports` is not a cycle,
		// so the path must not collapse to `x -> x`.
		/\n {2}2 modules: \.\/(?:self|other)cyc\.js -> \.\/(?:self|other)cyc\.js -> \.\/(?:self|other)cyc\.js/
	]
];
