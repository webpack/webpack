"use strict";

module.exports = [
	[
		// The one inside the method body rebinds and is not counted.
		/top-level this: 2 reads of 'this' at the top level of an ES module/,
		/\n {2}\.\/dep\.js \(2\)/
	]
];
