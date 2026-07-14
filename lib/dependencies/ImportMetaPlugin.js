/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const { SyncBailHook } = require("tapable");
/** @typedef {import("../Compilation")} Compilation */
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
const createHooksRegistry = require("../util/createHooksRegistry");
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
/** @typedef {import("../DefinePlugin").CodeValue} CodeValue */
/** @typedef {import("../DefinePlugin").MergedDefinitionNode} MergedDefinitionNode */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module").ValueCacheVersion} ValueCacheVersion */
/** @typedef {import("../NormalModule").NormalModuleBuildInfo} NormalModuleBuildInfo */
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

const IMPORT_META_FIELDS = new Set([
	"url",
	"webpack",
	"main",
	"env",
	"dirname",
	"filename",
	"webpackContext",
	"webpackHot"
]);

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

const IMPORT_META_ENV_PREFIX = "import.meta.env.";

// mirrors DefinePlugin's runtime requirement detection for definition code
const WEBPACK_REQUIRE_FUNCTION_REGEXP = new RegExp(
	`${RuntimeGlobals.require}\\s*(!?\\.)`
);
const WEBPACK_REQUIRE_IDENTIFIER_REGEXP = new RegExp(RuntimeGlobals.require);

/**
 * Collected `import.meta.env` definitions from every DefinePlugin instance.
 * @typedef {object} ImportMetaEnvDefinitions
 * @property {Map<string, string>} env env entry code by env key
 * @property {string} stringify env object as code
 * @property {boolean} hasCustomDefinition `import.meta.env` was defined with a non-object value
 */

/** @type {WeakMap<Compilation, ImportMetaEnvDefinitions>} */
const compilationMetaEnvMap = new WeakMap();

/** @type {WeakMap<Compilation, Map<string, string>>} */
const compilationMetaCustomPropsMap = new WeakMap();

/**
 * Whether a definition value is a plain object to flatten into env entries.
 * @param {CodeValue} value definition value
 * @returns {value is Record<string, CodeValue>} true for a plain object
 */
const isPlainObjectDefinition = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

/**
 * Object literal key; `__proto__` must be computed to stay an own property.
 * @param {string} key env key
 * @returns {string} property key code
 */
const toPropertyKey = (key) =>
	key === "__proto__" ? '["__proto__"]' : JSON.stringify(key);

/**
 * Converts a merged definition node to code; leaf values are already code.
 * @param {MergedDefinitionNode} value merged definition node
 * @returns {string} code
 */
const definitionToCode = (value) => {
	if (value instanceof Map) {
		return `{${[...value]
			.map(([key, v]) => `${toPropertyKey(key)}:${definitionToCode(v)}`)
			.join(",")}}`;
	}
	if (Array.isArray(value)) {
		return `[${value.map(definitionToCode).join(",")}]`;
	}
	if (isPlainObjectDefinition(value)) {
		return `{${Object.keys(value)
			.map((key) => `${toPropertyKey(key)}:${definitionToCode(value[key])}`)
			.join(",")}}`;
	}
	return `${value}`;
};

/**
 * Returns true if unknown import.meta properties should be preserved.
 * @param {JavascriptParserOptions["importMeta"]} importMeta parser option
 * @returns {boolean} true when unknown properties should be preserved
 */
const preserveUnknown = (importMeta) =>
	importMeta === "preserve-unknown" ||
	(Boolean(importMeta) && typeof importMeta === "object");

/**
 * Checks whether webpack should handle an import.meta field.
 * @param {JavascriptParserOptions["importMeta"]} importMeta parser option
 * @param {string} field field name
 * @returns {boolean} true when the field should be handled
 */
const isImportMetaFieldEnabled = (importMeta, field) => {
	if (importMeta === false) {
		return false;
	}
	return !(
		Boolean(importMeta) &&
		typeof importMeta === "object" &&
		/** @type {Record<string, boolean | undefined>} */ (importMeta)[field] ===
			false
	);
};

