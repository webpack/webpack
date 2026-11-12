/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const memoize = require("../util/memoize");

const getJavascriptSyntaxParser = memoize(() =>
	require("../javascript/syntax-parser")
);

/**
 * Whether JavaScript parses only as a module, so a browser that skips modules fails on it as a classic script.
 * @param {string} code the script
 * @returns {boolean} true, when it uses `import`, `export`, `import.meta` or top-level `await`
 */
const usesModuleSyntax = (code) => {
	const { parse } = getJavascriptSyntaxParser();
	try {
		parse(code, {
			ecmaVersion: "latest",
			sourceType: "script",
			allowHashBang: true
		});
		return false;
	} catch (_err) {
		// a syntax error of any kind is kept as written, like before
	}
	try {
		parse(code, {
			ecmaVersion: "latest",
			sourceType: "module",
			allowHashBang: true
		});
		return true;
	} catch (_err) {
		return false;
	}
};

const NOMODULE_MODULE_SYNTAX_MESSAGE =
	"A `nomodule` script that uses module syntax ('import', 'export', 'import.meta' or top-level 'await') is removed with `output.module`: the browsers that run `nomodule` scripts cannot parse it.";

module.exports.NOMODULE_MODULE_SYNTAX_MESSAGE = NOMODULE_MODULE_SYNTAX_MESSAGE;
module.exports.usesModuleSyntax = usesModuleSyntax;
