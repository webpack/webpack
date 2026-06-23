/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const { SyncBailHook } = require("tapable");
const Compilation = require("../Compilation");
const DefinePlugin = require("../DefinePlugin");
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
const { propertyAccess } = require("../util/property");
const ConstDependency = require("./ConstDependency");
const ModuleInitFragmentDependency = require("./ModuleInitFragmentDependency");

// Loaded at module scope, not inside the parser handler: the async resolver
// cache tail can run that handler after a test tears down the module registry.
const WEBPACK_VERSION = Number.parseInt(
	require("../../package.json").version,
	10
);

/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} Parser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../javascript/JavascriptParser").Members} Members */
/** @typedef {import("../javascript/JavascriptParser").DestructuringAssignmentProperty} DestructuringAssignmentProperty */
/** @typedef {import("./ConstDependency").RawRuntimeRequirements} RawRuntimeRequirements */

const PLUGIN_NAME = "ImportMetaPlugin";

const IMPORT_META = "import.meta";
const IMPORT_META_URL = "import.meta.url";
const IMPORT_META_WEBPACK = "import.meta.webpack";
const IMPORT_META_MAIN = "import.meta.main";
const IMPORT_META_ENV = "import.meta.env";
const IMPORT_META_DIRNAME = "import.meta.dirname";
const IMPORT_META_FILENAME = "import.meta.filename";

// Single source of truth for `import.meta` accesses that only exist in ES modules
// and therefore mark a module as ESM (consumed by HarmonyDetectionParserPlugin).
// `dirname`/`filename` are resolved by NodeStuffPlugin, the rest here. The webpack
// pragmas `import.meta.webpackHot`/`webpackContext` are intentionally excluded:
// they are usable in CommonJS modules and must not force ESM.
const IMPORT_META_NAMES = [
	IMPORT_META,
	IMPORT_META_URL,
	IMPORT_META_WEBPACK,
	IMPORT_META_MAIN,
	IMPORT_META_ENV,
	IMPORT_META_DIRNAME,
	IMPORT_META_FILENAME
];

/** @type {WeakMap<Compilation, { stringify: string, env: Record<string, string> }>} */
const compilationMetaEnvMap = new WeakMap();

/**
 * Collect import.meta.env definitions from DefinePlugin and build JSON string
 * @param {Compilation} compilation the compilation
 * @returns {{ stringify: string, env: Record<string, string> }} env object as JSON string
 */
const collectImportMetaEnvDefinitions = (compilation) => {
	const cached = compilationMetaEnvMap.get(compilation);
	if (cached) {
		return cached;
	}

	const definePluginHooks = DefinePlugin.getCompilationHooks(compilation);
	const definitions = definePluginHooks.definitions.call({});
	/** @type {Record<string, string>} */
	const env = {};
	/** @type {string[]} */
	const pairs = [];
	for (const key of Object.keys(definitions)) {
		if (key.startsWith("import.meta.env.")) {
			const envKey = key.slice("import.meta.env.".length);
			const value = definitions[key];
			pairs.push(`${JSON.stringify(envKey)}:${value}`);
			env[envKey] = /** @type {string} */ (value);
		}
	}
	const result = { stringify: `{${pairs.join(",")}}`, env };
	compilationMetaEnvMap.set(compilation, result);
	return result;
};

/**
 * Defines the import meta plugin hooks type used by this module.
 * @typedef {object} ImportMetaPluginHooks
 * @property {SyncBailHook<[DestructuringAssignmentProperty], string | void>} propertyInDestructuring
 */

/** @type {WeakMap<Compilation, ImportMetaPluginHooks>} */
const compilationHooksMap = new WeakMap();

class ImportMetaPlugin {
	/**
	 * Returns the attached hooks.
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
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const hooks = ImportMetaPlugin.getCompilationHooks(compilation);

				compilation.dependencyTemplates.set(
					ModuleInitFragmentDependency,
					new ModuleInitFragmentDependency.Template()
				);

				/**
				 * Returns file url.
				 * @param {NormalModule} module module
				 * @returns {string} file url
				 */
				const getUrl = (module) => pathToFileURL(module.resource).toString();
				/**
				 * Processes the provided parser.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const parserHandler = (parser, { importMeta }) => {
					if (importMeta === false) {
						const { importMetaName } = compilation.outputOptions;
						if (importMetaName === "import.meta") return;

						parser.hooks.expression
							.for(IMPORT_META)
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
					const importMetaUrl = () =>
						JSON.stringify(getUrl(parser.state.module));
					const importMetaWebpackVersion = () =>
						JSON.stringify(WEBPACK_VERSION);
					/**
					 * Import meta unknown property.
					 * @param {Members} members members
					 * @returns {string} error message
					 */
					const importMetaUnknownProperty = (members) => {
						if (importMeta === "preserve-unknown") {
							return `import.meta${propertyAccess(members, 0)}`;
						}
						return `${Template.toNormalComment(
							`unsupported import.meta.${members.join(".")}`
						)} undefined${propertyAccess(members, 1)}`;
					};

