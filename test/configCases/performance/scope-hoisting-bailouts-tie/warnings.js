"use strict";

module.exports = [
	[
		/scope hoisting: 2 modules were not merged into the scope of their importers/,
		// Identical files sharing one reason, so the sizes tie and only the name
		// orders them within the group.
		/\n {2}2 × Module is not in strict mode\n {5}\.\/alpha\.js, \.\/zebra\.js/
	]
];
