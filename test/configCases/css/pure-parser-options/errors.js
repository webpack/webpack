"use strict";

module.exports = [
	// css/auto with a `.module.css` filename → pure check applies.
	// Its sibling `auto-non-module.css` (no `.module.`) must NOT throw,
	// even though the same rule has `parser: { pure: true }`.
	{
		moduleName: /auto-impure\.module\.css/,
		message: /Selector "body" is not pure/
	},
	// Locks in Copilot review #2: prelude slice for the rule after an
	// at-rule that consumes its own `;` (here `@import`) must NOT include
	// the at-rule text.
	{ message: /^Selector ":global\(\.after-import\)" is not pure/ },
	{ message: /Selector "body" is not pure/ },
	{ message: /Selector "\.ok,\s*section" is not pure/ },
	{ message: /Selector ":global\(\.only-global\)" is not pure/ },
	// Locks in Copilot review #1: nested `span` must NOT inherit purity
	// from the trailing `.mixed-local` segment when the outer rule is
	// impure overall (`:global(.mixed-global)` lacks a local).
	{ message: /^Selector "span" is not pure/ }
];
