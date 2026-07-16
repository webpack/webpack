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
	[
		{
			message:
				/Assigning to the undeclared variable "undeclaredGlobal" is not allowed/
		}
	],
	[
		{
			message:
				/Assigning to the undeclared variable "undeclaredCounter" is not allowed/
		}
	],
	[{ message: /Assigning to the read-only global "undefined" is not allowed/ }]
];
