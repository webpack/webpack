"use strict";

module.exports = [
	[
		// Grouped by reason, most modules first.
		/scope hoisting: 2 modules were not merged into the scope of their importers/,
		/\n {2}1 × Module is not in strict mode\n {5}\.\/cjs\.js/,
		/\n {2}1 × Module uses eval\(\)\n {5}\.\/evaluser\.js/
	]
];
