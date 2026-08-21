"use strict";

module.exports = [
	[
		/unused re-exports: 2 modules are bundled although nothing uses what they export/,
		// The barrel re-exports zebra first and the files are the same length, so
		// the sizes tie and only the name orders them.
		/\n {2}\.\/alpha\.js \((\d+) bytes\)\n {2}\.\/zebra\.js \(\1 bytes\)/
	]
];
