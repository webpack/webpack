/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/** @import UnsupportedFeatureWarning from "../../errors/UnsupportedFeatureWarning" */

const path = require("path");

const WebpackError = require("../../errors/WebpackError");
const { Field, Flag, NodeType } = require("../../javascript/syntax-parser");
const {
	commonGlobBaseDir,
	globPatternsAreRecursive,
	importMetaGlobPathParts,
	joinImportMetaGlobFsPath,
	joinImportMetaGlobPath,
	normalizePathSeparators,
	normalizePathSeparatorsForPath,
	resolveContextModuleGlobPattern
} = require("../../util/globUtils");
const { relativePathToRequest } = require("../../util/identifier");
const memoize = require("../../util/memoize");

const getUnsupportedFeatureWarning = memoize(() =>
	require("../../errors/UnsupportedFeatureWarning")
);

/** @import { ContextModuleOptions } from "../../context/ContextModule" */
/** @import JavascriptParser, { JavascriptNodeReader, Range } from "../../javascript/JavascriptParser" */
/** @import { RawReferencedExports, DependencyLocation } from "../../graph/Dependency" */
/** @import { TreeValue } from "../../javascript/syntax-parser" */
/**
 * @typedef {object} ParsedImportMetaGlobOptions
 * @property {string[]} patterns patterns
 * @property {string} requestContext request context
 * @property {string} baseDir base directory
 * @property {boolean} recursive recursive
 * @property {ContextModuleOptions["mode"]} mode mode
 * @property {string | undefined} importName import name
 * @property {string} query query
 * @property {boolean} exhaustive exhaustive
 * @property {boolean} caseSensitive case sensitive
 * @property {RawReferencedExports | undefined} referencedExports referenced exports
 * @property {Range} range range
 */

const SUPPORTED_IMPORT_META_GLOB_OPTIONS =
	"eager, import, query, base, exhaustive, caseSensitive";

/**
 * @param {string} msg message
 * @param {DependencyLocation} loc location
 * @returns {WebpackError} error
 */
const createImportMetaGlobError = (msg, loc) => {
	const error = new WebpackError(msg);
	error.name = "ImportMetaGlobError";
	error.loc = loc;
	return error;
};

/**
 * @param {string} msg message
 * @param {DependencyLocation} loc location
 * @returns {UnsupportedFeatureWarning} warning
 */
const createImportMetaGlobWarning = (msg, loc) =>
	new (getUnsupportedFeatureWarning())(msg, loc);

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} node a node
 * @param {JavascriptParser} parser parser
 * @returns {DependencyLocation} its location
 */
const locationOf = (path, node, parser) =>
	parser.getLocation(parser.nodeOfPath(path, node));

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} node expression
 * @param {JavascriptParser} parser parser
 * @returns {string | undefined} static string
 */
const staticStringFromExpr = (path, node, parser) => {
	const evaluated = parser.evaluateExpression(parser.nodeOfPath(path, node));
	if (evaluated.isString()) {
		return /** @type {string} */ (evaluated.string);
	}
	if (
		path.type(node) === NodeType.TemplateLiteral &&
		path.fieldCount(Field.expressions, node) === 0
	) {
		const { cooked } =
			/** @type {{ cooked?: string | null }} */
			(path.value(path.field(0, Field.quasis, node)));
		if (cooked !== null && cooked !== undefined) return cooked;
	}
};

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} key property key
 * @returns {string | undefined} key
 */
const staticOptionKeyFromPropName = (path, key) => {
	const type = path.type(key);
	if (type === NodeType.Identifier) return path.name(key);
	if (type === NodeType.Literal) {
		const value = path.value(key);
		if (typeof value === "string") return value;
	}
};

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} node expression
 * @param {JavascriptParser} parser parser
 * @param {UnsupportedFeatureWarning[]} warnings warnings
 * @returns {string[] | undefined} glob patterns
 */
const parseStaticGlobPatternsFromExpr = (path, node, parser, warnings) => {
	const single = staticStringFromExpr(path, node, parser);
	if (single !== undefined) return [single];
	if (path.type(node) !== NodeType.ArrayExpression) {
		warnings.push(
			createImportMetaGlobWarning(
				"import.meta.glob() first argument must be a string literal or array of string literals",
				locationOf(path, node, parser)
			)
		);
		return;
	}
	/** @type {string[]} */
	const patterns = [];
	const count = path.fieldCount(Field.elements, node);
	for (let i = 0; i < count; i++) {
		const elem = path.field(i, Field.elements, node);
		if (elem === 0) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					locationOf(path, node, parser)
				)
			);
			return;
		}
		if (path.type(elem) === NodeType.SpreadElement) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					locationOf(path, elem, parser)
				)
			);
			return;
		}
		const pattern = staticStringFromExpr(path, elem, parser);
		if (pattern === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					locationOf(path, elem, parser)
				)
			);
			return;
		}
		patterns.push(pattern);
	}
	if (patterns.length === 0) {
		warnings.push(
			createImportMetaGlobWarning(
				"import.meta.glob() requires at least one pattern",
				locationOf(path, node, parser)
			)
		);
		return;
	}
	return patterns;
};

