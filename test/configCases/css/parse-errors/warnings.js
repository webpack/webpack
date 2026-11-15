"use strict";

module.exports = [
	{
		moduleName: /recoverable\.css/,
		message: /^CSS parse error: newline-in-string$/,
		loc: /^5:/
	},
	{
		// A lone CR, a form feed and a CRLF each end one line.
		moduleName: /line-terminators\.css/,
		message: /^CSS parse error: newline-in-string$/,
		loc: /^5:15-6:0$/
	}
];
