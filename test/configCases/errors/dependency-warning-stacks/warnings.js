"use strict";

module.exports = [
	// the nested error keeps its stack, so its frames become the details
	[
		/Critical dependency: the request of a dependency is an expression/,
		{ details: /^ {4}at \S+\.getWarnings \(/ }
	],
	// a `hideStack` nested error has no details; its frames lead the own stack
	[
		/export 'missing' \(imported as 'missing'\) was not found/,
		{
			stack:
				/^ {4}at \S+\.getLinkingErrors \([\s\S]*\n\nModuleDependencyWarning: export 'missing'/
		}
	]
];
