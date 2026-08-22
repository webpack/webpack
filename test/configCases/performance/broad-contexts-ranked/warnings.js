"use strict";

module.exports = [
	[
		/broad contexts: 2 contexts match every file under a directory/,
		// Both hold the same bytes, so the order is the name tie-break alone.
		/\n {2}\.\/icons\/ sync \^\\\.\\\/\.\*\$ \(20 modules, [^)]+\)\n {2}\.\/locale\/ sync \^\\\.\\\/\.\*\$ \(20 modules, [^)]+\)/
	]
];
