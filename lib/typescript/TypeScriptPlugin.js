/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Compiler from "../Compiler" */

// TODO in the next major release: remove; the JavaScript parser's `typescript` option reads TypeScript itself
/**
 * Kept for `webpack.experiments.typescript.TypeScriptPlugin`. It does nothing:
 * with the JavaScript parser's `typescript` option on, which
 * `experiments.typescript` sets, the parser reads a TypeScript module's types
 * and skips them, and its code generation blanks them.
 * @deprecated the JavaScript parser's `typescript` option reads TypeScript itself
 */
class TypeScriptPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {}
}

module.exports = TypeScriptPlugin;