/**
 * Collect import.meta.env definitions from DefinePlugin (object form and
 * dotted keys of every instance, in definition order) and build the env code.
 * @param {Compilation} compilation the compilation
 * @returns {ImportMetaEnvDefinitions} collected definitions
 */
const collectImportMetaEnvDefinitions = (compilation) => {
	const cached = compilationMetaEnvMap.get(compilation);
	if (cached) {
		return cached;
	}

	const node = DefinePlugin.getMergedDefinitionNode(
		compilation,
		IMPORT_META_ENV
	);
	/** @type {Map<string, string>} */
	const env = new Map();
	/** @type {string | undefined} */
	let customCode;
	if (node instanceof Map) {
		for (const [envKey, value] of node) {
			env.set(envKey, definitionToCode(value));
		}
	} else if (node !== undefined) {
		// e.g. `"import.meta.env": "someGlobal"` replaces the whole object
		customCode = definitionToCode(node);
	}
	const result = {
		env,
		stringify:
			customCode === undefined
				? definitionToCode(node instanceof Map ? node : new Map())
				: customCode,
		hasCustomDefinition: customCode !== undefined
	};
	compilationMetaEnvMap.set(compilation, result);
	return result;
};

/**
 * Collect custom (non-field) import.meta property definitions from
 * DefinePlugin, e.g. `"import.meta.custom": "..."`.
 * @param {Compilation} compilation the compilation
 * @returns {Map<string, string>} property code by property name
 */
const collectImportMetaCustomDefinitions = (compilation) => {
	const cached = compilationMetaCustomPropsMap.get(compilation);
	if (cached) {
		return cached;
	}

	const node = DefinePlugin.getMergedDefinitionNode(compilation, IMPORT_META);
	/** @type {Map<string, string>} */
	const props = new Map();
	if (node instanceof Map) {
		for (const [prop, value] of node) {
			// fields (url, env, …) are handled by their own logic
			if (IMPORT_META_FIELDS.has(prop)) continue;
			props.set(prop, definitionToCode(value));
		}
	}
	compilationMetaCustomPropsMap.set(compilation, props);
	return props;
};

/**
 * Defines the import meta plugin hooks type used by this module.
 * @typedef {object} ImportMetaPluginHooks
 * @property {SyncBailHook<[DestructuringAssignmentProperty], string | void>} propertyInDestructuring
 */

class ImportMetaPlugin {
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

