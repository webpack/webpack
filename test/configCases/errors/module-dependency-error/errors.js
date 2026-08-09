"use strict";

module.exports = [
	[
		{
			message:
				/^export 'notHere' \(imported as 'notHere'\) was not found in '\.\/stub' \(possible exports: here\)$/,
			moduleName: /^\.\/index\.js$/,
			loc: /^\d+:\d+-\d+$/
		}
	]
];
