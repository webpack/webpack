"use strict";

module.exports = [
	{
		moduleName: /recoverable\.html/,
		message: /^HTML parse error: unexpected-end-tag$/,
		loc: /^2:4-10$/
	},
	{
		// The doctype ends at a lone CR, so the stray end tag sits on line 2.
		moduleName: /line-terminators\.html/,
		message: /^HTML parse error: unexpected-end-tag$/,
		loc: /^2:4-10$/
	}
];
