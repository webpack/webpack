"use strict";

module.exports = [
	[
		{
			message: /Accessing "arguments\.callee" is not allowed/,
			moduleName: /mod\.js/
		}
	],
	[{ message: /Accessing "arguments\.caller" is not allowed/ }],
	[{ message: /Accessing "arguments\.callee" is not allowed/ }],
	[{ message: /Accessing "arguments\.callee" is not allowed/ }],
	[{ message: /Accessing "arguments\.callee" is not allowed/ }],
	[
		{
			message: /Assigning to the read-only global "undefined" is not allowed/
		}
	],
	[{ message: /Assigning to the read-only global "NaN" is not allowed/ }],
	[{ message: /Assigning to the read-only global "Infinity" is not allowed/ }],
	[{ message: /Assigning to "eval" is not allowed/ }]
];
