"use strict";

module.exports = [
	[
		{
			moduleName: /^\.\/emit-error-loader\.js!\.\/file\.js$/,
			moduleTrace: /"originName":"\.\/index\.js".*"loc":"19:\d+-\d+"/
		},
		/^Module Warning \(from \.\/emit-error-loader\.js\):\nthis is a warning$/
	],
	[
		/^Module Warning \(from \.\/irregular-error-loader\.js\):\n\(Emitted value instead of an instance of Error\) null$/
	],
	[/^Module Warning \(from \.\/irregular-error-loader\.js\):\nError$/]
];
