/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "../errors/WebpackError.js";
import {
	evaluateToString,
	toConstantDependency
} from "../javascript/JavascriptParserHelpers.js";
import makeSerializable from "../util/makeSerializable.js";
import RequireIncludeDependency from "./RequireIncludeDependency.js";
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser.js").default} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */

const PLUGIN_NAME = "RequireIncludeDependencyParserPlugin";

export default class RequireIncludeDependencyParserPlugin {
	/**
	 * Creates an instance of RequireIncludeDependencyParserPlugin.
	 * @param {boolean} warn true: warn about deprecation, false: don't warn
	 */
	constructor(warn) {
		/** @type {boolean} */
		this.warn = warn;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const { warn } = this;
		parser.hooks.call.for("require.include").tap(PLUGIN_NAME, (expr) => {
			if (expr.arguments.length !== 1) return;
			const param = parser.evaluateExpression(expr.arguments[0]);
			if (!param.isString()) return;

			if (warn) {
				parser.state.module.addWarning(
					new RequireIncludeDeprecationWarning(
						/** @type {DependencyLocation} */
						(expr.loc)
					)
				);
			}

			const dep = new RequireIncludeDependency(
				/** @type {string} */ (param.string),
				/** @type {Range} */ (expr.range)
			);
			dep.loc = /** @type {DependencyLocation} */ (expr.loc);
			parser.state.current.addDependency(dep);
			return true;
		});
		parser.hooks.evaluateTypeof
			.for("require.include")
			.tap(PLUGIN_NAME, (expr) => {
				if (warn) {
					parser.state.module.addWarning(
						new RequireIncludeDeprecationWarning(
							/** @type {DependencyLocation} */ (expr.loc)
						)
					);
				}
				return evaluateToString("function")(expr);
			});
		parser.hooks.typeof.for("require.include").tap(PLUGIN_NAME, (expr) => {
			if (warn) {
				parser.state.module.addWarning(
					new RequireIncludeDeprecationWarning(
						/** @type {DependencyLocation} */ (expr.loc)
					)
				);
			}
			return toConstantDependency(parser, JSON.stringify("function"))(expr);
		});
	}
}

class RequireIncludeDeprecationWarning extends WebpackError {
	/**
	 * Creates an instance of RequireIncludeDeprecationWarning.
	 * @param {DependencyLocation} loc location
	 */
	constructor(loc) {
		super("require.include() is deprecated and will be removed soon.");

		/** @type {string} */
		this.name = "RequireIncludeDeprecationWarning";

		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

makeSerializable(
	RequireIncludeDeprecationWarning,
	"webpack/lib/dependencies/RequireIncludeDependencyParserPlugin",
	"RequireIncludeDeprecationWarning"
);

export { RequireIncludeDependencyParserPlugin as "module.exports" };