/**
 * @param {string} query query
 * @returns {string} normalized query
 */
const normalizeImportMetaGlobQuery = (query) => {
	if (query === "" || query.startsWith("?")) return query;
	return `?${query}`;
};

/**
 * @param {TreeValue | undefined} value a literal's value
 * @returns {string | undefined} it as a query key or value, for a number or boolean
 */
const scalarToString = (value) =>
	typeof value === "number" || typeof value === "boolean"
		? String(value)
		: undefined;

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} key property key
 * @returns {string | undefined} key
 */
const staticImportMetaGlobQueryKeyFromPropName = (path, key) => {
	const type = path.type(key);
	if (type === NodeType.Identifier) return path.name(key);
	if (type === NodeType.Literal) {
		const value = path.value(key);
		return typeof value === "string" ? value : scalarToString(value);
	}
};

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} node expression
 * @param {JavascriptParser} parser parser
 * @param {UnsupportedFeatureWarning[]} warnings warnings
 * @returns {string | undefined} query
 */
const parseStaticImportMetaGlobQueryFromExpr = (
	path,
	node,
	parser,
	warnings
) => {
	const query = staticStringFromExpr(path, node, parser);
	if (query !== undefined) return normalizeImportMetaGlobQuery(query);
	if (path.type(node) !== NodeType.ObjectExpression) {
		warnings.push(
			createImportMetaGlobWarning(
				"import.meta.glob() 'query' option must be a constant string or object",
				locationOf(path, node, parser)
			)
		);
		return;
	}
	const params = new URLSearchParams();
	const count = path.fieldCount(Field.properties, node);
	for (let i = 0; i < count; i++) {
		const prop = path.field(i, Field.properties, node);
		if (path.type(prop) !== NodeType.Property) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() 'query' object must only contain constant key-value pairs",
					locationOf(path, node, parser)
				)
			);
			return;
		}
		const keyNode = path.field(0, Field.key, prop);
		const key = staticImportMetaGlobQueryKeyFromPropName(path, keyNode);
		if (key === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() 'query' object keys must be constant strings",
					locationOf(path, keyNode, parser)
				)
			);
			return;
		}
		const valueNode = path.field(0, Field.value, prop);
		const valueStr = staticStringFromExpr(path, valueNode, parser);
		const scalar =
			valueStr === undefined && path.type(valueNode) === NodeType.Literal
				? scalarToString(path.value(valueNode))
				: undefined;
		if (valueStr !== undefined) {
			params.append(key, valueStr);
		} else if (scalar !== undefined) {
			params.append(key, scalar);
		} else {
			warnings.push(
				createImportMetaGlobWarning(
					`import.meta.glob() 'query' object value for key '${key}' must be a constant string or boolean`,
					locationOf(path, valueNode, parser)
				)
			);
			return;
		}
	}
	return normalizeImportMetaGlobQuery(params.toString());
};

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} globOptions options object, `0` for none
 * @param {JavascriptParser} parser parser
 * @param {UnsupportedFeatureWarning[]} warnings warnings
 * @returns {{ eager: boolean, importName: string | undefined, query: string, base: string | undefined, exhaustive: boolean, caseSensitive: boolean }} parsed options
 */
