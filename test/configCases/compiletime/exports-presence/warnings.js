"use strict";

module.exports = [
	{
		moduleName: /bbb/,
		message: /NotHere.+not found/
	},
	{
		moduleName: /bbb/,
		message: /NoNo.+not found/
	},
	{
		moduleName: /ddd/,
		message: /NoNo.+not found/
	},
	{
		moduleName: /module/,
		message: /a.+not found/,
		loc: /31:6-10/
	},
	{
		moduleName: /module/,
		message: /a.+not found/,
		loc: /58:6-10/
	},
	{
		moduleName: /module/,
		message: /a.+not found/,
		loc: /61:15-19/
	},
	{
		moduleName: /module/,
		message: /a.+not found/,
		loc: /64:6-10/
	},
	{
		moduleName: /module/,
		message: /a.+not found/,
		loc: /67:15-19/
	}
];
