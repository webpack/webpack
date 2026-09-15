"use strict";

module.exports = [
	[
		{ moduleName: /index\.js$/ },
		/^Module not found: NonErrorEmittedError: \(Emitted value instead of an instance of Error\) the tap gave up$/
	]
];