const parseImportMetaGlobOptionsObject = (
	path,
	globOptions,
	parser,
	warnings
) => {
	let eager = false;
	/** @type {string | undefined} */
	let importName;
	let query = "";
	/** @type {string | undefined} */
	let base;
	let exhaustive = false;
	let caseSensitive = true;

	if (globOptions === 0) {
		return { eager, importName, query, base, exhaustive, caseSensitive };
	}

	const count = path.fieldCount(Field.properties, globOptions);
	for (let i = 0; i < count; i++) {
		const prop = path.field(i, Field.properties, globOptions);
		if (path.type(prop) !== NodeType.Property) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() options object must only contain constant key-value pairs",
					locationOf(path, globOptions, parser)
				)
			);
			continue;
		}
		const keyNode = path.field(0, Field.key, prop);
		if (path.flag(Flag.computed, prop)) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() option keys must be constant strings",
					locationOf(path, keyNode, parser)
				)
			);
			continue;
		}
		const key = staticOptionKeyFromPropName(path, keyNode);
		if (key === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() option keys must be constant strings",
					locationOf(path, keyNode, parser)
				)
			);
			continue;
		}
		const valueExpr = path.field(0, Field.value, prop);
		switch (key) {
			case "eager": {
				const evaluated = parser.evaluateExpression(
					parser.nodeOfPath(path, valueExpr)
				);
				if (evaluated.isBoolean()) {
					eager = /** @type {boolean} */ (evaluated.bool);
				} else {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'eager' option must be a constant boolean (true or false), defaulting to false",
							locationOf(path, valueExpr, parser)
						)
					);
				}
				break;
			}
			case "import": {
				const importOption = staticStringFromExpr(path, valueExpr, parser);
				if (importOption === undefined) {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'import' option must be a constant string, ignoring",
							locationOf(path, valueExpr, parser)
						)
					);
				} else if (importOption !== "*") {
					importName = importOption;
				}
				break;
			}
			case "query": {
				const queryValue = parseStaticImportMetaGlobQueryFromExpr(
					path,
					valueExpr,
					parser,
					warnings
				);
				if (queryValue !== undefined) query = queryValue;
				break;
			}
			case "base": {
				const baseValue = staticStringFromExpr(path, valueExpr, parser);
				if (baseValue === undefined) {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'base' option must be a constant string, ignoring",
							locationOf(path, valueExpr, parser)
						)
					);
				} else {
					base = baseValue;
				}
				break;
			}
			case "exhaustive": {
				const evaluated = parser.evaluateExpression(
					parser.nodeOfPath(path, valueExpr)
				);
				if (evaluated.isBoolean()) {
					exhaustive = /** @type {boolean} */ (evaluated.bool);
				} else {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'exhaustive' option must be a constant boolean (true or false), defaulting to false",
							locationOf(path, valueExpr, parser)
						)
					);
				}
				break;
			}
			case "caseSensitive": {
				const evaluated = parser.evaluateExpression(
					parser.nodeOfPath(path, valueExpr)
				);
				if (evaluated.isBoolean()) {
					caseSensitive = /** @type {boolean} */ (evaluated.bool);
				} else {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'caseSensitive' option must be a constant boolean (true or false), defaulting to true",
							locationOf(path, valueExpr, parser)
						)
					);
				}
				break;
			}
			case "as":
				warnings.push(
					createImportMetaGlobWarning(
						"import.meta.glob() 'as' option is not supported. Use 'query' instead (e.g. { query: '?raw' })",
						locationOf(path, prop, parser)
					)
				);
				break;
			default:
				warnings.push(
					createImportMetaGlobWarning(
						`import.meta.glob() unsupported option '${key}'. Supported options are: ${SUPPORTED_IMPORT_META_GLOB_OPTIONS}`,
						locationOf(path, prop, parser)
					)
				);
		}
	}

	return { eager, importName, query, base, exhaustive, caseSensitive };
};

/**
 * @param {string} pattern pattern
 * @param {string} baseContext base context
 * @param {string} compilerContext compiler context
 * @returns {string} normalized pattern
 */
const normalizeBaseGlobPattern = (pattern, baseContext, compilerContext) => {
	let negative = false;
	let normalizedPattern = pattern;
	if (normalizedPattern.startsWith("!")) {
		negative = true;
		normalizedPattern = normalizedPattern.slice(1);
	}
	normalizedPattern = normalizePathSeparators(normalizedPattern);
	if (!normalizedPattern.startsWith("/")) {
		return negative ? `!${normalizedPattern}` : normalizedPattern;
	}
	const normalizedCompilerContext =
		normalizePathSeparatorsForPath(compilerContext);
	const absolutePattern = joinImportMetaGlobPath(
		normalizedCompilerContext,
		normalizedPattern.slice(1)
	);
	const relativePattern = absolutePathToGlobRequest(
		baseContext,
		absolutePattern
	);
	return negative ? `!${relativePattern}` : relativePattern;
};

/**
 * @param {string} context context
 * @param {string} absolutePath absolute path
 * @returns {string} glob request
 */
const absolutePathToGlobRequest = (context, absolutePath) => {
	const relativePath = path.posix.relative(context, absolutePath);
	const normalizedPath = normalizePathSeparatorsForPath(relativePath);
	return relativePathToRequest(normalizedPath);
};

/**
 * @param {string[]} patterns patterns
 * @param {string} baseContext base context
 * @param {string} compilerContext compiler context
 * @param {boolean} hasCustomBase has custom base
 * @returns {string[]} normalized patterns
 */
const normalizeImportMetaGlobPatterns = (
	patterns,
	baseContext,
	compilerContext,
	hasCustomBase
) => {
	if (!hasCustomBase) return patterns;
	return patterns.map((pattern) =>
		normalizeBaseGlobPattern(pattern, baseContext, compilerContext)
	);
};

/**
 * @param {string} context context
 * @param {string} compilerContext compiler context
 * @param {string | undefined} base base
 * @returns {string} resolved context
 */
