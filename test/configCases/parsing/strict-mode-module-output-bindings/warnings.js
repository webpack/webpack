"use strict";

module.exports = [
	[
		{
			message: /"eval" is not allowed as a binding name/,
			moduleName: /mod\.js/
		}
	],
	[{ message: /"static" is a reserved word in strict mode/ }],
	[{ message: /"yield" is a reserved word in strict mode/ }],
	[{ message: /"package" is a reserved word in strict mode/ }],
	[{ message: /"private" is a reserved word in strict mode/ }],
	[{ message: /"interface" is a reserved word in strict mode/ }],
	[{ message: /"protected" is a reserved word in strict mode/ }],
	[{ message: /"public" is a reserved word in strict mode/ }],
	[{ message: /"arguments" is not allowed as a binding name/ }],
	[{ message: /"implements" is a reserved word in strict mode/ }],
	[
		{
			message:
				/"await" is not allowed as a binding name\. The output is an ES module, where "await" is a reserved word\./
		}
	],
	[{ message: /"await" is not allowed as a binding name/ }],
	[
		{
			message:
				/"static" is a reserved word in strict mode and is not allowed as a parameter name/
		}
	],
	[
		{
			message:
				/"package" is a reserved word in strict mode and is not allowed as a parameter name/
		}
	],
	[{ message: /"await" is not allowed as a parameter name/ }],
	[{ message: /"await" is not allowed as a binding name/ }]
];
