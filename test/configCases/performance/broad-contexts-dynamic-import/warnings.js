"use strict";

module.exports = [
	[
		/broad contexts: 1 context matches every file under a directory/,
		// A lazy context keeps its matches in blocks, so a count of 22 here is
		// what proves those are read too. The size is platform-dependent.
		/\n {2}\.\/locale\/ lazy [^\n]*\(22 modules, \d+(\.\d+)? \w+\)/
	]
];
