"use strict";

module.exports = [
	[
		/circular dependencies: 2 groups of modules import each other synchronously, shortest cycle of each shown/,
		// Exact: a group is reported from its lowest-named module, so neither the
		// order of the two groups nor the rotation of a path depends on traversal.
		// The four-module group's size is not the length of the cycle shown.
		/\n {2}4 modules: \.\/a\.js -> \.\/b\.js -> \.\/a\.js\n {2}2 modules: \.\/e\.js -> \.\/f\.js -> \.\/e\.js\n/
	]
];
