"use strict";

module.exports = [
	[
		/pure annotations: 3 '\/\*#__PURE__\*\/' annotations do nothing/,
		// Most first, so the two-annotation module outranks the one-annotation one.
		/\n {2}\.\/index\.js \(2\)\n {2}\.\/second\.js \(1\)/
	]
];
