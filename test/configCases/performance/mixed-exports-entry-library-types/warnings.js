"use strict";

module.exports = [
	[
		/mixed exports: 1 entry exports a default beside named exports for the 'commonjs' library/,
		/\n {2}other \(default and 1: two\)/
	],
	[
		/mixed exports: 1 entry exports a default beside named exports for the 'commonjs2' library/,
		/\n {2}main \(default and 1: one\)/
	]
];
