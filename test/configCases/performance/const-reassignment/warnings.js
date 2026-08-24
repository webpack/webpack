"use strict";

module.exports = [
	[
		// `movable` is a let and is not reported.
		/const reassignment: 1 binding is declared 'const' and written to/,
		/\n {2}\.\/dep\.js \(frozen\)/
	]
];
