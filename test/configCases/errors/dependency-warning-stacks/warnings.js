"use strict";

module.exports = [
	// the nested error keeps its stack, so its frames become the details, which
	// the plugin then overrides
	[
		/Critical dependency: the request of a dependency is an expression/,
		{ details: /^overridden at \S+\.getWarnings \(/ }
	],
	// a `hideStack` nested error has no details; its frames lead the own stack,
	// which the plugin then overrides
	[
		/export 'missing' \(imported as 'missing'\) was not found/,
		{ stack: /^overridden ModuleDependencyWarning: export 'missing'/ }
	]
];
