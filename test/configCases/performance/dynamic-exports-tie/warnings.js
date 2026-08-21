"use strict";

module.exports = [
	[
		/dynamic exports: webpack cannot tell what 2 modules export/,
		// Identical files, so the sizes tie and only the name orders them. The
		// size is platform-dependent, so match it back to alpha's.
		/\n {2}\.\/alpha\.js \((\d+) bytes\)\n {2}\.\/zebra\.js \(\1 bytes\)/
	]
];
