"use strict";

module.exports = [
	[
		/circular dependencies: 1 group of modules imports each other synchronously/,
		/\n {2}2 modules: \.\/a\.js -> \.\/b\.js -> \.\/a\.js/
	]
];
