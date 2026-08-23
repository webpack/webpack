"use strict";

module.exports = [
	[
		/legacy javascript: \d+ bytes of the build emulates syntax the target already has natively/,
		/\n {2}regenerator-runtime \(1 module, \d+ bytes\)/,
		/'output\.environment' says this target supports arrowFunction, asyncFunction/
	]
];
