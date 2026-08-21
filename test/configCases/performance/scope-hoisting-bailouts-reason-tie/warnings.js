"use strict";

module.exports = [
	[
		/scope hoisting: 2 modules were not merged into the scope of their importers/,
		// One regex spanning both groups: each carries one module, so the counts
		// tie and only the reason name puts strict mode ahead of eval.
		/\n {2}1 × Module is not in strict mode\n {5}\.\/cjs\.js\n {2}1 × Module uses eval\(\)\n {5}\.\/evaluser\.js/
	]
];
