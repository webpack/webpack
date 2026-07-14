/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const RuntimeGlobals = require("./RuntimeGlobals");
const ConstDependency = require("./dependencies/ConstDependency");
const WebpackError = require("./errors/WebpackError");
const BasicEvaluatedExpression = require("./javascript/BasicEvaluatedExpression");
const { VariableInfo } = require("./javascript/JavascriptParser");
const {
	evaluateToString,
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");
const createHash = require("./util/createHash");
const createHooksRegistry = require("./util/createHooksRegistry");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module").BuildInfo} BuildInfo */
/** @typedef {import("./Module").ValueCacheVersion} ValueCacheVersion */
/** @typedef {import("./Module").ValueCacheVersions} ValueCacheVersions */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./javascript/JavascriptParser").DestructuringAssignmentProperties} DestructuringAssignmentProperties */
/** @typedef {import("./javascript/JavascriptParser").Members} Members */
/** @typedef {import("./javascript/JavascriptParser").Range} Range */
/** @typedef {import("./logging/Logger").Logger} Logger */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./NormalModule").NormalModuleBuildInfo} NormalModuleBuildInfo */

/** @typedef {null | undefined | RegExp | EXPECTED_FUNCTION | string | number | boolean | bigint | undefined} CodeValuePrimitive */
/** @typedef {RecursiveArrayOrRecord<CodeValuePrimitive | RuntimeValue>} CodeValue */

/**
 * Defines the runtime value options type used by this module.
 * @typedef {object} RuntimeValueOptions
 * @property {string[]=} fileDependencies
 * @property {string[]=} contextDependencies
 * @property {string[]=} missingDependencies
 * @property {string[]=} buildDependencies
 * @property {string | (() => string)=} version
 */

/** @typedef {(value: { module: NormalModule, key: string, readonly version: ValueCacheVersion }) => CodeValuePrimitive} GeneratorFn */

class RuntimeValue {
	/**
	 * Creates an instance of RuntimeValue.
	 * @param {GeneratorFn} fn generator function
	 * @param {true | string[] | RuntimeValueOptions=} options options
	 */
	constructor(fn, options) {
		/** @type {GeneratorFn} */
		this.fn = fn;
		if (Array.isArray(options)) {
			options = {
				fileDependencies: options
			};
		}
		/** @type {true | RuntimeValueOptions} */
		this.options = options || {};
	}

	get fileDependencies() {
		return this.options === true ? true : this.options.fileDependencies;
	}

	/**
	 * Returns code.
	 * @param {JavascriptParser} parser the parser
	 * @param {ValueCacheVersions} valueCacheVersions valueCacheVersions
	 * @param {string} key the defined key
	 * @returns {CodeValuePrimitive} code
	 */
	exec(parser, valueCacheVersions, key) {
		const buildInfo = /** @type {BuildInfo} */ (parser.state.module.buildInfo);
		if (this.options === true) {
			buildInfo.cacheable = false;
			const reasons =
				buildInfo.notCacheableReasons || (buildInfo.notCacheableReasons = []);
			const reason = `DefinePlugin runtime value ${key}`;
			if (!reasons.includes(reason)) reasons.push(reason);
		} else {
			if (this.options.fileDependencies) {
				for (const dep of this.options.fileDependencies) {
					/** @type {NonNullable<BuildInfo["fileDependencies"]>} */
					(buildInfo.fileDependencies).add(dep);
				}
			}
			if (this.options.contextDependencies) {
				for (const dep of this.options.contextDependencies) {
					/** @type {NonNullable<BuildInfo["contextDependencies"]>} */
					(buildInfo.contextDependencies).add(dep);
				}
			}
			if (this.options.missingDependencies) {
				for (const dep of this.options.missingDependencies) {
					/** @type {NonNullable<BuildInfo["missingDependencies"]>} */
					(buildInfo.missingDependencies).add(dep);
				}
			}
			if (this.options.buildDependencies) {
				for (const dep of this.options.buildDependencies) {
					/** @type {NonNullable<BuildInfo["buildDependencies"]>} */
					(buildInfo.buildDependencies).add(dep);
				}
			}
		}

		return this.fn({
			module: parser.state.module,
			key,
			get version() {
				return /** @type {ValueCacheVersion} */ (
					valueCacheVersions.get(VALUE_DEP_PREFIX + key)
				);
			}
		});
	}

	getCacheVersion() {
		return this.options === true
			? undefined
			: (typeof this.options.version === "function"
					? this.options.version()
					: this.options.version) || "unset";
	}
}

/**
 * Returns used keys.
 * @param {DestructuringAssignmentProperties | undefined} properties properties
 * @returns {Set<string> | undefined} used keys
 */
function getObjKeys(properties) {
	if (!properties) return;
	return new Set([...properties].map((p) => p.id));
}

/**
 * Whether a value is a nested definition (plain object/array) to recurse into.
 * @param {CodeValue} code code value
 * @returns {code is Definitions} true for a plain object or array
 */
const isObjectDefinition = (code) =>
	Boolean(code) &&
	typeof code === "object" &&
	!(code instanceof RuntimeValue) &&
	!(code instanceof RegExp);

/** @typedef {Set<string> | null} ObjKeys */
/** @typedef {boolean | undefined | null} AsiSafe */

/**
 * Returns code converted to string that evaluates.
 * @param {EXPECTED_ANY[] | { [k: string]: EXPECTED_ANY }} obj obj
 * @param {JavascriptParser} parser Parser
 * @param {ValueCacheVersions} valueCacheVersions valueCacheVersions
 * @param {string} key the defined key
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @param {Logger} logger the logger object
 * @param {AsiSafe=} asiSafe asi safe (undefined: unknown, null: unneeded)
 * @param {ObjKeys=} objKeys used keys
 * @returns {string} code converted to string that evaluates
 */
const stringifyObj = (
	obj,
	parser,
	valueCacheVersions,
	key,
	runtimeTemplate,
	logger,
	asiSafe,
	objKeys
) => {
	/** @type {string} */
	let code;
	const arr = Array.isArray(obj);
	if (arr) {
		code = `[${obj
			.map((code) =>
				toCode(
					code,
					parser,
					valueCacheVersions,
					key,
					runtimeTemplate,
					logger,
					null
				)
			)
			.join(",")}]`;
	} else {
		let keys = Object.keys(obj);
		if (objKeys) {
			keys = objKeys.size === 0 ? [] : keys.filter((k) => objKeys.has(k));
		}
		code = `{${keys
			.map((key) => {
				const code = obj[key];
				return `${toPropertyKey(key)}:${toCode(
					code,
					parser,
					valueCacheVersions,
					key,
					runtimeTemplate,
					logger,
					null
				)}`;
			})
			.join(",")}}`;
	}

	switch (asiSafe) {
		case null:
			return code;
		case true:
			return arr ? code : `(${code})`;
		case false:
			return arr ? `;${code}` : `;(${code})`;
		default:
			return `/*#__PURE__*/Object(${code})`;
	}
};

/**
 * Convert code to a string that evaluates
 * @param {CodeValue} code Code to evaluate
 * @param {JavascriptParser} parser Parser
 * @param {ValueCacheVersions} valueCacheVersions valueCacheVersions
 * @param {string} key the defined key
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @param {Logger} logger the logger object
 * @param {boolean | undefined | null=} asiSafe asi safe (undefined: unknown, null: unneeded)
 * @param {ObjKeys=} objKeys used keys
 * @returns {string} code converted to string that evaluates
 */
const toCode = (
	code,
	parser,
	valueCacheVersions,
	key,
	runtimeTemplate,
	logger,
	asiSafe,
	objKeys
) => {
	const transformToCode = () => {
		if (code === null) {
			return "null";
		}
		if (code === undefined) {
			return "undefined";
		}
		if (Object.is(code, -0)) {
			return "-0";
		}
		if (code instanceof RuntimeValue) {
			return toCode(
				code.exec(parser, valueCacheVersions, key),
				parser,
				valueCacheVersions,
				key,
				runtimeTemplate,
				logger,
				asiSafe
			);
		}
		if (code instanceof RegExp && code.toString) {
			return code.toString();
		}
		if (typeof code === "function" && code.toString) {
			return `(${code.toString()})`;
		}
		if (typeof code === "object") {
			return stringifyObj(
				code,
				parser,
				valueCacheVersions,
				key,
				runtimeTemplate,
				logger,
				asiSafe,
				objKeys
			);
		}
		if (typeof code === "bigint") {
			return runtimeTemplate.supportsBigIntLiteral()
				? `${code}n`
				: `BigInt("${code}")`;
		}
		return `${code}`;
	};

	const strCode = transformToCode();

	logger.debug(`Replaced "${key}" with "${strCode}"`);

	return strCode;
};

/**
 * Returns result.
 * @param {CodeValue} code code
 * @returns {string | undefined} result
 */
const toCacheVersion = (code) => {
	if (code === null) {
		return "null";
	}
	if (code === undefined) {
		return "undefined";
	}
	if (Object.is(code, -0)) {
		return "-0";
	}
	if (code instanceof RuntimeValue) {
		return code.getCacheVersion();
	}
	if (code instanceof RegExp && code.toString) {
		return code.toString();
	}
	if (typeof code === "function" && code.toString) {
		return `(${code.toString()})`;
	}
	if (typeof code === "object") {
		const items = Object.keys(code).map((key) => ({
			key,
			value: toCacheVersion(
				/** @type {Record<string, CodeValue>} */
				(code)[key]
			)
		}));
		if (items.some(({ value }) => value === undefined)) return;
		return `{${items.map(({ key, value }) => `${key}: ${value}`).join(", ")}}`;
	}
	if (typeof code === "bigint") {
		return `${code}n`;
	}
	return `${code}`;
};

const PLUGIN_NAME = "DefinePlugin";
const VALUE_DEP_PREFIX = `webpack/${PLUGIN_NAME} `;
const VALUE_DEP_MAIN = `webpack/${PLUGIN_NAME}_hash`;
const TYPEOF_OPERATOR_REGEXP = /^typeof\s+/;
const EMPTY_OBJECT = {};

/** @typedef {Map<string, MergedDefinitionNode>} MergedDefinitionMap */
/** @typedef {CodeValue | MergedDefinitionMap} MergedDefinitionNode */

/**
 * Merged view of the definitions of every DefinePlugin instance.
 * @typedef {object} MergedDefinitions
 * @property {Compilation} compilation the compilation
 * @property {Definitions} definitions flat definitions
 * @property {MergedDefinitionMap} root nested view (dotted keys expanded)
 * @property {Map<string, Set<string>>} finalByNestedKey final key segments by nested object key
 * @property {Map<string, Set<string>>} nestedByFinalKey nested object keys by final key segment
 * @property {Map<string, string[]>} keysByPrefix definition keys below each dotted-key prefix
 * @property {boolean} hasRuntimeValue renders are module-dependent (RuntimeValue present)
 * @property {WeakMap<MergedDefinitionMap, string>} codeCache rendered code per node (static trees only)
 * @property {Logger} logger the logger
 */

/** @type {WeakMap<Compilation, MergedDefinitions>} */
const mergedDefinitionsMap = new WeakMap();

/**
 * Whether a definition value is a plain object to expand into the nested view.
 * @param {CodeValue} code definition value
 * @returns {code is Definitions} true for a plain object
 */
const isPlainObjectDefinition = (code) => {
	if (!code || typeof code !== "object" || Array.isArray(code)) return false;
	const proto = Object.getPrototypeOf(code);
	return proto === Object.prototype || proto === null;
};

/**
 * Object literal key code; `__proto__` must be computed to stay an own property.
 * @param {string} key property key
 * @returns {string} property key code
 */
const toPropertyKey = (key) =>
	key === "__proto__" ? '["__proto__"]' : JSON.stringify(key);

/**
 * Whether a definition value contains a RuntimeValue (module-dependent code).
 * @param {CodeValue} value definition value
 * @returns {boolean} true when a RuntimeValue is contained
 */
const containsRuntimeValue = (value) => {
	if (value instanceof RuntimeValue) return true;
	if (isObjectDefinition(value)) {
		for (const key of Object.keys(value)) {
			if (containsRuntimeValue(value[key])) return true;
		}
	}
	return false;
};

/**
 * Sets a definition value on a node of the nested view, merging plain objects.
 * @param {MergedDefinitionMap} node node
 * @param {string} key key
 * @param {CodeValue} value definition value
 */
const setMergedValue = (node, key, value) => {
	const existing = node.get(key);
	if (isPlainObjectDefinition(value)) {
		const map =
			existing instanceof Map
				? existing
				: /** @type {MergedDefinitionMap} */ (new Map());
		if (map !== existing) node.set(key, map);
		for (const k of Object.keys(value)) setMergedValue(map, k, value[k]);
	} else {
		node.set(key, value);
	}
};

/**
 * Inserts a definition key path into the nested view.
 * @param {MergedDefinitionMap} root root node
 * @param {string[]} path dot-separated key path
 * @param {CodeValue} value definition value
 */
const insertMergedDefinition = (root, path, value) => {
	let node = root;
	for (let i = 0; i < path.length - 1; i++) {
		let next = node.get(path[i]);
		if (next === undefined && !node.has(path[i])) {
			next = /** @type {MergedDefinitionMap} */ (new Map());
			node.set(path[i], next);
		} else if (!(next instanceof Map)) {
			// deeper keys cannot merge into a non-object value
			return;
		}
		node = next;
	}
	setMergedValue(node, path[path.length - 1], value);
};

/**
 * Returns the merged view of all definitions (built once per compilation).
 * @param {Compilation} compilation the compilation
 * @returns {MergedDefinitions} merged definitions
 */
const getMergedDefinitions = (compilation) => {
	const cached = mergedDefinitionsMap.get(compilation);
	if (cached) return cached;

	const definitions = DefinePlugin.getCompilationHooks(
		compilation
	).definitions.call({});
	/** @type {MergedDefinitionMap} */
	const root = new Map();
	/** @type {Map<string, Set<string>>} */
	const finalByNestedKey = new Map();
	/** @type {Map<string, Set<string>>} */
	const nestedByFinalKey = new Map();
	/**
	 * @param {Map<string, Set<string>>} map map
	 * @param {string} key key
	 * @param {string} value value
	 */
	const addToMap = (map, key, value) => {
		const set = map.get(key);
		if (set) {
			set.add(value);
		} else {
			map.set(key, new Set([value]));
		}
	};
	let hasRuntimeValue = false;
	/** @type {Map<string, string[]>} */
	const keysByPrefix = new Map();
	for (const key of Object.keys(definitions)) {
		if (TYPEOF_OPERATOR_REGEXP.test(key)) continue;
		const code = definitions[key];
		insertMergedDefinition(root, key.split("."), code);
		if (!hasRuntimeValue && containsRuntimeValue(code)) hasRuntimeValue = true;
		// group this key under every ancestor prefix (value deps of object reads)
		for (
			let idx = key.indexOf(".");
			idx !== -1;
			idx = key.indexOf(".", idx + 1)
		) {
			const prefix = key.slice(0, idx);
			const keys = keysByPrefix.get(prefix);
			if (keys) {
				keys.push(key);
			} else {
				keysByPrefix.set(prefix, [key]);
			}
		}
		if (!code || typeof code === "object") continue;
		const idx = key.lastIndexOf(".");
		if (idx <= 0 || idx >= key.length - 1) continue;
		const nested = key.slice(0, idx);
		const final = key.slice(idx + 1);
		addToMap(finalByNestedKey, nested, final);
		addToMap(nestedByFinalKey, final, nested);
	}
	const result = {
		compilation,
		definitions,
		root,
		finalByNestedKey,
		nestedByFinalKey,
		keysByPrefix,
		hasRuntimeValue,
		codeCache: new WeakMap(),
		logger: compilation.getLogger("webpack.DefinePlugin")
	};
	mergedDefinitionsMap.set(compilation, result);
	return result;
};

/**
 * Returns the merged definition node for a definition key.
 * @param {Compilation} compilation the compilation
 * @param {string} key definition key
 * @returns {MergedDefinitionNode | undefined} merged node
 */
const getMergedDefinitionNode = (compilation, key) => {
	/** @type {MergedDefinitionNode | undefined} */
	let node = getMergedDefinitions(compilation).root;
	for (const part of key.split(".")) {
		if (!(node instanceof Map)) return;
		node = node.get(part);
	}
	return node;
};

/**
 * Returns a merged map node converted to an object literal code string
 * (no ASI wrapping). Static renders (no key filter, no RuntimeValue) are
 * cached per compilation.
 * @param {MergedDefinitions} merged merged definitions
 * @param {MergedDefinitionMap} node merged map node
 * @param {JavascriptParser} parser Parser
 * @param {string} key the defined key
 * @param {ObjKeys=} objKeys used keys
 * @returns {string} code
 */
const stringifyMergedNode = (merged, node, parser, key, objKeys) => {
	const cacheable = objKeys === undefined && !merged.hasRuntimeValue;
	if (cacheable) {
		const cached = merged.codeCache.get(node);
		if (cached !== undefined) return cached;
	}
	let keys = [...node.keys()];
	if (objKeys) {
		keys = objKeys.size === 0 ? [] : keys.filter((k) => objKeys.has(k));
	}
	const code = `{${keys
		.map((k) => {
			const value = /** @type {MergedDefinitionNode} */ (node.get(k));
			return `${toPropertyKey(k)}:${
				value instanceof Map
					? stringifyMergedNode(merged, value, parser, k)
					: toCode(
							value,
							parser,
							merged.compilation.valueCacheVersions,
							k,
							merged.compilation.runtimeTemplate,
							merged.logger,
							null
						)
			}`;
		})
		.join(",")}}`;
	if (cacheable) merged.codeCache.set(node, code);
	return code;
};

/**
 * Renders a merged definition node to raw code (object literal for map nodes).
 * @param {Compilation} compilation the compilation
 * @param {JavascriptParser} parser Parser
 * @param {MergedDefinitionNode} node merged node
 * @param {string} key the defined key
 * @param {ObjKeys=} objKeys used keys
 * @returns {string} code
 */
const stringifyMergedDefinition = (compilation, parser, node, key, objKeys) => {
	const merged = getMergedDefinitions(compilation);
	return node instanceof Map
		? stringifyMergedNode(merged, node, parser, key, objKeys)
		: toCode(
				node,
				parser,
				compilation.valueCacheVersions,
				key,
				compilation.runtimeTemplate,
				merged.logger,
				null
			);
};

const WEBPACK_REQUIRE_FUNCTION_REGEXP = new RegExp(
	`${RuntimeGlobals.require}\\s*(!?\\.)`
);

/**
 * Runtime requirements of replacement code referencing the require function.
 * @param {string} code replacement code
 * @returns {string[] | undefined} runtime requirements
 */
const getRuntimeRequirements = (code) => {
	// fast path: most replacement code never references the require function
	if (!code.includes(RuntimeGlobals.require)) return;
	return WEBPACK_REQUIRE_FUNCTION_REGEXP.test(code)
		? [RuntimeGlobals.require]
		: [RuntimeGlobals.requireScope];
};

/**
 * Defines the define plugin hooks type used by this module.
 * @typedef {object} DefinePluginHooks
 * @property {SyncWaterfallHook<[Record<string, CodeValue>]>} definitions
 */

/** @typedef {Record<string, CodeValue>} Definitions */

class DefinePlugin {
	/**
	 * Create a new define plugin
	 * @param {Definitions} definitions A map of global object definitions
	 */
	constructor(definitions) {
		/** @type {Definitions} */
		this.definitions = definitions;
	}

	/**
	 * Returns runtime value.
	 * @param {GeneratorFn} fn generator function
	 * @param {true | string[] | RuntimeValueOptions=} options options
	 * @returns {RuntimeValue} runtime value
	 */
	static runtimeValue(fn, options) {
		return new RuntimeValue(fn, options);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const definitions = this.definitions;
				const hooks = DefinePlugin.getCompilationHooks(compilation);

				hooks.definitions.tap(PLUGIN_NAME, (previousDefinitions) => ({
					...previousDefinitions,
					...definitions
				}));

				const logger = compilation.getLogger("webpack.DefinePlugin");
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				const { runtimeTemplate } = compilation;

				const mainHash = createHash(compilation.outputOptions.hashFunction);
				mainHash.update(
					/** @type {string} */
					(compilation.valueCacheVersions.get(VALUE_DEP_MAIN)) || ""
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser Parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					// built lazily here: every definitions hook is tapped by the time
					// parsers are created, and the result is cached per compilation
					const mergedDefinitions = getMergedDefinitions(compilation);
					/** @type {Set<string>} */
					const hooked = new Set();
					const mainValue =
						/** @type {ValueCacheVersion} */
						(compilation.valueCacheVersions.get(VALUE_DEP_MAIN));
					parser.hooks.program.tap(PLUGIN_NAME, () => {
						const buildInfo = /** @type {NormalModuleBuildInfo} */ (
							parser.state.module.buildInfo
						);
						if (!buildInfo.valueDependencies) {
							buildInfo.valueDependencies = new Map();
						}
						buildInfo.valueDependencies.set(VALUE_DEP_MAIN, mainValue);
					});

					/**
					 * Adds value dependency.
					 * @param {string} key key
					 */
					const addValueDependency = (key) => {
						const buildInfo =
							/** @type {NormalModuleBuildInfo} */
							(parser.state.module.buildInfo);
						/** @type {NonNullable<NormalModuleBuildInfo["valueDependencies"]>} */
						(buildInfo.valueDependencies).set(
							VALUE_DEP_PREFIX + key,
							/** @type {ValueCacheVersion} */
							(compilation.valueCacheVersions.get(VALUE_DEP_PREFIX + key))
						);
					};

					/**
					 * With value dependency.
					 * @template T
					 * @param {string} key key
					 * @param {(expression: Expression) => T} fn fn
					 * @returns {(expression: Expression) => T} result
					 */
					const withValueDependency =
						(key, fn) =>
						(...args) => {
							addValueDependency(key);
							return fn(...args);
						};

					/**
					 * Processes the provided definition.
					 * @param {Definitions} definitions Definitions map
					 * @param {string} prefix Prefix string
					 * @returns {void}
					 */
					const walkDefinitions = (definitions, prefix) => {
						for (const key of Object.keys(definitions)) {
							const code = definitions[key];
							if (isObjectDefinition(code)) {
								walkDefinitions(
									/** @type {Definitions} */ (code),
									`${prefix + key}.`
								);
								applyObjectDefine(prefix + key, code);
								continue;
							}
							applyDefineKey(prefix, key);
							applyDefine(prefix + key, code);
						}
					};

					/**
					 * Processes the provided prefix.
					 * @param {string} prefix Prefix
					 * @param {string} key Key
					 * @returns {void}
					 */
					const applyDefineKey = (prefix, key) => {
						const splittedKey = key.split(".");
						const firstKey = splittedKey[0];
						for (const [i, _] of splittedKey.slice(1).entries()) {
							const fullKey = prefix + splittedKey.slice(0, i + 1).join(".");
							// `import.meta` is a MetaProperty, not an identifier that can be
							// aliased: an alias declaration would keep the raw MetaProperty
							// in the output, so never enable renaming for its prefixes
							if (fullKey === "import" || fullKey === "import.meta") continue;
							parser.hooks.canRename.for(fullKey).tap(PLUGIN_NAME, () => {
								addValueDependency(key);
								if (
									parser.scope.definitions.get(firstKey) instanceof VariableInfo
								) {
									return false;
								}
								return true;
							});
						}
						if (prefix === "") {
							const final = splittedKey[splittedKey.length - 1];
							// aggregated over all instances so keys split across
							// several DefinePlugins can still be destructured together
							const nestedSet = mergedDefinitions.nestedByFinalKey.get(final);
							if (!nestedSet || nestedSet.size <= 0) return;
							for (const nested of /** @type {Set<string>} */ (nestedSet)) {
								if (nested && !hooked.has(nested)) {
									// only detect the same nested key once
									hooked.add(nested);
									parser.hooks.collectDestructuringAssignmentProperties.tap(
										PLUGIN_NAME,
										(expr) => {
											const nameInfo = parser.getNameForExpression(expr);
											if (nameInfo && nameInfo.name === nested) return true;
										}
									);
									parser.hooks.expression.for(nested).tap(
										{
											name: PLUGIN_NAME,
											// why 100? Ensures it runs after object define
											stage: 100
										},
										(expr) => {
											const destructed =
												parser.destructuringAssignmentPropertiesFor(expr);
											if (destructed === undefined) {
												return;
											}
											/** @type {Definitions} */
											const obj = Object.create(null);
											const finalSet =
												mergedDefinitions.finalByNestedKey.get(nested);
											for (const { id } of destructed) {
												const fullKey = `${nested}.${id}`;
												if (
													!finalSet ||
													!finalSet.has(id) ||
													!mergedDefinitions.definitions[fullKey]
												) {
													return;
												}
												addValueDependency(fullKey);
												obj[id] = mergedDefinitions.definitions[fullKey];
											}
											let strCode = stringifyObj(
												obj,
												parser,
												compilation.valueCacheVersions,
												key,
												runtimeTemplate,
												logger,
												!parser.isAsiPosition(
													/** @type {Range} */ (expr.range)[0]
												),
												getObjKeys(destructed)
											);
											if (parser.scope.inShorthand) {
												strCode = `${parser.scope.inShorthand}:${strCode}`;
											}
											return toConstantDependency(parser, strCode)(expr);
										}
									);
								}
							}
						}
					};

					/**
					 * Processes the provided key.
					 * @param {string} key Key
					 * @param {CodeValue} code Code
					 * @returns {void}
					 */
					const applyDefine = (key, code) => {
						const originalKey = key;
						const isTypeof = TYPEOF_OPERATOR_REGEXP.test(key);
						if (isTypeof) key = key.replace(TYPEOF_OPERATOR_REGEXP, "");
						let recurse = false;
						let recurseTypeof = false;
						if (!isTypeof) {
							parser.hooks.canRename.for(key).tap(PLUGIN_NAME, () => {
								addValueDependency(originalKey);
								return true;
							});
							parser.hooks.evaluateIdentifier
								.for(key)
								.tap(PLUGIN_NAME, (expr) => {
									/**
									 * this is needed in case there is a recursion in the DefinePlugin
									 * to prevent an endless recursion
									 * e.g.: new DefinePlugin({
									 * "a": "b",
									 * "b": "a"
									 * });
									 */
									if (recurse) return;
									addValueDependency(originalKey);
									recurse = true;
									const res = parser.evaluate(
										toCode(
											code,
											parser,
											compilation.valueCacheVersions,
											key,
											runtimeTemplate,
											logger,
											null
										)
									);
									recurse = false;
									res.setRange(/** @type {Range} */ (expr.range));
									return res;
								});
							parser.hooks.expression.for(key).tap(PLUGIN_NAME, (expr) => {
								addValueDependency(originalKey);
								let strCode = toCode(
									code,
									parser,
									compilation.valueCacheVersions,
									originalKey,
									runtimeTemplate,
									logger,
									!parser.isAsiPosition(/** @type {Range} */ (expr.range)[0]),
									null
								);

								if (parser.scope.inShorthand) {
									strCode = `${parser.scope.inShorthand}:${strCode}`;
								}

								return toConstantDependency(
									parser,
									strCode,
									getRuntimeRequirements(strCode)
								)(expr);
							});
						}
						parser.hooks.evaluateTypeof.for(key).tap(PLUGIN_NAME, (expr) => {
							/**
							 * this is needed in case there is a recursion in the DefinePlugin
							 * to prevent an endless recursion
							 * e.g.: new DefinePlugin({
							 * "typeof a": "typeof b",
							 * "typeof b": "typeof a"
							 * });
							 */
							if (recurseTypeof) return;
							recurseTypeof = true;
							addValueDependency(originalKey);
							const codeCode = toCode(
								code,
								parser,
								compilation.valueCacheVersions,
								originalKey,
								runtimeTemplate,
								logger,
								null
							);
							const typeofCode = isTypeof ? codeCode : `typeof (${codeCode})`;
							const res = parser.evaluate(typeofCode);
							recurseTypeof = false;
							res.setRange(/** @type {Range} */ (expr.range));
							return res;
						});
						parser.hooks.typeof.for(key).tap(PLUGIN_NAME, (expr) => {
							addValueDependency(originalKey);
							const codeCode = toCode(
								code,
								parser,
								compilation.valueCacheVersions,
								originalKey,
								runtimeTemplate,
								logger,
								null
							);
							const typeofCode = isTypeof ? codeCode : `typeof (${codeCode})`;
							const res = parser.evaluate(typeofCode);
							if (!res.isString()) return;
							return toConstantDependency(
								parser,
								JSON.stringify(res.string)
							).bind(parser)(expr);
						});
					};

					/**
					 * Processes the provided key.
					 * @param {string} key Key
					 * @param {object} obj Object
					 * @returns {void}
					 */
					const applyObjectDefine = (key, obj) => {
						const mergedNode = getMergedDefinitionNode(compilation, key);
						/** @type {MergedDefinitionNode} */
						const definition =
							mergedNode === undefined
								? /** @type {CodeValue} */ (obj)
								: mergedNode;
						// value dependencies of a whole-object read: the key itself and
						// every dotted definition key below it (from any instance)
						/** @type {[string, ValueCacheVersion][]} */
						const objectValueDependencies = [];
						for (const defKey of [
							key,
							...(mergedDefinitions.keysByPrefix.get(key) || [])
						]) {
							const name = VALUE_DEP_PREFIX + defKey;
							objectValueDependencies.push([
								name,
								/** @type {ValueCacheVersion} */
								(compilation.valueCacheVersions.get(name))
							]);
						}
						parser.hooks.canRename.for(key).tap(PLUGIN_NAME, () => {
							addValueDependency(key);
							return true;
						});
						parser.hooks.evaluateIdentifier
							.for(key)
							.tap(PLUGIN_NAME, (expr) => {
								addValueDependency(key);
								return new BasicEvaluatedExpression()
									.setTruthy()
									.setSideEffects(false)
									.setRange(/** @type {Range} */ (expr.range));
							});
						parser.hooks.evaluateTypeof
							.for(key)
							.tap(
								PLUGIN_NAME,
								withValueDependency(key, evaluateToString("object"))
							);
						parser.hooks.collectDestructuringAssignmentProperties.tap(
							PLUGIN_NAME,
							(expr) => {
								const nameInfo = parser.getNameForExpression(expr);
								if (nameInfo && nameInfo.name === key) return true;
							}
						);
						parser.hooks.expression.for(key).tap(PLUGIN_NAME, (expr) => {
							const valueDependencies =
								/** @type {NonNullable<NormalModuleBuildInfo["valueDependencies"]>} */
								(
									/** @type {NormalModuleBuildInfo} */
									(parser.state.module.buildInfo).valueDependencies
								);
							for (const [name, version] of objectValueDependencies) {
								valueDependencies.set(name, version);
							}
							// render the merged view so dotted keys (of any instance)
							// are part of whole-object and destructured reads
							const objKeys = getObjKeys(
								parser.destructuringAssignmentPropertiesFor(expr)
							);
							const asiSafe = !parser.isAsiPosition(
								/** @type {Range} */ (expr.range)[0]
							);
							let strCode;
							if (definition instanceof Map) {
								const code = stringifyMergedNode(
									mergedDefinitions,
									definition,
									parser,
									key,
									objKeys
								);
								strCode = asiSafe ? `(${code})` : `;(${code})`;
							} else {
								strCode = toCode(
									definition,
									parser,
									compilation.valueCacheVersions,
									key,
									runtimeTemplate,
									logger,
									asiSafe,
									objKeys
								);
							}

							if (parser.scope.inShorthand) {
								strCode = `${parser.scope.inShorthand}:${strCode}`;
							}

							return toConstantDependency(
								parser,
								strCode,
								getRuntimeRequirements(strCode)
							)(expr);
						});
						// A property access not defined on the object resolves to `undefined`
						// and the whole object is never inlined (issue #15559). Keyed by the
						// chain root so dotted object keys (e.g. `a.b`) are also covered.
						const chainParts = key.split(".");
						// `import.meta` is one chain root (a MetaProperty), not two members.
						const isMeta =
							chainParts[0] === "import" && chainParts[1] === "meta";
						const chainRoot = isMeta ? "import.meta" : chainParts[0];
						const chainPrefix = chainParts.slice(isMeta ? 2 : 1);
						/**
						 * Whether a member chain reads a property that is not defined.
						 * Walks the merged view so dotted keys of every instance count.
						 * Collects every define key consulted so the caller can record a
						 * value dependency on each (a sibling key like `OBJECT.SUB2` affects
						 * the result even though `OBJECT` registered the handler).
						 * Inherited members (e.g. `toString`) stay defined.
						 * @param {Members} members chain members (after the root)
						 * @param {string[]} deps consulted define keys (mutated)
						 * @returns {boolean} true when the access resolves to `undefined`
						 */
						const isUndefinedMemberAccess = (members, deps) => {
							if (members.length <= chainPrefix.length) return false;
							for (let i = 0; i < chainPrefix.length; i++) {
								if (members[i] !== chainPrefix[i]) return false;
							}
							/** @type {MergedDefinitionNode | undefined} */
							let value = definition;
							let path = key;
							for (let i = chainPrefix.length; i < members.length; i++) {
								const member = members[i];
								const nextPath = `${path}.${member}`;
								if (value instanceof Map) {
									if (value.has(member)) {
										deps.push(nextPath);
										value = value.get(member);
									} else if (member in EMPTY_OBJECT) {
										return false;
									} else {
										return true;
									}
								} else if (isObjectDefinition(value)) {
									// non-expandable object leaf (e.g. an array)
									if (member in value) {
										value = /** @type {Definitions} */ (value)[member];
									} else if (
										Object.prototype.hasOwnProperty.call(
											mergedDefinitions.definitions,
											nextPath
										)
									) {
										// defined via a dotted sibling key, e.g. `OBJECT.SUB2`
										deps.push(nextPath);
										value = mergedDefinitions.definitions[nextPath];
									} else {
										return true;
									}
								} else {
									// a leaf with members left is a real property access on a value
									return false;
								}
								path = nextPath;
							}
							return false;
						};
						parser.hooks.expressionMemberChain
							.for(chainRoot)
							.tap(PLUGIN_NAME, (expr, members) => {
								const deps = [key];
								if (!isUndefinedMemberAccess(members, deps)) return;
								for (const dep of deps) addValueDependency(dep);
								return toConstantDependency(parser, "undefined")(expr);
							});
						// In a call, replace only the callee so the call itself is kept:
						// `x.MISSING()` stays a (throwing) call and `x.MISSING?.()`
						// short-circuits, with the object never inlined.
						parser.hooks.callMemberChain
							.for(chainRoot)
							.tap(PLUGIN_NAME, (expr, members) => {
								const deps = [key];
								if (!isUndefinedMemberAccess(members, deps)) return;
								for (const dep of deps) addValueDependency(dep);
								toConstantDependency(
									parser,
									"undefined"
								)(/** @type {Expression} */ (expr.callee));
								parser.walkExpressions(expr.arguments);
								return true;
							});
						parser.hooks.typeof
							.for(key)
							.tap(
								PLUGIN_NAME,
								withValueDependency(
									key,
									toConstantDependency(parser, JSON.stringify("object"))
								)
							);
					};

					walkDefinitions(definitions, "");
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

				/**
				 * Processes the provided definition.
				 * @param {Definitions} definitions Definitions map
				 * @param {string} prefix Prefix string
				 * @returns {void}
				 */
				const walkDefinitionsForValues = (definitions, prefix) => {
					for (const key of Object.keys(definitions)) {
						const code = definitions[key];
						const version = /** @type {string} */ (toCacheVersion(code));
						const name = VALUE_DEP_PREFIX + prefix + key;
						mainHash.update(`|${prefix}${key}`);
						const oldVersion = compilation.valueCacheVersions.get(name);
						if (oldVersion === undefined) {
							compilation.valueCacheVersions.set(name, version);
						} else if (oldVersion !== version) {
							const warning = new WebpackError(
								`${PLUGIN_NAME}\nConflicting values for '${prefix + key}'`
							);
							warning.details = `'${oldVersion}' !== '${version}'`;
							warning.hideStack = true;
							compilation.warnings.push(warning);
						}
						if (isObjectDefinition(code)) {
							walkDefinitionsForValues(
								/** @type {Definitions} */ (code),
								`${prefix + key}.`
							);
						}
					}
				};

				walkDefinitionsForValues(definitions, "");

				compilation.valueCacheVersions.set(
					VALUE_DEP_MAIN,
					mainHash.digest("hex").slice(0, 8)
				);
			}
		);
	}
}

DefinePlugin.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {DefinePluginHooks} */ ({
			definitions: new SyncWaterfallHook(["definitions"])
		})
);

module.exports = DefinePlugin;
module.exports.VALUE_DEP_MAIN = VALUE_DEP_MAIN;
module.exports.VALUE_DEP_PREFIX = VALUE_DEP_PREFIX;
module.exports.getMergedDefinitionNode = getMergedDefinitionNode;
module.exports.getRuntimeRequirements = getRuntimeRequirements;
module.exports.stringifyMergedDefinition = stringifyMergedDefinition;
module.exports.toPropertyKey = toPropertyKey;
