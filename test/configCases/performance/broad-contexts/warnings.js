"use strict";

module.exports = [
	[
		/broad contexts: 1 context matches every file under a directory/,
		// The size is platform-dependent, so only the module count is pinned.
		/\n {2}\.\/locale\/ sync \^\\\.\\\/\.\*\$ \(20 modules, \d+(\.\d+)? \w+\)/
	]
];
