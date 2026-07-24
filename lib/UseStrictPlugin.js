/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const ConstDependency = require("./dependencies/ConstDependency");
const { SoaAst } = require("./javascript/syntax");

/** @typedef {import("../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Statement | import("estree").ModuleDeclaration} ProgramStatement */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module").BuildInfo} BuildInfo */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./javascript/JavascriptParser").Range} Range */

const PLUGIN_NAME = "UseStrictPlugin";

const SOA_KEY_STORE = SoaAst.KEY_STORE;
const SOA_KEY_ID = SoaAst.KEY_ID;
const SOA_KEY_MEMO = SoaAst.KEY_MEMO;
const T_EXPRESSION_STATEMENT = SoaAst.TYPE.ExpressionStatement;
const T_LITERAL = SoaAst.TYPE.Literal;

/**
 * Probes the columns of a store-backed Program for a leading directive
 * candidate, materializing at most that one statement instead of the whole
 * `body` list.
 * @param {Program} ast the program
 * @returns {ProgramStatement | undefined} the first statement when it may be a
 * `"use strict"` directive
 */
const firstDirectiveCandidate = (ast) => {
	const store = /** @type {EXPECTED_ANY} */ (ast)[SOA_KEY_STORE];
	if (
		store === undefined ||
		/** @type {EXPECTED_ANY} */ (ast)[SOA_KEY_MEMO] !== undefined
	) {
		return ast.body[0];
	}
	const rootId = /** @type {EXPECTED_ANY} */ (ast)[SOA_KEY_ID];
	if (store.listLens[rootId] === 0) return undefined;
	const first = store.flat[store.listStarts[rootId]];
	if (store.types[first] !== T_EXPRESSION_STATEMENT) return undefined;
	const exprId = store.kid0[first];
	// exprId 0 is a pinned foreign expression — let the object check decide
	if (
		exprId !== 0 &&
		(store.types[exprId] !== T_LITERAL || store.values[exprId] !== "use strict")
	) {
		return undefined;
	}
	return store.nodeAt(first);
};

class UseStrictPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions the javascript parser options
				 */
				const handler = (parser, parserOptions) => {
					parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
						const firstNode = firstDirectiveCandidate(ast);
						if (
							firstNode &&
							firstNode.type === "ExpressionStatement" &&
							firstNode.expression.type === "Literal" &&
							firstNode.expression.value === "use strict"
						) {
							// Remove "use strict" expression. It will be added later by the renderer again.
							// This is necessary in order to not break the strict mode when webpack prepends code.
							// @see https://github.com/webpack/webpack/issues/1970
							const dep = new ConstDependency(
								"",
								/** @type {Range} */ (firstNode.range)
							);
							dep.loc = parser.getLocation(firstNode);
							parser.state.module.addPresentationalDependency(dep);
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).strict = true;
						}
						if (parserOptions.overrideStrict) {
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).strict =
								parserOptions.overrideStrict === "strict";
						}
					});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = UseStrictPlugin;
