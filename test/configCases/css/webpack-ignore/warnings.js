"use strict";

// Three magic-comment "Compilation error" warnings are expected — one per
// `/***webpackIgnore: true***/` occurrence in `style.css`. The pre-AST
// parser tokenized image-set bodies twice (once via `eatImageSetStrings`,
// once when the main walker resumed past `(`) and emitted the same warning
// twice for the comment inside line 312's image-set; the AST-based parser
// (`parseAFunction`) reads the function in one pass, so the warning is
// emitted once.

module.exports = [
	/Compilation error while processing magic comment\(-s\): \/\*\*\*\*webpackIgnore: false\*\*\*\//,
	/Compilation error while processing magic comment\(-s\): \/\* {3}\* {3}\* {3}\* {3}webpackIgnore: {3}false {3}\* {3}\* {3}\*\//,
	/`webpackIgnore` expected a boolean, but received: 1\./,
	/`webpackIgnore` expected a boolean, but received: 1\./,
	/`webpackIgnore` expected a boolean, but received: 1\./,
	/`webpackIgnore` expected a boolean, but received: 1\./,
	/Compilation error while processing magic comment\(-s\): \/\*\*\*webpackIgnore: {2}true\*\*\*\//,
	/Compilation error while processing magic comment\(-s\): \/\*\*\*webpackIgnore: {2}true\*\*\*\//,
	/Compilation error while processing magic comment\(-s\): \/\*\*\*webpackIgnore: {2}true\*\*\*\//
];
