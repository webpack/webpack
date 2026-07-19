"use strict";

module.exports = [
	[{ message: /Unknown value for property "regExp", expected type RegExp/ }],
	[{ message: /Unknown value for property "include", expected type RegExp/ }],
	[{ message: /Unknown value for property "exclude", expected type RegExp/ }],
	[{ message: /Unknown value for property "mode", expected type string/ }],
	[{ message: /Unknown value for property "chunkName", expected type string/ }],
	[
		{
			message:
				/Unknown value for property "exports", expected type string\|string\[\]\[\]/
		}
	],
	[
		{
			message:
				/Unknown value for property "prefetch", expected type boolean\|number/
		}
	],
	[
		{
			message:
				/Unknown value for property "preload", expected type boolean\|number/
		}
	],
	[
		{
			message:
				/Unknown value for property "fetchPriority", expected type "high"\|"low"\|"auto"/
		}
	],
	[
		{
			message: /Unknown value for property "recursive", expected type boolean/
		}
	],
	[{ message: /Unknown property "unknownOption"/ }],
	[{ message: /Parsing import\.meta\.webpackContext options failed\./ }],
	[
		{
			message:
				/Unknown value for property "exports", expected type string\|string\[\]\[\]/
		}
	]
];