					/**
					 * Records value dependencies for every inlined env definition so
					 * cached modules rebuild when a definition value changes.
					 * @returns {void}
					 */
					const addEnvValueDependencies = () => {
						const buildInfo = /** @type {NormalModuleBuildInfo} */ (
							parser.state.module.buildInfo
						);
						const valueDependencies =
							buildInfo.valueDependencies ||
							(buildInfo.valueDependencies = new Map());
						/**
						 * @param {string} key value cache key
						 */
						const addDep = (key) => {
							const version = compilation.valueCacheVersions.get(key);
							// an undefined version would force a rebuild on every build
							if (version === undefined) return;
							valueDependencies.set(key, version);
						};
						addDep(DefinePlugin.VALUE_DEP_MAIN);
						addDep(DefinePlugin.VALUE_DEP_PREFIX + IMPORT_META_ENV);
						const { env } = collectImportMetaEnvDefinitions(compilation);
						for (const envKey of env.keys()) {
							addDep(
								DefinePlugin.VALUE_DEP_PREFIX + IMPORT_META_ENV_PREFIX + envKey
							);
						}
						for (const prop of collectImportMetaCustomDefinitions(
							compilation
						).keys()) {
							addDep(`${DefinePlugin.VALUE_DEP_PREFIX + IMPORT_META}.${prop}`);
						}
					};

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
						if (
							preserveUnknown(importMeta) ||
							(IMPORT_META_FIELDS.has(members[0]) &&
								!isImportMetaFieldEnabled(importMeta, members[0]))
						) {
							return `import.meta${propertyAccess(members, 0)}`;
						}
						return `${Template.toNormalComment(
							`unsupported import.meta.${members.join(".")}`
						)} undefined${propertyAccess(members, 1)}`;
					};
					/**
					 * @param {string} field field name
					 * @returns {string} generated property
					 */
					const importMetaRuntimeProperty = (field) =>
						`[${JSON.stringify(field)}]: ${importMetaUnknownProperty([
							field
						])},`;

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
					// `import.meta` is always replaced by the synthesized object, so it
					// must never become a variable alias: the alias declaration would keep
					// the raw MetaProperty. Staged before DefinePlugin's canRename taps.
					parser.hooks.canRename
						.for(IMPORT_META)
						.tap({ name: PLUGIN_NAME, stage: -100 }, () => false);
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
								const knownProps = [];
								if (isImportMetaFieldEnabled(importMeta, "url")) {
									knownProps.push(`url: ${importMetaUrl()}`);
								}
								if (isImportMetaFieldEnabled(importMeta, "webpack")) {
									knownProps.push(`webpack: ${importMetaWebpackVersion()}`);
								}
								if (isImportMetaFieldEnabled(importMeta, "main")) {
									knownProps.push(
										`main: ${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}] === ${moduleArgument}`
									);
								}
								if (isImportMetaFieldEnabled(importMeta, "env")) {
									addEnvValueDependencies();
									knownProps.push(`env: ${envStringify}`);
								}
								for (const [prop, code] of collectImportMetaCustomDefinitions(
									compilation
								)) {
									knownProps.push(`${toPropertyKey(prop)}: ${code}`);
								}
								const initCode = preserveUnknown(importMeta)
									? `var ${varName} = Object.assign(import.meta, {${knownProps.join(
											", "
										)}});\n`
									: `var ${varName} = {${knownProps.join(", ")}};\n`;
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
								const fieldEnabled = isImportMetaFieldEnabled(
									importMeta,
									prop.id
								);
								const value = fieldEnabled
									? hooks.propertyInDestructuring.call(prop)
									: undefined;

								if (value) {
									str += value;
									continue;
								}

								switch (prop.id) {
									case "url":
										str += fieldEnabled
											? `url: ${importMetaUrl()},`
											: importMetaRuntimeProperty(prop.id);
										break;
									case "webpack":
										str += fieldEnabled
											? `webpack: ${importMetaWebpackVersion()},`
											: importMetaRuntimeProperty(prop.id);
										break;
									case "main":
										if (fieldEnabled) {
											str += `main: ${RuntimeGlobals.moduleCache}[${RuntimeGlobals.entryModuleId}] === ${moduleArgument},`;
											runtimeRequirements.push(
												RuntimeGlobals.moduleCache,
												RuntimeGlobals.entryModuleId,
												RuntimeGlobals.module
											);
										} else {
											str += importMetaRuntimeProperty(prop.id);
										}
										break;
									case "env":
										if (fieldEnabled) {
											addEnvValueDependencies();
											str += `env: ${
												collectImportMetaEnvDefinitions(compilation).stringify
											},`;
										} else {
											str += importMetaRuntimeProperty(prop.id);
										}
										break;
									default: {
										const customCode = collectImportMetaCustomDefinitions(
											compilation
										).get(prop.id);
										if (customCode !== undefined) {
											addEnvValueDependencies();
											str += `${toPropertyKey(prop.id)}: ${customCode},`;
										} else {
											str += importMetaRuntimeProperty(prop.id);
										}
										break;
									}
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

					// custom import.meta properties defined only via nested dotted keys,
					// e.g. reading `import.meta.build` with `"import.meta.build.time"` defined
					parser.hooks.expressionMemberChain
						.for(IMPORT_META)
						.tap(PLUGIN_NAME, (expr, members) => {
							const customCode = collectImportMetaCustomDefinitions(
								compilation
							).get(members[0]);
							if (customCode === undefined) return;
							addEnvValueDependencies();
							const dep = new ConstDependency(
								`(${customCode})${propertyAccess(members, 1)}`,
								/** @type {Range} */ (expr.range)
							);
							dep.loc = /** @type {DependencyLocation} */ (expr.loc);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					// import.meta.url
					if (isImportMetaFieldEnabled(importMeta, "url")) {
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
					}

					// import.meta.webpack
					if (isImportMetaFieldEnabled(importMeta, "webpack")) {
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
					}

					if (isImportMetaFieldEnabled(importMeta, "main")) {
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
					}

					// import.meta.env
					if (isImportMetaFieldEnabled(importMeta, "env")) {
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
									const { env, hasCustomDefinition } =
										collectImportMetaEnvDefinitions(compilation);
									// members of a custom definition resolve on it at runtime
									if (hasCustomDefinition) return;
									if (!env.has(members[1])) {
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
						parser.hooks.expression.for(IMPORT_META_ENV).tap(
							// before DefinePlugin object defines: merge every definition source
							{ name: PLUGIN_NAME, stage: -100 },
							(expr) => {
								const { env, stringify, hasCustomDefinition } =
									collectImportMetaEnvDefinitions(compilation);
								// a custom definition replaces the whole object via DefinePlugin
								if (hasCustomDefinition) return;
								addEnvValueDependencies();
								let objCode = stringify;
								const destructured =
									parser.destructuringAssignmentPropertiesFor(expr);
								if (destructured) {
									/** @type {string[]} */
									const pairs = [];
									for (const prop of destructured) {
										const code = env.get(prop.id);
										if (code !== undefined) {
											pairs.push(`${toPropertyKey(prop.id)}:${code}`);
										}
									}
									objCode = `{${pairs.join(",")}}`;
								}
								const strCode = parser.isAsiPosition(
									/** @type {Range} */ (expr.range)[0]
								)
									? `;(${objCode})`
									: `(${objCode})`;
								/** @type {RawRuntimeRequirements | undefined} */
								let runtimeRequirements;
								if (WEBPACK_REQUIRE_FUNCTION_REGEXP.test(strCode)) {
									runtimeRequirements = [RuntimeGlobals.require];
								} else if (WEBPACK_REQUIRE_IDENTIFIER_REGEXP.test(strCode)) {
									runtimeRequirements = [RuntimeGlobals.requireScope];
								}
								const dep = new ConstDependency(
									strCode,
									/** @type {Range} */ (expr.range),
									runtimeRequirements
								);
								dep.loc = /** @type {DependencyLocation} */ (expr.loc);
								parser.state.module.addPresentationalDependency(dep);
								return true;
							}
						);
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
					}

					// Unknown properties
					parser.hooks.unhandledExpressionMemberChain
						.for(IMPORT_META)
						.tap(PLUGIN_NAME, (expr, members) => {
							// unknown import.meta properties should be determined at runtime
							if (
								preserveUnknown(importMeta) ||
								(IMPORT_META_FIELDS.has(members[0]) &&
									!isImportMetaFieldEnabled(importMeta, members[0]))
							) {
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
								if (
									!isImportMetaFieldEnabled(importMeta, String(prop)) ||
									(preserveUnknown(importMeta) &&
										!IMPORT_META_FIELDS.has(String(prop)))
								) {
									return;
								}
								if (IMPORT_META_FIELDS.has(String(prop))) {
									return;
								}
								// custom-defined properties evaluate via DefinePlugin/runtime
								if (
									collectImportMetaCustomDefinitions(compilation).has(
										String(prop)
									)
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

ImportMetaPlugin.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {ImportMetaPluginHooks} */ ({
			propertyInDestructuring: new SyncBailHook(["property"])
		})
);

module.exports = ImportMetaPlugin;
module.exports.IMPORT_META_DIRNAME = IMPORT_META_DIRNAME;
module.exports.IMPORT_META_FILENAME = IMPORT_META_FILENAME;
module.exports.IMPORT_META_NAMES = IMPORT_META_NAMES;
module.exports.isImportMetaFieldEnabled = isImportMetaFieldEnabled;
