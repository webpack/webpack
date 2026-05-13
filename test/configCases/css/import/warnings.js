"use strict";

// Warnings are sorted by (module, location, message) in `Compilation.js`.
// The "Expected URL" warnings on lines 228–231 used to share
// `loc.start.line === 229` because the pre-AST parser, on each invalid
// `@import`, returned past the at-keyword and let the main walker
// re-tokenize the prelude — that walk advanced the shared `LocConverter`'s
// cursor in such a way that the next at-keyword's `_emitWarning` got the
// wrong line back. The AST-based parser consumes the prelude in one pass
// and returns past `;`, so each warning's `loc` is now its true source
// line and the sort puts them in source-line order.

module.exports = [
	/Expected URL in '@import nourl\(test\.css\);'/,
	/Expected URL in '@import ;'/,
	/Expected URL in '@import foo-bar;'/,
	/Expected URL in '@import layer\(super\.foo\) "\.\/style2\.css\?warning=1" supports\(display: flex\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) "\.\/style2\.css\?warning=2" screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) screen and \(min-width: 400px\) "\.\/style2\.css\?warning=3";'/,
	/Expected URL in '@import layer\(super\.foo\) url\("\.\/style2\.css\?warning=4"\) supports\(display: flex\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) url\("\.\/style2\.css\?warning=5"\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(super\.foo\) supports\(display: flex\) screen and \(min-width: 400px\) url\("\.\/style2\.css\?warning=6"\);'/,
	/'@namespace' is not supported in bundled CSS/,
	/Expected URL in '@import supports\(background: url\("\.\/img\.png"\)\);'/,
	/Expected URL in '@import supports\(background: url\("\.\/img\.png"\)\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import layer\(test\) supports\(background: url\("\.\/img\.png"\)\) screen and \(min-width: 400px\);'/,
	/Expected URL in '@import screen and \(min-width: 400px\);'/,
	/'@namespace' is not supported in bundled CSS/
];
