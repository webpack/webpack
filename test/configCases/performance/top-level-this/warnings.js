"use strict";

module.exports = [
	[
		// The two at the top level; the one inside `classic` rebinds and is not
		// counted.
		/top-level this: 2 reads of 'this' at the top level of an ES module/,
		/\n {2}\.\/dep\.js \(2\)/
	]
];
