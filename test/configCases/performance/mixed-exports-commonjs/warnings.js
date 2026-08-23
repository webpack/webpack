"use strict";

module.exports = [
	[
		// The exports analysis resolves these to a list, so the entry is readable
		// even though nothing in it is an ESM export.
		/mixed exports: 1 entry exports a default beside named exports for the 'commonjs2' library/,
		/\n {2}main \(default and 1: value\)/
	]
];
