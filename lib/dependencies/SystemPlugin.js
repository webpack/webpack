/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} from "../ModuleTypeConstants.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import WebpackError from "../errors/WebpackError.js";
import {
	evaluateToString,
	expressionIsUnsupported,
	toConstantDependency
} from "../javascript/JavascriptParserHelpers.js";
import makeSerializable from "../util/makeSerializable.js";
import ConstDependency from "./ConstDependency.js";
import SystemRuntimeModule from "./SystemRuntimeModule.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser.js").default} Parser */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */

const PLUGIN_NAME = "SystemPlugin";

class SystemPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.runtimeRequirementInModule
					.for(RuntimeGlobals.system)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.system)
					.tap(PLUGIN_NAME, (chunk, _set) => {
						compilation.addRuntimeModule(chunk, new SystemRuntimeModule());
					});

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (parserOptions.system === undefined || !parserOptions.system) {
						return;
					}

					/**
					 * Sets not supported.
					 * @param {string} name name
					 */
					const setNotSupported = (name) => {
						parser.hooks.evaluateTypeof
							.for(name)
							.tap(PLUGIN_NAME, evaluateToString("undefined"));
						parser.hooks.expression
							.for(name)
							.tap(
								PLUGIN_NAME,
								expressionIsUnsupported(
									parser,
									`${name} is not supported by webpack.`
								)
							);
					};

					parser.hooks.typeof
						.for("System.import")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("System.import")
						.tap(PLUGIN_NAME, evaluateToString("function"));
					parser.hooks.typeof
						.for("System")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.evaluateTypeof
						.for("System")
						.tap(PLUGIN_NAME, evaluateToString("object"));

					setNotSupported("System.set");
					setNotSupported("System.get");
					setNotSupported("System.register");

					parser.hooks.expression.for("System").tap(PLUGIN_NAME, (expr) => {
						const dep = new ConstDependency(
							RuntimeGlobals.system,
							/** @type {Range} */ (expr.range),
							[RuntimeGlobals.system]
						);
						dep.loc = /** @type {DependencyLocation} */ (expr.loc);
						parser.state.module.addPresentationalDependency(dep);
						return true;
					});

					parser.hooks.call.for("System.import").tap(PLUGIN_NAME, (expr) => {
						parser.state.module.addWarning(
							new SystemImportDeprecationWarning(
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);

						return parser.hooks.importCall.call({
							type: "ImportExpression",
							source:
								/** @type {import("estree").Literal} */
								(expr.arguments[0]),
							loc: expr.loc,
							range: expr.range,
							options: null
						});
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

class SystemImportDeprecationWarning extends WebpackError {
	/**
	 * Creates an instance of SystemImportDeprecationWarning.
	 * @param {DependencyLocation} loc location
	 */
	constructor(loc) {
		super(
			"System.import() is deprecated and will be removed soon. Use import() instead.\n" +
				"For more info visit https://webpack.js.org/guides/code-splitting/"
		);

		/** @type {string} */
		this.name = "SystemImportDeprecationWarning";

		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

makeSerializable(
	SystemImportDeprecationWarning,
	"webpack/lib/dependencies/SystemPlugin",
	"SystemImportDeprecationWarning"
);

export default SystemPlugin;
export { SystemImportDeprecationWarning };

// attach named exports as properties to keep the CJS shape
SystemPlugin.SystemImportDeprecationWarning = SystemImportDeprecationWarning;

export { SystemPlugin as "module.exports" };
