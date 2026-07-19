"use strict";

// each import statement is processed for the side-effect dependency and the
// specifier, so every comment warning is reported twice
module.exports = [
	[{ message: /webpackDefer magic comment expected a boolean value/ }],
	[{ message: /webpackDefer magic comment expected a boolean value/ }],
	[{ message: /webpackSource magic comment expected a boolean value/ }],
	[{ message: /webpackSource magic comment expected a boolean value/ }],
	[{ message: /Compilation error while processing magic comment/ }],
	[{ message: /Compilation error while processing magic comment/ }]
];
