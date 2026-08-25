"use strict";

module.exports = [
	[
		// Two at the top level of `dep.js` plus one each in the others; the one
		// inside `classic` rebinds and is not counted.
		/top-level this: 4 reads of 'this' at the top level of an ES module/,
		// Most first, then by name where the count ties.
		/\n {2}\.\/dep\.js \(2\)\n {2}\.\/first\.js \(1\)\n {2}\.\/second\.js \(1\)/
	]
];
