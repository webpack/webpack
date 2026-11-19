/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const memoize = require("../util/memoize");

const getJavascriptSyntaxParser = memoize(
	() => require("../javascript/syntax").parser
);

/**
 * Whether JavaScript parses only as a module, so a browser that skips modules fails on it as a classic script.
 * @param {string} code the script
 * @returns {boolean} true, when it uses `import`, `export`, `import.meta` or top-level `await`
 */
const usesModuleSyntax = (code) => {
	const { parseProgram, takeParsedTree } = getJavascriptSyntaxParser();
	/**
	 * @param {"script" | "module"} sourceType what to read the code as
	 * @returns {boolean} whether it parses as that, the tree let go once read
	 */
	const parsesAs = (sourceType) => {
		try {
			parseProgram(code, 0, { sourceType, allowHashBang: true });
		} catch (_err) {
			// a syntax error of any kind is kept as written, like before
			return false;
		}
		/** @type {import("../javascript/syntax-parser").SyntaxTree} */ (
			takeParsedTree()
		).release();
		return true;
	};
	return !parsesAs("script") && parsesAs("module");
};

const NOMODULE_MODULE_SYNTAX_MESSAGE =
	"A `nomodule` script that uses module syntax ('import', 'export', 'import.meta' or top-level 'await') is removed with `output.module`: the browsers that run `nomodule` scripts cannot parse it.";

module.exports.NOMODULE_MODULE_SYNTAX_MESSAGE = NOMODULE_MODULE_SYNTAX_MESSAGE;
module.exports.usesModuleSyntax = usesModuleSyntax;
