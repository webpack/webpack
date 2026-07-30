"use strict";

module.exports = [
	// the nested error keeps its stack, so its frames become the details, which
	// the plugin then overrides
	[
		/Critical dependency: the request of a dependency is an expression/,
		// JSC omits the `Class.` prefix V8 puts in front of a method frame
		{ details: /^overridden at (?:\S+\.)?getWarnings \(/ }
	],
	// a `hideStack` nested error has no details; its frames lead the own stack,
	// which the plugin then overrides
	[
		/export '(?:missing|missingToo)' \(imported as '(?:missing|missingToo)'\) was not found/,
		{ stack: /^overridden ModuleDependencyWarning: export '/ }
	],
	// the same, but assigned before anything read the derived stack
	[
		/export '(?:missing|missingToo)' \(imported as '(?:missing|missingToo)'\) was not found/,
		{ stack: /^overridden unread stack$/ }
	]
];