					parser.hooks.typeof
						.for(IMPORT_META)
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
						.for(IMPORT_META)
						.tap(PLUGIN_NAME, (metaProperty) => {
							/** @type {RawRuntimeRequirements} */
							const runtimeRequirements = [];
							const moduleArgument = parser.state.module.moduleArgument;

							const referencedPropertiesInDestructuring =
								parser.destructuringAssignmentPropertiesFor(metaProperty);
							if (!referencedPropertiesInDestructuring) {
								const varName = "__webpack_import_meta__";
								const { stringify: envStringify } =
									collectImportMetaEnvDefinitions(compilation);
								const knownProps =
									`{url: ${importMetaUrl()}, ` +
									`webpack: ${importMetaWebpackVersion()}, ` +
									`main: ${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}] === ${moduleArgument}, ` +
									`env: ${envStringify}}`;
								const initCode =
									importMeta === "preserve-unknown"
										? `var ${varName} = Object.assign(import.meta, ${knownProps});\n`
										: `var ${varName} = ${knownProps};\n`;
								const initDep = new ModuleInitFragmentDependency(
									initCode,
									[
										RuntimeGlobals.moduleCache,
										RuntimeGlobals.entryModuleId,
										RuntimeGlobals.module
									],
									varName
								);
								initDep.loc = /** @type {DependencyLocation} */ (
									metaProperty.loc
								);
								parser.state.module.addPresentationalDependency(initDep);
								const dep = new ConstDependency(
									varName,
									/** @type {Range} */ (metaProperty.range),
									runtimeRequirements
								);
								dep.loc = /** @type {DependencyLocation} */ (metaProperty.loc);
								parser.state.module.addPresentationalDependency(dep);
								return true;
							}

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
										str += `main: ${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}] === ${moduleArgument},`;
										runtimeRequirements.push(
											RuntimeGlobals.moduleCache,
											RuntimeGlobals.entryModuleId,
											RuntimeGlobals.module
										);
										break;
									case "env":
										str += `env: ${
											collectImportMetaEnvDefinitions(compilation).stringify
										},`;
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
						.for(IMPORT_META)
						.tap(PLUGIN_NAME, evaluateToString("object"));
					parser.hooks.evaluateIdentifier.for(IMPORT_META).tap(
						PLUGIN_NAME,
						evaluateToIdentifier(IMPORT_META, IMPORT_META, () => [], true)
					);

					// import.meta.url
					parser.hooks.typeof
						.for(IMPORT_META_URL)
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("string"))
						);
					parser.hooks.expression
						.for(IMPORT_META_URL)
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
						.for(IMPORT_META_URL)
						.tap(PLUGIN_NAME, evaluateToString("string"));
					parser.hooks.evaluateIdentifier
						.for(IMPORT_META_URL)
						.tap(PLUGIN_NAME, (expr) =>
							new BasicEvaluatedExpression()
								.setString(getUrl(parser.state.module))
								.setRange(/** @type {Range} */ (expr.range))
						);

					// import.meta.webpack
					parser.hooks.expression
						.for(IMPORT_META_WEBPACK)
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, importMetaWebpackVersion())
						);
					parser.hooks.typeof
						.for(IMPORT_META_WEBPACK)
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("number"))
						);
					parser.hooks.evaluateTypeof
						.for(IMPORT_META_WEBPACK)
						.tap(PLUGIN_NAME, evaluateToString("number"));
					parser.hooks.evaluateIdentifier
						.for(IMPORT_META_WEBPACK)
						.tap(PLUGIN_NAME, evaluateToNumber(WEBPACK_VERSION));

					parser.hooks.expression
						.for(IMPORT_META_MAIN)
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
						.for(IMPORT_META_MAIN)
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("boolean"))
						);
					parser.hooks.evaluateTypeof
						.for(IMPORT_META_MAIN)
						.tap(PLUGIN_NAME, evaluateToString("boolean"));

					// import.meta.env
					parser.hooks.typeof
						.for(IMPORT_META_ENV)
						.tap(
							PLUGIN_NAME,
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.expressionMemberChain
						.for(IMPORT_META)
						.tap(PLUGIN_NAME, (expr, members) => {
							if (members[0] === "env" && members[1]) {
								const name = members[1];
								const { env } = collectImportMetaEnvDefinitions(compilation);
								if (!Object.prototype.hasOwnProperty.call(env, name)) {
									const dep = new ConstDependency(
										"undefined",
										/** @type {Range} */ (expr.range)
									);
									dep.loc = /** @type {DependencyLocation} */ (expr.loc);
									parser.state.module.addPresentationalDependency(dep);
									return true;
								}
							}
						});
					parser.hooks.expression
						.for(IMPORT_META_ENV)
						.tap(PLUGIN_NAME, (expr) => {
							const { stringify } =
								collectImportMetaEnvDefinitions(compilation);

							const dep = new ConstDependency(
								stringify,
								/** @type {Range} */ (expr.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateTypeof
						.for(IMPORT_META_ENV)
						.tap(PLUGIN_NAME, evaluateToString("object"));
					parser.hooks.evaluateIdentifier
						.for(IMPORT_META_ENV)
						.tap(PLUGIN_NAME, (expr) =>
							new BasicEvaluatedExpression()
								.setTruthy()
								.setSideEffects(false)
								.setRange(/** @type {Range} */ (expr.range))
						);

					// Unknown properties
					parser.hooks.unhandledExpressionMemberChain
						.for(IMPORT_META)
						.tap(PLUGIN_NAME, (expr, members) => {
							// unknown import.meta properties should be determined at runtime
							if (importMeta === "preserve-unknown") {
								return true;
							}

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
								const prop = expr.computed
									? /** @type {import("estree").Literal} */ (expr.property)
											.value
									: /** @type {Identifier} */ (expr.property).name;
								// dirname/filename are resolved by NodeStuffPlugin; main is a runtime value
								if (
									prop === "dirname" ||
									prop === "filename" ||
									prop === "main"
								) {
									return;
								}
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
module.exports.IMPORT_META_DIRNAME = IMPORT_META_DIRNAME;
module.exports.IMPORT_META_FILENAME = IMPORT_META_FILENAME;
module.exports.IMPORT_META_NAMES = IMPORT_META_NAMES;
