"use strict";

module.exports = [
	[
		/legacy javascript: \d+ bytes of the build emulates syntax the target already has natively/,
		// Largest first, and `regenerator-runtime` counts both of its modules.
		/\n {2}regenerator-runtime \(2 modules, \d+ bytes\)\n {2}@babel\/runtime \(1 module, \d+ bytes\)/
	]
];
