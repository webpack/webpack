/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const { SyncBailHook } = require("tapable");
const Compilation = require("../Compilation");
const DefinePlugin = require("../DefinePlugin");
const ModuleDependencyWarning = require("../ModuleDependencyWarning");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const {
	evaluateToIdentifier,
	evaluateToNumber,
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const memoize = require("../util/memoize");
const propertyAccess = require("../util/propertyAccess");
const ConstDependency = require("./ConstDependency");

/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} Parser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../javascript/JavascriptParser").Members} Members */
/** @typedef {import("../javascript/JavascriptParser").DestructuringAssignmentProperty} DestructuringAssignmentProperty */
/** @typedef {import("./ConstDependency").RawRuntimeRequirements} RawRuntimeRequirements */

const getCriticalDependencyWarning = memoize(() =>
	require("./CriticalDependencyWarning")
);

const PLUGIN_NAME = "ImportMetaPlugin";

/**
 * Collect import.meta.env definitions from DefinePlugin and build JSON string
 * @param {Compilation} compilation the compilation
 * @returns {string} env object as JSON string
 */
const collectImportMetaEnvDefinitions = (compilation) => {
	const definePluginHooks = DefinePlugin.getCompilationHooks(compilation);
	const definitions = definePluginHooks.definitions.call({});
	if (!definitions) {
		return "{}";
	}

	/** @type {string[]} */
	const pairs = [];
	for (const key of Object.keys(definitions)) {
		if (key.startsWith("import.meta.env.")) {
			const envKey = key.slice("import.meta.env.".length);
			const value = definitions[key];
			pairs.push(`${JSON.stringify(envKey)}:${value}`);
		}
	}

	return `{${pairs.join(",")}}`;
};

/**
 * @typedef {object} ImportMetaPluginHooks
 * @property {SyncBailHook<[DestructuringAssignmentProperty], string | void>} propertyInDestructuring
 */

/** @type {WeakMap<Compilation, ImportMetaPluginHooks>} */
const compilationHooksMap = new WeakMap();

class ImportMetaPlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {ImportMetaPluginHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				propertyInDestructuring: new SyncBailHook(["property"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const hooks = ImportMetaPlugin.getCompilationHooks(compilation);

				/**
				 * @param {NormalModule} module module
				 * @returns {string} file url
				 */
				const getUrl = (module) => pathToFileURL(module.resource).toString();
				/**
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const parserHandler = (parser, { importMeta }) => {
					if (importMeta === false) {
						const { importMetaName } = compilation.outputOptions;
						if (importMetaName === "import.meta") return;

						parser.hooks.expression
							.for("import.meta")
							.tap(PLUGIN_NAME, (metaProperty) => {
								const dep = new ConstDependency(
									/** @type {string} */ (importMetaName),
									/** @type {Range} */ (metaProperty.range)
								);
								dep.loc = /** @type {DependencyLocation} */ (metaProperty.loc);
								parser.state.module.addPresentationalDependency(dep);
								return true;
							});
						return;
					}

					// import.meta direct
					const webpackVersion = Number.parseInt(
						require("../../package.json").version,
						10
					);
					const importMetaUrl = () =>
						JSON.stringify(getUrl(parser.state.module));
					const importMetaWebpackVersion = () => JSON.stringify(webpackVersion);
					/**
					 * @param {Members} members members
					 * @returns {string} error message
					 */
					const importMetaUnknownProperty = (members) =>
						`${Template.toNormalComment(
							`unsupported import.meta.${members.join(".")}`
						)} undefined${propertyAccess(members, 1)}`;
					parser.hooks.typeof
						.for("import.meta")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.collectDestructuringAssignmentProperties.tap(
						PLUGIN_NAME,
						(expr) => {
							if (expr.type === "MetaProperty") return true;
						}
					);
					parser.hooks.expression
						.for("import.meta")
						.tap(PLUGIN_NAME, (metaProperty) => {
							const referencedPropertiesInDestructuring =
								parser.destructuringAssignmentPropertiesFor(metaProperty);
							if (!referencedPropertiesInDestructuring) {
								const CriticalDependencyWarning =
									getCriticalDependencyWarning();
								parser.state.module.addWarning(
									new ModuleDependencyWarning(
										parser.state.module,
										new CriticalDependencyWarning(
											"'import.meta' cannot be used as a standalone expression. For static analysis, its properties must be accessed directly (e.g., 'import.meta.url') or through destructuring."
										),
										/** @type {DependencyLocation} */ (metaProperty.loc)
									)
								);
								const dep = new ConstDependency(
									`${
										parser.isAsiPosition(
											/** @type {Range} */ (metaProperty.range)[0]
										)
											? ";"
											: ""
									}({})`,
									/** @type {Range} */ (metaProperty.range)
								);
								dep.loc = /** @type {DependencyLocation} */ (metaProperty.loc);
								parser.state.module.addPresentationalDependency(dep);
								return true;
							}

							/** @type {RawRuntimeRequirements} */
							const runtimeRequirements = [];

							let str = "";
							for (const prop of referencedPropertiesInDestructuring) {
								const value = hooks.propertyInDestructuring.call(prop);

								if (value) {
									str += value;
									continue;
								}

								switch (prop.id) {
									case "url":
										str += `url: ${importMetaUrl()},`;
										break;
									case "webpack":
										str += `webpack: ${importMetaWebpackVersion()},`;
										break;
									case "main":
										str += `main: ${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}] === ${RuntimeGlobals.module},`;
										runtimeRequirements.push(
											RuntimeGlobals.moduleCache,
											RuntimeGlobals.entryModuleId,
											RuntimeGlobals.module
										);
										break;
									default:
										str += `[${JSON.stringify(
											prop.id
										)}]: ${importMetaUnknownProperty([prop.id])},`;
										break;
								}
							}
							const dep = new ConstDependency(
								`({${str}})`,
								/** @type {Range} */ (metaProperty.range),
								runtimeRequirements
							);
							dep.loc = /** @type {DependencyLocation} */ (metaProperty.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateTypeof
						.for("import.meta")
						.tap(PLUGIN_NAME, evaluateToString("object"));
					parser.hooks.evaluateIdentifier.for("import.meta").tap(
						PLUGIN_NAME,
						evaluateToIdentifier("import.meta", "import.meta", () => [], true)
					);

					// import.meta.url
					parser.hooks.typeof
						.for("import.meta.url")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("string"))
						);
					parser.hooks.expression
						.for("import.meta.url")
						.tap(PLUGIN_NAME, (expr) => {
							const dep = new ConstDependency(
								importMetaUrl(),
								/** @type {Range} */ (expr.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateTypeof
						.for("import.meta.url")
						.tap(PLUGIN_NAME, evaluateToString("string"));
					parser.hooks.evaluateIdentifier
						.for("import.meta.url")
						.tap(PLUGIN_NAME, (expr) =>
							new BasicEvaluatedExpression()
								.setString(getUrl(parser.state.module))
								.setRange(/** @type {Range} */ (expr.range))
						);

					// import.meta.webpack
					parser.hooks.expression
						.for("import.meta.webpack")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, importMetaWebpackVersion())
						);
					parser.hooks.typeof
						.for("import.meta.webpack")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("number"))
						);
					parser.hooks.evaluateTypeof
						.for("import.meta.webpack")
						.tap(PLUGIN_NAME, evaluateToString("number"));
					parser.hooks.evaluateIdentifier
						.for("import.meta.webpack")
						.tap(PLUGIN_NAME, evaluateToNumber(webpackVersion));

					parser.hooks.expression
						.for("import.meta.main")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(
								parser,
								`${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}] === ${RuntimeGlobals.module}`,
								[
									RuntimeGlobals.moduleCache,
									RuntimeGlobals.entryModuleId,
									RuntimeGlobals.module
								]
							)
						);
					parser.hooks.typeof
						.for("import.meta.main")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("boolean"))
						);
					parser.hooks.evaluateTypeof
						.for("import.meta.main")
						.tap(PLUGIN_NAME, evaluateToString("boolean"));

					// import.meta.env
					parser.hooks.typeof
						.for("import.meta.env")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.expression
						.for("import.meta.env")
						.tap(PLUGIN_NAME, (expr) => {
							const envCode = collectImportMetaEnvDefinitions(compilation);
							const dep = new ConstDependency(
								envCode,
								/** @type {Range} */ (expr.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateTypeof
						.for("import.meta.env")
						.tap(PLUGIN_NAME, evaluateToString("object"));
					parser.hooks.evaluateIdentifier
						.for("import.meta.env")
						.tap(PLUGIN_NAME, (expr) =>
							new BasicEvaluatedExpression()
								.setTruthy()
								.setSideEffects(false)
								.setRange(/** @type {Range} */ (expr.range))
						);

					// Unknown properties
					parser.hooks.unhandledExpressionMemberChain
						.for("import.meta")
						.tap(PLUGIN_NAME, (expr, members) => {
							// keep import.meta.env unknown property
							// don't evaluate import.meta.env.UNKNOWN_PROPERTY -> undefined.UNKNOWN_PROPERTY
							// `dirname` and `filename` logic in NodeStuffPlugin
							if (
								members[0] === "env" ||
								members[0] === "dirname" ||
								members[0] === "filename"
							) {
								return true;
							}
							const dep = new ConstDependency(
								importMetaUnknownProperty(members),
								/** @type {Range} */ (expr.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluate
						.for("MemberExpression")
						.tap(PLUGIN_NAME, (expression) => {
							const expr = /** @type {MemberExpression} */ (expression);
							if (
								expr.object.type === "MetaProperty" &&
								expr.object.meta.name === "import" &&
								expr.object.property.name === "meta" &&
								expr.property.type ===
									(expr.computed ? "Literal" : "Identifier")
							) {
								return new BasicEvaluatedExpression()
									.setUndefined()
									.setRange(/** @type {Range} */ (expr.range));
							}
						});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, parserHandler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, parserHandler);
			}
		);
	}
}

module.exports = ImportMetaPlugin;