const resolveImportMetaGlobContext = (context, compilerContext, base) => {
	if (!base) return context;
	const normalizedBase = normalizePathSeparatorsForPath(base);
	const [baseContext, pathToJoin] = importMetaGlobPathParts(
		context,
		compilerContext,
		normalizedBase
	);
	return joinImportMetaGlobFsPath(baseContext, pathToJoin);
};

/**
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} node the `import.meta.glob(...)` call
 * @param {JavascriptParser} parser parser
 * @returns {{ options: ParsedImportMetaGlobOptions | undefined, errors: WebpackError[], warnings: UnsupportedFeatureWarning[] }} parse result
 */
const parseImportMetaGlobCall = (path, node, parser) => {
	/** @type {WebpackError[]} */
	const errors = [];
	/** @type {UnsupportedFeatureWarning[]} */
	const warnings = [];
	const callLoc = locationOf(path, node, parser);
	const argumentCount = path.fieldCount(Field.arguments, node);

	if (argumentCount < 1 || argumentCount > 2) {
		errors.push(
			createImportMetaGlobError(
				"import.meta.glob() requires 1 or 2 arguments",
				callLoc
			)
		);
		return { options: undefined, errors, warnings };
	}

	const directoryNode = path.field(0, Field.arguments, node);
	if (path.type(directoryNode) === NodeType.SpreadElement) {
		warnings.push(
			createImportMetaGlobWarning(
				"import.meta.glob() first argument must be a string literal or array of string literals",
				locationOf(path, directoryNode, parser)
			)
		);
		return { options: undefined, errors, warnings };
	}

	const rawGlobPatterns = parseStaticGlobPatternsFromExpr(
		path,
		directoryNode,
		parser,
		warnings
	);
	if (!rawGlobPatterns) {
		return { options: undefined, errors, warnings };
	}

	for (const pattern of rawGlobPatterns) {
		const body = pattern.startsWith("!") ? pattern.slice(1) : pattern;
		if (
			!body.startsWith("/") &&
			!body.startsWith("./") &&
			!body.startsWith("../") &&
			!body.startsWith("**")
		) {
			warnings.push(
				createImportMetaGlobWarning(
					`import.meta.glob() pattern '${pattern}' must be relative (start with './' or '../'), absolute (start with '/'), or a globstar ('**'); aliases are not resolved`,
					locationOf(path, directoryNode, parser)
				)
			);
		}
	}

	const optionsNode =
		argumentCount > 1 ? path.field(1, Field.arguments, node) : 0;
	const optionsType = optionsNode === 0 ? 0 : path.type(optionsNode);
	if (optionsNode !== 0) {
		if (optionsType === NodeType.SpreadElement) {
			errors.push(
				createImportMetaGlobError(
					"import.meta.glob() second argument must be an object literal",
					locationOf(path, optionsNode, parser)
				)
			);
			return { options: undefined, errors, warnings };
		}
		if (optionsType !== NodeType.ObjectExpression) {
			errors.push(
				createImportMetaGlobError(
					"import.meta.glob() second argument must be an object literal",
					locationOf(path, optionsNode, parser)
				)
			);
			return { options: undefined, errors, warnings };
		}
	}

	const importerContext = parser.state.module.context;
	if (importerContext === null || importerContext === undefined) {
		return { options: undefined, errors, warnings };
	}
	const compilerContext = parser.state.compilation.compiler.context;
	const globOptions =
		optionsType === NodeType.ObjectExpression ? optionsNode : 0;
	const { eager, importName, query, base, exhaustive, caseSensitive } =
		parseImportMetaGlobOptionsObject(path, globOptions, parser, warnings);
	/** @type {ContextModuleOptions["mode"]} */
	const mode = eager ? "sync" : "lazy";
	const requestContext = resolveImportMetaGlobContext(
		importerContext,
		compilerContext,
		base
	);
	const patterns = normalizeImportMetaGlobPatterns(
		rawGlobPatterns,
		requestContext,
		compilerContext,
		base !== undefined
	);

	const resolvedPatterns = patterns.map((pattern) =>
		resolveContextModuleGlobPattern(pattern, requestContext, compilerContext)
	);
	const baseDir = commonGlobBaseDir(resolvedPatterns, requestContext);
	const recursive = globPatternsAreRecursive(resolvedPatterns, baseDir);
	/** @type {RawReferencedExports | undefined} */
	let referencedExports;
	if (importName && importName !== "*") {
		referencedExports = [[importName]];
	}
	return {
		options: {
			patterns,
			requestContext,
			baseDir,
			recursive,
			mode,
			importName,
			query,
			exhaustive,
			caseSensitive,
			referencedExports,
			range: path.range(node)
		},
		errors,
		warnings
	};
};

module.exports = {
	parseImportMetaGlobCall
};
