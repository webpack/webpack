"use strict";

module.exports = [
	[
		/legacy javascript: \d+ bytes of the build emulates features the target already has natively/,
		// Both named, so dropping either from the list webpack looks for fails here.
		/\n {2}core-js \(1 module, \d+ bytes\)/,
		/\n {2}regenerator-runtime \(1 module, \d+ bytes\)/,
		/'output\.environment' says this target supports arrowFunction, asyncFunction/
	]
];
