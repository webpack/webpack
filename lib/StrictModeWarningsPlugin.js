/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} = require("./ModuleTypeConstants");
const WebpackError = require("./WebpackError");

/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./javascript/JavascriptParser").Members} Members */

const PLUGIN_NAME = "StrictModeWarningsPlugin";

/**
 * Reports `arguments.callee` / `arguments.caller` in sloppy modules emitted as
 * strict ES module output — both throw a TypeError at runtime there. Keyed
 * member-chain taps make this free for every other expression; a shadowed
 * `arguments` binding never dispatches the free-variable hook at all.
 */
class StrictModeWarningsPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// child compilations may emit non-module output
				if (!compilation.runtimeTemplate.isModule()) return;
				const isError = compilation.options.experiments.futureDefaults;
				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					/**
					 * @param {string} name accessed property name
					 * @param {MemberExpression | CallExpression} expression reported expression
					 */
					const report = (name, expression) => {
						// already-strict source keeps its behavior in ESM output
						if (parser.scope.isStrict) return;
						const diagnostic = new WebpackError(
							`Accessing "arguments.${name}" is not allowed. The output is an ES module, which runs in strict mode.`
						);
						diagnostic.loc = /** @type {DependencyLocation} */ (expression.loc);
						if (isError) {
							parser.state.module.addError(diagnostic);
						} else {
							parser.state.module.addWarning(diagnostic);
						}
					};
					parser.hooks.expressionMemberChain
						.for("arguments")
						.tap(PLUGIN_NAME, (expression, members) => {
							const name = members[0];
							if (name === "callee" || name === "caller") {
								report(name, expression);
							}
						});
					parser.hooks.callMemberChain
						.for("arguments")
						.tap(PLUGIN_NAME, (expression, members) => {
							const name = members[0];
							// longer chains re-enter the member walk, which reports them
							if (
								members.length === 1 &&
								(name === "callee" || name === "caller")
							) {
								report(name, expression);
							}
						});
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = StrictModeWarningsPlugin;
