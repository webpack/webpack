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
const { getInnerGraphUtils } = require("../optimize/InnerGraph");
const createHooksRegistry = require("../util/createHooksRegistry");
const { propertyAccess } = require("../util/property");
const ConstDependency = require("./ConstDependency");
const ImportMetaResolveDependency = require("./ImportMetaResolveDependency");
const ModuleInitFragmentDependency = require("./ModuleInitFragmentDependency");

// Loaded at module scope, not inside the parser handler: the async resolver
// cache tail can run that handler after a test tears down the module registry.
const WEBPACK_VERSION = Number.parseInt(
	require("../../package.json").version,
	10
);

/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").Super} Super */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
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
const IMPORT_META_RESOLVE = "import.meta.resolve";

const IMPORT_META_FIELDS = new Set([
	"url",
	"webpack",
	"main",
	"env",
	"dirname",
	"filename",
	"resolve",
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
	IMPORT_META_FILENAME,
	IMPORT_META_RESOLVE
];

// Ordering contract for import.meta parser hooks across plugins: ESM detection
// (HarmonyDetectionParserPlugin, non-bailing) must observe every access before
// any bailing replacement; the merged replacements here must run before
// DefinePlugin object defines (default stage 0) and its nested destructuring
// handler (stage 100).
const IMPORT_META_STAGE_ESM_DETECTION = -1000;
const IMPORT_META_STAGE_REPLACEMENT = -100;

/**
 * import.meta definitions collected from DefinePlugin's merged view.
 * @typedef {object} ImportMetaDefinitions
 * @property {MergedDefinitionNode | undefined} envNode `import.meta.env` node (a map unless custom-defined)
 * @property {Map<string, MergedDefinitionNode>} customProps custom (non-field) property nodes
 */

/** @type {WeakMap<Compilation, ImportMetaDefinitions>} */
const compilationMetaDefinitionsMap = new WeakMap();

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
 * Checks whether the callee is the `import.meta.resolve` member.
 * @param {Expression | Super} callee call callee
 * @returns {boolean} true when the callee is `import.meta.resolve`
 */
const isImportMetaResolveCallee = (callee) =>
	callee.type === "MemberExpression" &&
	callee.object.type === "MetaProperty" &&
	callee.object.meta.name === "import" &&
	callee.object.property.name === "meta" &&
	(callee.computed
		? callee.property.type === "Literal" && callee.property.value === "resolve"
		: callee.property.type === "Identifier" &&
			callee.property.name === "resolve");

/**
 * Only a single statically known specifier maps to an asset.
 * @param {CallExpression} call the call expression
 * @param {Parser} parser the parser
 * @returns {string | undefined} the resolved static specifier, if any
 */
const getImportMetaResolveRequest = (call, parser) => {
	if (call.arguments.length !== 1) return undefined;
	const [arg] = call.arguments;
	if (arg.type === "SpreadElement") return undefined;
	return parser.evaluateExpression(arg).asString();
};

/**
 * Collects import.meta definitions from DefinePlugin's merged view
 * (object form and dotted keys of every instance).
 * @param {Compilation} compilation the compilation
 * @returns {ImportMetaDefinitions} collected definitions
 */
const collectImportMetaDefinitions = (compilation) => {
	const cached = compilationMetaDefinitionsMap.get(compilation);
	if (cached) {
		return cached;
	}

	const metaNode = DefinePlugin.getMergedDefinitionNode(
		compilation,
		IMPORT_META
	);
	/** @type {MergedDefinitionNode | undefined} */
	let envNode;
	/** @type {Map<string, MergedDefinitionNode>} */
	const customProps = new Map();
	if (metaNode instanceof Map) {
		for (const [prop, node] of metaNode) {
			if (prop === "env") {
				envNode = node;
			} else if (!IMPORT_META_FIELDS.has(prop)) {
				// fields (url, webpack, …) are handled by their own logic
				customProps.set(prop, node);
			}
		}
	}
	const result = { envNode, customProps };
	compilationMetaDefinitionsMap.set(compilation, result);
	return result;
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
				compilation.dependencyFactories.set(
					ImportMetaResolveDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportMetaResolveDependency,
					new ImportMetaResolveDependency.Template()
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
				const parserHandler = (parser, { importMeta, url }) => {
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
								dep.loc = parser.getLocation(metaProperty);
								parser.state.module.addPresentationalDependency(dep);
								return true;
							});
						return;
					}

					const { envNode, customProps: allCustomProps } =
						collectImportMetaDefinitions(compilation);
					// a non-object definition: DefinePlugin replaces the whole object
					const envIsCustom =
						envNode !== undefined && !(envNode instanceof Map);
					// per-field parser options may disable custom properties too
					/** @type {Map<string, MergedDefinitionNode>} */
					const customProps = new Map();
					for (const [prop, node] of allCustomProps) {
						if (isImportMetaFieldEnabled(importMeta, prop)) {
							customProps.set(prop, node);
						}
					}

					/** @type {Map<string, ValueCacheVersion>} */
					const definitionValueDependencies = new Map();
					/**
					 * @param {string} name value cache key
					 */
					const addDefinitionValueDependency = (name) => {
						const version = compilation.valueCacheVersions.get(name);
						// an undefined version would force a rebuild on every build
						if (version !== undefined) {
							definitionValueDependencies.set(name, version);
						}
					};
					addDefinitionValueDependency(DefinePlugin.VALUE_DEP_MAIN);
					if (isImportMetaFieldEnabled(importMeta, "env")) {
						addDefinitionValueDependency(
							DefinePlugin.VALUE_DEP_PREFIX + IMPORT_META_ENV
						);
						if (envNode instanceof Map) {
							for (const envKey of envNode.keys()) {
								addDefinitionValueDependency(
									`${DefinePlugin.VALUE_DEP_PREFIX + IMPORT_META_ENV}.${envKey}`
								);
							}
						}
					}
					for (const prop of customProps.keys()) {
						addDefinitionValueDependency(
							`${DefinePlugin.VALUE_DEP_PREFIX + IMPORT_META}.${prop}`
						);
					}
					/**
					 * Records value dependencies for every inlined definition so
					 * cached modules rebuild when a definition value changes.
					 * @returns {void}
					 */
					const addDefinitionValueDependencies = () => {
						if (definitionValueDependencies.size === 0) return;
						const buildInfo = /** @type {NormalModuleBuildInfo} */ (
							parser.state.module.buildInfo
						);
						const valueDependencies =
							buildInfo.valueDependencies ||
							(buildInfo.valueDependencies = new Map());
						for (const [name, version] of definitionValueDependencies) {
							valueDependencies.set(name, version);
						}
					};
					/**
					 * Renders a merged definition node at a use site.
					 * @param {MergedDefinitionNode | undefined} node node
					 * @param {string} key definition key
					 * @param {Set<string>=} objKeys used keys
					 * @returns {string} code
					 */
					const renderDefinition = (node, key, objKeys) =>
						node === undefined
							? "{}"
							: DefinePlugin.stringifyMergedDefinition(
									compilation,
									parser,
									node,
									key,
									objKeys
								);

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
						.tap(
							{ name: PLUGIN_NAME, stage: IMPORT_META_STAGE_REPLACEMENT },
							() => false
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
									addDefinitionValueDependencies();
									knownProps.push(
										`env: ${renderDefinition(envNode, IMPORT_META_ENV)}`
									);
								}
								for (const [prop, node] of customProps) {
									addDefinitionValueDependencies();
									knownProps.push(
										`${DefinePlugin.toPropertyKey(prop)}: ${renderDefinition(
											node,
											`${IMPORT_META}.${prop}`
										)}`
									);
								}
								const initCode = preserveUnknown(importMeta)
									? `var ${varName} = Object.assign(import.meta, {${knownProps.join(
											", "
										)}});\n`
									: `var ${varName} = {${knownProps.join(", ")}};\n`;
								/** @type {RawRuntimeRequirements} */
								const initRuntimeRequirements = [
									RuntimeGlobals.moduleCache,
									RuntimeGlobals.entryModuleId,
									RuntimeGlobals.module
								];
								const initCodeRequirements =
									DefinePlugin.getRuntimeRequirements(initCode);
								if (initCodeRequirements) {
									initRuntimeRequirements.push(...initCodeRequirements);
								}
								const initDep = new ModuleInitFragmentDependency(
									initCode,
									initRuntimeRequirements,
									varName
								);
								initDep.loc = parser.getLocation(metaProperty);
								parser.state.module.addPresentationalDependency(initDep);
								const dep = new ConstDependency(
									varName,
									/** @type {Range} */ (metaProperty.range),
									runtimeRequirements
								);
								dep.loc = parser.getLocation(metaProperty);
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
											addDefinitionValueDependencies();
											str += `env: ${renderDefinition(envNode, IMPORT_META_ENV)},`;
										} else {
											str += importMetaRuntimeProperty(prop.id);
										}
										break;
									default: {
										const node = customProps.get(prop.id);
										if (node !== undefined) {
											addDefinitionValueDependencies();
											str += `${DefinePlugin.toPropertyKey(prop.id)}: ${renderDefinition(
												node,
												`${IMPORT_META}.${prop.id}`
											)},`;
										} else {
											str += importMetaRuntimeProperty(prop.id);
										}
										break;
									}
								}
							}
							const strCode = `({${str}})`;
							const codeRequirements =
								DefinePlugin.getRuntimeRequirements(strCode);
							if (codeRequirements) {
								runtimeRequirements.push(...codeRequirements);
							}
							const dep = new ConstDependency(
								strCode,
								/** @type {Range} */ (metaProperty.range),
								runtimeRequirements
							);
							dep.loc = parser.getLocation(metaProperty);
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
					if (customProps.size > 0) {
						parser.hooks.expressionMemberChain
							.for(IMPORT_META)
							.tap(PLUGIN_NAME, (expr, members) => {
								const node = customProps.get(members[0]);
								if (node === undefined) return;
								addDefinitionValueDependencies();
								const strCode = `(${renderDefinition(
									node,
									`${IMPORT_META}.${members[0]}`
								)})${propertyAccess(members, 1)}`;
								return toConstantDependency(
									parser,
									strCode,
									DefinePlugin.getRuntimeRequirements(strCode)
								)(expr);
							});
					}

					// import.meta.resolve — resolve a static specifier to the emitted
					// asset URL string (the string form of `new URL(x, import.meta.url)`).
					if (isImportMetaFieldEnabled(importMeta, "resolve")) {
						const relative = url === "relative";
						parser.hooks.call
							.for(IMPORT_META_RESOLVE)
							.tap(PLUGIN_NAME, (expr) => {
								const call = /** @type {CallExpression} */ (expr);
								// Non-static forms are left untouched for runtime evaluation.
								const request = getImportMetaResolveRequest(call, parser);
								if (request === undefined) return;
								const range = /** @type {Range} */ (call.range);
								const dep = new ImportMetaResolveDependency(
									request,
									range,
									range,
									relative
								);
								dep.loc = parser.getLocation(call);
								parser.state.current.addDependency(dep);
								getInnerGraphUtils(parser.state.compilation).onUsage(
									parser.state,
									(e) => (dep.usedByExports = e)
								);
								return true;
							});
						// Computing a URL string is side-effect free, so an unused result
						// can be tree-shaken (matching `new URL(..., import.meta.url)`).
						parser.hooks.isPure
							.for("CallExpression")
							.tap(PLUGIN_NAME, (expr) => {
								const call = /** @type {CallExpression} */ (expr);
								if (!isImportMetaResolveCallee(call.callee)) return;
								if (getImportMetaResolveRequest(call, parser) !== undefined) {
									return true;
								}
							});
					}

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
								dep.loc = parser.getLocation(expr);
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
									// members of a custom definition resolve on it at runtime
									if (envIsCustom) return;
									if (!(envNode instanceof Map) || !envNode.has(members[1])) {
										return toConstantDependency(parser, "undefined")(expr);
									}
								}
							});
						parser.hooks.expression.for(IMPORT_META_ENV).tap(
							// before DefinePlugin object defines: merge every definition source
							{ name: PLUGIN_NAME, stage: IMPORT_META_STAGE_REPLACEMENT },
							(expr) => {
								// a custom definition replaces the whole object via DefinePlugin
								if (envIsCustom) return;
								addDefinitionValueDependencies();
								const destructured =
									parser.destructuringAssignmentPropertiesFor(expr);
								const objKeys =
									destructured &&
									new Set([...destructured].map((prop) => prop.id));
								const code = renderDefinition(
									envNode,
									IMPORT_META_ENV,
									objKeys
								);
								const strCode = parser.isAsiPosition(
									/** @type {Range} */ (expr.range)[0]
								)
									? `;(${code})`
									: `(${code})`;
								return toConstantDependency(
									parser,
									strCode,
									DefinePlugin.getRuntimeRequirements(strCode)
								)(expr);
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
							dep.loc = parser.getLocation(expr);
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
								if (customProps.has(String(prop))) {
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
module.exports.IMPORT_META_STAGE_ESM_DETECTION =
	IMPORT_META_STAGE_ESM_DETECTION;
module.exports.isImportMetaFieldEnabled = isImportMetaFieldEnabled;
