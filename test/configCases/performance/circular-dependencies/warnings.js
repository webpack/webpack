"use strict";

module.exports = [
	[
		/circular dependencies: 2 groups of modules import each other synchronously, shortest cycle of each shown/,
		// The four-module group is reported first, and its size is not the length
		// of the shortest cycle printed for it.
		/\n {2}4 modules: \.\/[abcd]\.js -> [\s\S]*\n {2}2 modules: \.\/[ef]\.js -> \.\/[ef]\.js -> \.\/[ef]\.js/
	]
];
