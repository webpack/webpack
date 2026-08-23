"use strict";

module.exports = [
	[
		// The default and the named export come from different modules of the same
		// entry; the namespace a consumer receives still carries both.
		/mixed exports: 1 entry exports a default beside named exports/,
		/\n {2}main \(default and 1: named\)/
	]
];
