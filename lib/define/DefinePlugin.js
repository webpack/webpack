/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const ConstDependency = require("../dependencies/core/ConstDependency");
const WebpackError = require("../errors/WebpackError");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { VariableInfo } = require("../javascript/JavascriptParser");
const {
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const NormalModule = require("../module/NormalModule");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const { getBuildDiagnostics } = require("../util/buildDiagnostics");
const createHash = require("../util/createHash");
const createHooksRegistry = require("../util/createHooksRegistry");

/** @import { Expression, MemberExpression } from "estree" */
/** @import { Source } from "webpack-sources" */
/** @import Compiler from "../Compiler" */
/** @import { PreparsedAst } from "../module/Parser" */
/**
 * @import Module, {
 * 	BuildInfo,
 * 	ValueCacheVersion,
 * 	ValueCacheVersions
 * } from "../module/Module"
 */
/** @import { NormalModuleBuildInfo } from "../module/NormalModule" */
/** @import RuntimeTemplate from "../template/RuntimeTemplate" */
/**
 * @import JavascriptParser, {
 * 	DestructuringAssignmentProperties,
 * 	Members,
 * 	Range
 * } from "../javascript/JavascriptParser"
 */
/** @import { Logger } from "../logging/Logger" */
/** @import Compilation from "../Compilation" */

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
 * @property {boolean=} async resolve the generator before parsing, including promise-returning functions not declared `async`
 */

/** @typedef {CodeValuePrimitive | PromiseLike<CodeValuePrimitive>} GeneratedValue */
/** @typedef {(value: { module: NormalModule, key: string, readonly version: ValueCacheVersion }) => GeneratedValue} GeneratorFn */

/**
 * Whether the generator is declared `async`.
 * @param {GeneratorFn} fn generator function
 * @returns {boolean} true when the generator is an async function
 */
const isAsyncFunction = (fn) =>
	Object.prototype.toString.call(fn) === "[object AsyncFunction]";

/**
 * Whether a generated value still has to be awaited.
 * @param {GeneratedValue} value what the generator returned
 * @returns {value is PromiseLike<CodeValuePrimitive>} true for a thenable
 */
const isThenable = (value) =>
	(typeof value === "object" || typeof value === "function") &&
	value !== null &&
	typeof (/** @type {PromiseLike<CodeValuePrimitive>} */ (value).then) ===
		"function";

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
		/**
		 * Resolved before the module is parsed, since the parser cannot wait.
		 * Use the option for promise-returning functions not declared `async`.
		 * @type {boolean}
		 */
		this.async =
			this.options !== true && typeof this.options.async === "boolean"
				? this.options.async
				: isAsyncFunction(fn);
	}

	get fileDependencies() {
		return this.options === true ? true : this.options.fileDependencies;
	}

	/**
	 * Records what the value is computed from on the module it is rendered into,
	 * so a change to any of it rebuilds that module.
	 * @param {NormalModule} module the module the value is rendered into
	 * @param {string} key the defined key
	 * @returns {void}
	 */
	addDependencies(module, key) {
		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		if (this.options === true) {
			buildInfo.cacheable = false;
			const diagnostics = getBuildDiagnostics(buildInfo);
			const reasons =
				diagnostics.notCacheableReasons ||
				(diagnostics.notCacheableReasons = []);
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
	}

	/**
	 * Runs the generator for one module.
	 * @param {NormalModule} module the module the value is rendered into
	 * @param {ValueCacheVersions} valueCacheVersions valueCacheVersions
	 * @param {string} key the defined key
	 * @returns {GeneratedValue} the value, or a promise of it
	 */
	call(module, valueCacheVersions, key) {
		return this.fn({
			module,
			key,
			get version() {
				return /** @type {ValueCacheVersion} */ (
					valueCacheVersions.get(VALUE_DEP_PREFIX + key)
				);
			}
		});
	}

	/**
	 * Returns code.
	 * @param {JavascriptParser} parser the parser
	 * @param {ValueCacheVersions} valueCacheVersions valueCacheVersions
	 * @param {string} key the defined key
	 * @returns {CodeValuePrimitive} code
	 */
	exec(parser, valueCacheVersions, key) {
		const module = parser.state.module;
		this.addDependencies(module, key);

		if (this.async) return getResolvedValue(module, this, key);

		const value = this.call(module, valueCacheVersions, key);

		if (isThenable(value)) {
			// Consume a rejection even though the synchronous parser cannot await it.
			Promise.resolve(value).catch(() => {});
			throw new WebpackError(
				`DefinePlugin: the runtime value for "${key}" returned a Promise, but the generator was not declared asynchronous. Declare it with \`async\`, or set \`async: true\` in its options, so webpack can resolve it before the module is parsed.`
			);
		}

		return value;
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

/**
 * Walks a member chain up, dropping its last `count` members.
 * @param {Expression} node member expression
 * @param {number} count members to drop
 * @returns {Expression} the chain without them
 */
const dropTrailingMembers = (node, count) => {
	while (count--) {
		node = /** @type {Expression} */ (
			/** @type {MemberExpression} */ (node).object
		);
	}
	return node;
};

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

// Keys webpack injects itself are not the user's to remove, so `performance.unusedConfig`
// never sees them.
/** @type {WeakSet<DefinePlugin>} */
const INTERNAL_PLUGINS = new WeakSet();
/** @type {WeakMap<Compilation, Set<string>>} */
const DECLARED_KEYS = new WeakMap();
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
 * @property {boolean} hasAsyncRuntimeValue asynchronous generators need to resolve before parsing
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
 * @param {boolean=} asyncOnly whether only asynchronous generators count
 * @returns {boolean} true when a RuntimeValue is contained
 */
const containsRuntimeValue = (value, asyncOnly = false) => {
	if (value instanceof RuntimeValue) return !asyncOnly || value.async;
	if (isObjectDefinition(value)) {
		for (const key of Object.keys(value)) {
			if (containsRuntimeValue(value[key], asyncOnly)) return true;
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
	let hasAsyncRuntimeValue = false;
	/** @type {Map<string, string[]>} */
	const keysByPrefix = new Map();
	for (const key of Object.keys(definitions)) {
		const code = definitions[key];
		if (!hasAsyncRuntimeValue && containsRuntimeValue(code, true)) {
			hasAsyncRuntimeValue = true;
		}
		if (TYPEOF_OPERATOR_REGEXP.test(key)) continue;
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
		// a nested object is walked separately and an empty string renders to
		// no code; every other shape is a destructurable leaf, falsy included
		if (isObjectDefinition(code) || code === "") continue;
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
		hasAsyncRuntimeValue,
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

const createCompilationHooks = () => ({
	/**
	 * @type {SyncWaterfallHook<[Record<string, CodeValue>]>}
	 * @since 5.104.0
	 */
	definitions: new SyncWaterfallHook(["definitions"])
});

/**
 * Prefixes an evaluation error with the offending define key so a bare
 * "Unexpected token" becomes actionable. The original error is mutated and
 * returned (not re-wrapped) so its `loc`/`stack` survive for ModuleParseError's
 * code frame instead of being dumped into the message.
 * @param {string} key the defined key
 * @param {CodeValue} code the defined value
 * @param {unknown} error the original evaluation error
 * @returns {Error} the annotated error
 */
const annotateEvaluationError = (key, code, error) => {
	// a RuntimeValue holds the generator, not code: JSON drops the function and
	// leaves only its options, which says nothing about what failed
	const value =
		code instanceof RuntimeValue
			? `runtimeValue(${code.fn.name || "anonymous"})`
			: typeof code === "string"
				? code
				: JSON.stringify(code);
	const prefix = `DefinePlugin: failed to evaluate value for "${key}" (\`${value}\`)`;
	if (error instanceof Error) {
		// one instance can reach several modules, so prefix it only once
		if (!error.message.startsWith(prefix)) {
			error.message = `${prefix}: ${error.message}`;
		}
		return error;
	}
	return new WebpackError(`${prefix}: ${error}`);
};

/** @typedef {{ value: CodeValuePrimitive } | { error: unknown }} ResolvedRuntimeValue */
/** @typedef {Map<RuntimeValue, Map<string, ResolvedRuntimeValue>>} ResolvedRuntimeValues */
/** @typedef {{ value: RuntimeValue, keys: Set<string>, roots: Set<string> }} AsyncRuntimeValue */

/**
 * Values resolved during the async build, ready for synchronous parser hooks.
 * @type {WeakMap<Module, ResolvedRuntimeValues>}
 */
const RESOLVED_RUNTIME_VALUES = new WeakMap();

/**
 * @typedef {object} AsyncRuntimeDefinitions
 * @property {Map<RuntimeValue, AsyncRuntimeValue>} values async generators
 * @property {Map<string, string[]>} references replacement code by definition root
 * @property {Set<string>} dynamicRoots roots whose synchronous generators may return more references
 */

/** @type {WeakMap<Compilation, AsyncRuntimeDefinitions>} */
const ASYNC_RUNTIME_VALUES = new WeakMap();

/** @type {WeakSet<Compilation>} */
const ASYNC_RESOLUTION_TAPPED = new WeakSet();

/** @type {WeakSet<JavascriptParser>} */
const ASYNC_PARSERS = new WeakSet();

const IDENTIFIER_ESCAPE_REGEXP =
	/\\u(?:\{([\da-fA-F]{1,6})\}|([\da-fA-F]{4}))/g;

/**
 * Includes escaped spellings when checking whether source may use a definition.
 * @param {string} source source or replacement code
 * @returns {string} source with Unicode escapes decoded
 */
const decodeIdentifierEscapes = (source) =>
	source.includes("\\u")
		? source.replace(IDENTIFIER_ESCAPE_REGEXP, (escape, point, unit) => {
				const value = Number.parseInt(point || unit, 16);
				return value <= 0x10ffff ? String.fromCodePoint(value) : escape;
			})
		: source;

/**
 * Collects runtime values under their dotted, object-member and array keys.
 * @param {CodeValue} code definition value
 * @param {Set<string>} keys keys the value can be rendered under
 * @param {string} root first segment of the definition key
 * @param {AsyncRuntimeDefinitions} into collected definitions
 * @returns {void}
 */
const collectAsyncRuntimeValues = (code, keys, root, into) => {
	if (code instanceof RuntimeValue) {
		if (!code.async) {
			into.dynamicRoots.add(root);
			return;
		}
		const collected = into.values.get(code);
		// one instance can be defined under more than one key
		if (collected === undefined) {
			into.values.set(code, {
				value: code,
				keys: new Set(keys),
				roots: new Set([root])
			});
			return;
		}
		for (const key of keys) collected.keys.add(key);
		collected.roots.add(root);
		return;
	}
	if (!isObjectDefinition(code)) {
		const reference = decodeIdentifierEscapes(String(code));
		const references = into.references.get(root);
		if (references) references.push(reference);
		else into.references.set(root, [reference]);
		return;
	}
	const isArray = Array.isArray(code);
	for (const name of Object.keys(code)) {
		/** @type {Set<string>} */
		const childKeys = new Set(
			isArray ? keys : [name, name.slice(name.lastIndexOf(".") + 1)]
		);
		for (const key of keys) childKeys.add(`${key}.${name}`);
		collectAsyncRuntimeValues(code[name], childKeys, root, into);
	}
};

/**
 * The asynchronous runtime values of every definition, collected once per
 * compilation.
 * @param {Compilation} compilation the compilation
 * @returns {AsyncRuntimeDefinitions} the definitions
 */
const getAsyncRuntimeValues = (compilation) => {
	const cached = ASYNC_RUNTIME_VALUES.get(compilation);
	if (cached) return cached;

	/** @type {AsyncRuntimeDefinitions} */
	const collected = {
		values: new Map(),
		references: new Map(),
		dynamicRoots: new Set()
	};
	const { definitions } = getMergedDefinitions(compilation);

	for (const key of Object.keys(definitions)) {
		const name = key.replace(TYPEOF_OPERATOR_REGEXP, "");
		const dot = name.indexOf(".");
		const keys = new Set([key]);
		if (name === key && dot !== -1) {
			keys.add(key.slice(key.lastIndexOf(".") + 1));
		}
		collectAsyncRuntimeValues(
			definitions[key],
			keys,
			dot === -1 ? name : name.slice(0, dot),
			collected
		);
	}

	ASYNC_RUNTIME_VALUES.set(compilation, collected);
	return collected;
};

/**
 * Whether source or replacement code may reference a definition root.
 * @param {string[]} sources module source and reachable replacement code
 * @param {Iterable<string>} roots first segments of definition keys
 * @returns {boolean} false only when the module cannot reference the value
 */
const mayReference = (sources, roots) => {
	for (const root of roots) {
		for (const source of sources) {
			if (source.includes(root)) return true;
		}
	}
	return false;
};

/**
 * Resolves the asynchronous runtime values a module may reference, while the
 * module is still building and a promise can still be awaited.
 * @param {Compilation} compilation the compilation
 * @param {NormalModule} module the module about to be parsed
 * @param {boolean} resolveAll whether a custom AST can introduce additional references
 * @returns {Promise<void>} resolves once every value the module may use is known
 */
const resolveAsyncRuntimeValues = async (compilation, module, resolveAll) => {
	const definitions = getAsyncRuntimeValues(compilation);
	const remaining = new Set(definitions.values.values());
	const references = new Map(definitions.references);
	/** @type {ResolvedRuntimeValues} */
	const resolved = new Map();
	const { valueCacheVersions } = compilation;
	const source = /** @type {Source} */ (module.originalSource()).source();
	const sources = [decodeIdentifierEscapes(source.toString())];

	while (remaining.size > 0) {
		let addedReferences;
		do {
			addedReferences = false;
			for (const [root, code] of references) {
				if (!mayReference(sources, [root])) continue;
				references.delete(root);
				sources.push(...code);
				addedReferences = true;
			}
		} while (addedReferences);
		// A synchronous generator may return arbitrary code. Keep its invocation
		// at parse time, but prepare any async values that code might reference.
		resolveAll = resolveAll || mayReference(sources, definitions.dynamicRoots);
		/** @type {Promise<void>[]} */
		const pending = [];
		for (const entry of remaining) {
			const { value, keys, roots } = entry;
			if (!resolveAll && !mayReference(sources, roots)) continue;
			remaining.delete(entry);
			/** @type {Map<string, ResolvedRuntimeValue>} */
			const byKey = new Map();
			resolved.set(value, byKey);
			for (const key of keys) {
				pending.push(
					Promise.resolve()
						.then(() => value.call(module, valueCacheVersions, key))
						.then(
							(code) => {
								byKey.set(key, { value: code });
								sources.push(decodeIdentifierEscapes(String(code)));
							},
							(error) => {
								// Text matching can include unused members or shadowed names,
								// so keep the rejection as it is and annotate it in
								// `getResolvedValue`, only for the module that consumes it
								byKey.set(key, { error });
							}
						)
				);
			}
		}
		if (pending.length === 0) break;
		await Promise.all(pending);
	}

	// last, so that a rebuild never reads what the previous build resolved
	RESOLVED_RUNTIME_VALUES.set(module, resolved);
};

/**
 * What an asynchronous generator produced for this module, resolved before the
 * module was parsed.
 * @param {NormalModule} module the module being parsed
 * @param {RuntimeValue} runtimeValue the runtime value
 * @param {string} key the defined key
 * @returns {CodeValuePrimitive} the value
 */
const getResolvedValue = (module, runtimeValue, key) => {
	const resolved = RESOLVED_RUNTIME_VALUES.get(module);
	const byKey = resolved && resolved.get(runtimeValue);
	const result = byKey && byKey.get(key);
	if (result === undefined) {
		throw new WebpackError(
			`DefinePlugin: the asynchronous runtime value for "${key}" was not resolved before the module was parsed.`
		);
	}
	if ("error" in result) {
		throw annotateEvaluationError(key, runtimeValue, result.error);
	}
	return result.value;
};

/**
 * @typedef {ReturnType<typeof createCompilationHooks>} DefinePluginHooks
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
	 * Creates a runtime value. Async generators resolve once per module and key
	 * before parsing; promise-returning functions require the `async` option.
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
				const { performance } = compilation.options;
				// Only `performance.unusedConfig` reads these, so a build without it
				// collects nothing.
				const collectDeclared =
					performance !== false &&
					performance.unusedConfig === true &&
					!INTERNAL_PLUGINS.has(this);
				/** @type {Set<string> | undefined} */
				let declaredKeys;
				if (collectDeclared) {
					declaredKeys = DECLARED_KEYS.get(compilation);
					if (declaredKeys === undefined) {
						declaredKeys = new Set();
						DECLARED_KEYS.set(compilation, declaredKeys);
					}
				}
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
					// a parser is created before the module it parses is built, so this
					// is in place before the first value has to be resolved
					if (mergedDefinitions.hasAsyncRuntimeValue) {
						ASYNC_PARSERS.add(parser);
						if (!ASYNC_RESOLUTION_TAPPED.has(compilation)) {
							ASYNC_RESOLUTION_TAPPED.add(compilation);
							NormalModule.getCompilationHooks(
								compilation
							).beforeParse.tapPromise(
								{ name: PLUGIN_NAME, stage: Infinity },
								async (module) => {
									const moduleParser = /** @type {JavascriptParser} */ (
										module.parser
									);
									if (
										!ASYNC_PARSERS.has(moduleParser) ||
										module.shouldPreventParsing(
											compilation.options.module.noParse,
											module.request
										)
									) {
										return;
									}
									// A loader-provided AST or a custom parse function means the
									// module is parsed from something other than its source text,
									// so scanning that text cannot find every reference.
									const hasPreparsedAst =
										/** @type {{ _ast: PreparsedAst | null }} */ (
											/** @type {unknown} */ (module)
										)._ast !== null;
									await resolveAsyncRuntimeValues(
										compilation,
										module,
										hasPreparsedAst ||
											typeof moduleParser.options.parse === "function"
									);
								}
							);
							compilation.hooks.succeedModule.tap(PLUGIN_NAME, (module) => {
								RESOLVED_RUNTIME_VALUES.delete(module);
							});
							compilation.hooks.failedModule.tap(PLUGIN_NAME, (module) => {
								RESOLVED_RUNTIME_VALUES.delete(module);
							});
						}
					}
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
													!Object.prototype.hasOwnProperty.call(
														mergedDefinitions.definitions,
														fullKey
													)
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
							/** @type {BasicEvaluatedExpression} */
							let res;
							try {
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
								res = parser.evaluate(typeofCode);
							} catch (err) {
								throw annotateEvaluationError(originalKey, code, err);
							}
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
						 * Finds the member of a chain that reads a property that is not defined.
						 * Walks the merged view so dotted keys of every instance count.
						 * Collects every define key consulted so the caller can record a
						 * value dependency on each (a sibling key like `OBJECT.SUB2` affects
						 * the result even though `OBJECT` registered the handler).
						 * Inherited members (e.g. `toString`) stay defined.
						 * @param {Members} members chain members (after the root)
						 * @param {string[]} deps consulted define keys (mutated)
						 * @returns {number} index of the member resolving to `undefined`, or -1
						 */
						const findUndefinedMemberAccess = (members, deps) => {
							if (members.length <= chainPrefix.length) return -1;
							for (let i = 0; i < chainPrefix.length; i++) {
								if (members[i] !== chainPrefix[i]) return -1;
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
										return -1;
									} else {
										return i;
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
										return i;
									}
								} else {
									// a leaf with members left is a real property access on a value
									return -1;
								}
								path = nextPath;
							}
							return -1;
						};
						// Cut the chain at the undefined member, so a read after it still
						// throws; an optional link there short-circuits the whole chain.
						parser.hooks.expressionMemberChain
							.for(chainRoot)
							.tap(PLUGIN_NAME, (expr, members, membersOptionals) => {
								const deps = [key];
								const undefinedIndex = findUndefinedMemberAccess(members, deps);
								if (undefinedIndex === -1) return;
								for (const dep of deps) addValueDependency(dep);
								return toConstantDependency(
									parser,
									"undefined"
								)(
									membersOptionals[undefinedIndex + 1]
										? expr
										: dropTrailingMembers(
												expr,
												members.length - 1 - undefinedIndex
											)
								);
							});
						// Cut the chain at the undefined member, so what follows still
						// throws; an optional link there takes the call, arguments unevaluated.
						parser.hooks.callMemberChain
							.for(chainRoot)
							.tap(PLUGIN_NAME, (expr, members, membersOptionals) => {
								const deps = [key];
								const undefinedIndex = findUndefinedMemberAccess(members, deps);
								if (undefinedIndex === -1) return;
								for (const dep of deps) addValueDependency(dep);
								if (membersOptionals[undefinedIndex + 1]) {
									return toConstantDependency(parser, "undefined")(expr);
								}
								toConstantDependency(
									parser,
									"undefined"
								)(
									dropTrailingMembers(
										/** @type {Expression} */ (expr.callee),
										members.length - 1 - undefinedIndex
									)
								);
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
						// Leaves only: an object key counts as used whenever any of its
						// members is, which would report the parent as unused. An object
						// with no members has none, and still substitutes.
						const isLeaf =
							!isObjectDefinition(code) ||
							Object.keys(/** @type {Definitions} */ (code)).length === 0;

						if (declaredKeys !== undefined && isLeaf) {
							declaredKeys.add(prefix + key);
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

DefinePlugin.getCompilationHooks = createHooksRegistry(createCompilationHooks);

/**
 * Marks an instance as webpack's own, so `performance.unusedConfig` never
 * reports the keys it declares against the user.
 * @param {DefinePlugin} plugin the instance webpack constructed itself
 * @returns {DefinePlugin} the same instance
 */
const markInternal = (plugin) => {
	INTERNAL_PLUGINS.add(plugin);
	return plugin;
};

/**
 * The keys the configuration declared, webpack's own excluded.
 * @param {Compilation} compilation the compilation
 * @returns {Set<string> | undefined} the keys, or undefined when none were collected
 */
const getDeclaredKeys = (compilation) => DECLARED_KEYS.get(compilation);

DefinePlugin.VALUE_DEP_MAIN = VALUE_DEP_MAIN;
DefinePlugin.VALUE_DEP_PREFIX = VALUE_DEP_PREFIX;
DefinePlugin.getDeclaredKeys = getDeclaredKeys;
DefinePlugin.getMergedDefinitionNode = getMergedDefinitionNode;
DefinePlugin.getRuntimeRequirements = getRuntimeRequirements;
DefinePlugin.markInternal = markInternal;
DefinePlugin.stringifyMergedDefinition = stringifyMergedDefinition;
DefinePlugin.toPropertyKey = toPropertyKey;

module.exports = DefinePlugin;
