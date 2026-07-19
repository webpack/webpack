"use strict";

module.exports = [
	[
		{
			message: /Deleting the unqualified identifier "foo" is not allowed/,
			moduleName: /mod\.js/
		}
	],
	[{ message: /`with` statements are not allowed/ }],
	[{ message: /Octal literals are not allowed/ }],
	[{ message: /Octal escape sequences are not allowed/ }],
	[{ message: /Octal escape sequences are not allowed/ }],
	[{ message: /Duplicate parameter name "a" is not allowed/ }],
	[{ message: /"eval" is not allowed as a parameter name/ }],
	[{ message: /Assigning to "eval" is not allowed/ }],
	[{ message: /Assigning to "arguments" is not allowed/ }]
];
