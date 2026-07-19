/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const path = require("path");
const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");
const WebpackError = require("../errors/WebpackError");
const {
	commonGlobBaseDir,
	globPatternsAreRecursive,
	importMetaGlobPathParts,
	joinImportMetaGlobFsPath,
	joinImportMetaGlobPath,
	normalizePathSeparators,
	normalizePathSeparatorsForPath,
	resolveContextModuleGlobPattern
} = require("../util/globUtils");

/**
 * @param {string} relativePath relative path
 * @returns {string} request
 */
const relativePathToRequest = (relativePath) => {
	if (relativePath === "") return "./.";
	if (relativePath === "..") return "../.";
	if (relativePath.startsWith("../")) return relativePath;
	return `./${relativePath}`;
};

/** @typedef {import("../ContextModule").ContextModuleOptions} ContextModuleOptions */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../Dependency").RawReferencedExports} RawReferencedExports */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("./ImportMetaGlobDependency").ImportMetaGlobDependencyOptions} ImportMetaGlobDependencyOptions */

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
	new UnsupportedFeatureWarning(msg, loc);

/**
 * @param {Expression} expr expression
 * @param {JavascriptParser} parser parser
 * @returns {string | undefined} static string
 */
const staticStringFromExpr = (expr, parser) => {
	const evaluated = parser.evaluateExpression(expr);
	if (evaluated.isString()) {
		return /** @type {string} */ (evaluated.string);
	}
	if (expr.type === "TemplateLiteral" && expr.expressions.length === 0) {
		const cooked = /** @type {import("estree").TemplateElement} */ (
			expr.quasis[0]
		).value.cooked;
		if (cooked !== null && cooked !== undefined) return cooked;
	}
};

/**
 * @param {import("estree").Property["key"]} propName property name
 * @returns {string | undefined} key
 */
const staticOptionKeyFromPropName = (propName) => {
	if (propName.type === "Identifier") return propName.name;
	if (propName.type === "Literal" && typeof propName.value === "string") {
		return propName.value;
	}
};

/**
 * @param {Expression} expr expression
 * @param {JavascriptParser} parser parser
 * @param {UnsupportedFeatureWarning[]} warnings warnings
 * @returns {string[] | undefined} glob patterns
 */
const parseStaticGlobPatternsFromExpr = (expr, parser, warnings) => {
	const single = staticStringFromExpr(expr, parser);
	if (single !== undefined) return [single];
	if (expr.type !== "ArrayExpression") {
		warnings.push(
			createImportMetaGlobWarning(
				"import.meta.glob() first argument must be a string literal or array of string literals",
				parser.getLocation(expr)
			)
		);
		return;
	}
	/** @type {string[]} */
	const patterns = [];
	for (const elem of expr.elements) {
		if (!elem) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					parser.getLocation(expr)
				)
			);
			return;
		}
		if (elem.type === "SpreadElement") {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					parser.getLocation(elem)
				)
			);
			return;
		}
		const pattern = staticStringFromExpr(elem, parser);
		if (pattern === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					parser.getLocation(elem)
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
				parser.getLocation(expr)
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
 * @param {import("estree").Property["key"]} propName property name
 * @param {JavascriptParser} parser parser
 * @returns {string | undefined} key
 */
const staticImportMetaGlobQueryKeyFromPropName = (propName, parser) => {
	if (propName.type === "Identifier") return propName.name;
	if (propName.type === "Literal") {
		if (typeof propName.value === "string") return propName.value;
		if (typeof propName.value === "number") return String(propName.value);
		if (typeof propName.value === "boolean") return String(propName.value);
	}
	const keyNode = /** @type {unknown} */ (propName);
	if (
		typeof keyNode === "object" &&
		keyNode !== null &&
		"type" in keyNode &&
		keyNode.type === "Computed" &&
		"expression" in keyNode
	) {
		return staticImportMetaGlobQueryKeyFromExpr(
			/** @type {Expression} */ (keyNode.expression),
			parser
		);
	}
};

/**
 * @param {Expression} expr expression
 * @param {JavascriptParser} parser parser
 * @returns {string | undefined} key
 */
const staticImportMetaGlobQueryKeyFromExpr = (expr, parser) => {
	const str = staticStringFromExpr(expr, parser);
	if (str !== undefined) return str;
	if (expr.type === "Literal") {
		if (typeof expr.value === "number") return String(expr.value);
		if (typeof expr.value === "boolean") return String(expr.value);
		if (expr.value === null) return "null";
	}
};

/**
 * @param {Expression} expr expression
 * @param {JavascriptParser} parser parser
 * @param {UnsupportedFeatureWarning[]} warnings warnings
 * @returns {string | undefined} query
 */
const parseStaticImportMetaGlobQueryFromExpr = (expr, parser, warnings) => {
	const query = staticStringFromExpr(expr, parser);
	if (query !== undefined) return normalizeImportMetaGlobQuery(query);
	if (expr.type !== "ObjectExpression") {
		warnings.push(
			createImportMetaGlobWarning(
				"import.meta.glob() 'query' option must be a constant string or object",
				parser.getLocation(expr)
			)
		);
		return;
	}
	const params = new URLSearchParams();
	for (const prop of expr.properties) {
		if (prop.type !== "Property") {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() 'query' object must only contain constant key-value pairs",
					parser.getLocation(expr)
				)
			);
			return;
		}
		const key = staticImportMetaGlobQueryKeyFromPropName(prop.key, parser);
		if (key === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() 'query' object keys must be constant strings",
					parser.getLocation(prop.key)
				)
			);
			return;
		}
		const valueExpr = /** @type {Expression} */ (prop.value);
		const valueStr = staticStringFromExpr(valueExpr, parser);
		if (valueStr !== undefined) {
			params.append(key, valueStr);
		} else if (valueExpr.type === "Literal") {
			if (typeof valueExpr.value === "boolean") {
				params.append(key, String(valueExpr.value));
			} else if (typeof valueExpr.value === "number") {
				params.append(key, String(valueExpr.value));
			} else {
				warnings.push(
					createImportMetaGlobWarning(
						`import.meta.glob() 'query' object value for key '${key}' must be a constant string or boolean`,
						parser.getLocation(valueExpr)
					)
				);
				return;
			}
		} else {
			warnings.push(
				createImportMetaGlobWarning(
					`import.meta.glob() 'query' object value for key '${key}' must be a constant string or boolean`,
					parser.getLocation(valueExpr)
				)
			);
			return;
		}
	}
	return normalizeImportMetaGlobQuery(params.toString());
};

/**
 * @param {ObjectExpression | undefined} globOptions options object
 * @param {JavascriptParser} parser parser
 * @param {UnsupportedFeatureWarning[]} warnings warnings
 * @returns {{ eager: boolean, importName: string | undefined, query: string, base: string | undefined, exhaustive: boolean, caseSensitive: boolean }} parsed options
 */
const parseImportMetaGlobOptionsObject = (globOptions, parser, warnings) => {
	let eager = false;
	/** @type {string | undefined} */
	let importName;
	let query = "";
	/** @type {string | undefined} */
	let base;
	let exhaustive = false;
	let caseSensitive = true;

	if (!globOptions) {
		return { eager, importName, query, base, exhaustive, caseSensitive };
	}

	for (const prop of globOptions.properties) {
		if (prop.type !== "Property") {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() options object must only contain constant key-value pairs",
					parser.getLocation(globOptions)
				)
			);
			continue;
		}
		if (prop.computed) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() option keys must be constant strings",
					parser.getLocation(prop.key)
				)
			);
			continue;
		}
		const key = staticOptionKeyFromPropName(prop.key);
		if (key === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() option keys must be constant strings",
					parser.getLocation(prop.key)
				)
			);
			continue;
		}
		const valueExpr = /** @type {Expression} */ (prop.value);
		switch (key) {
			case "eager": {
				const evaluated = parser.evaluateExpression(valueExpr);
				if (evaluated.isBoolean()) {
					eager = /** @type {boolean} */ (evaluated.bool);
				} else {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'eager' option must be a constant boolean (true or false), defaulting to false",
							parser.getLocation(valueExpr)
						)
					);
				}
				break;
			}
			case "import": {
				const importOption = staticStringFromExpr(valueExpr, parser);
				if (importOption === undefined) {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'import' option must be a constant string, ignoring",
							parser.getLocation(valueExpr)
						)
					);
				} else if (importOption !== "*") {
					importName = importOption;
				}
				break;
			}
			case "query": {
				const queryValue = parseStaticImportMetaGlobQueryFromExpr(
					valueExpr,
					parser,
					warnings
				);
				if (queryValue !== undefined) query = queryValue;
				break;
			}
			case "base": {
				const baseValue = staticStringFromExpr(valueExpr, parser);
				if (baseValue === undefined) {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'base' option must be a constant string, ignoring",
							parser.getLocation(valueExpr)
						)
					);
				} else {
					base = baseValue;
				}
				break;
			}
			case "exhaustive": {
				const evaluated = parser.evaluateExpression(valueExpr);
				if (evaluated.isBoolean()) {
					exhaustive = /** @type {boolean} */ (evaluated.bool);
				} else {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'exhaustive' option must be a constant boolean (true or false), defaulting to false",
							parser.getLocation(valueExpr)
						)
					);
				}
				break;
			}
			case "caseSensitive": {
				const evaluated = parser.evaluateExpression(valueExpr);
				if (evaluated.isBoolean()) {
					caseSensitive = /** @type {boolean} */ (evaluated.bool);
				} else {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'caseSensitive' option must be a constant boolean (true or false), defaulting to true",
							parser.getLocation(valueExpr)
						)
					);
				}
				break;
			}
			case "as":
				warnings.push(
					createImportMetaGlobWarning(
						"import.meta.glob() 'as' option is not supported. Use 'query' instead (e.g. { query: '?raw' })",
						parser.getLocation(prop)
					)
				);
				break;
			default:
				warnings.push(
					createImportMetaGlobWarning(
						`import.meta.glob() unsupported option '${key}'. Supported options are: ${SUPPORTED_IMPORT_META_GLOB_OPTIONS}`,
						parser.getLocation(prop)
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
 * @param {CallExpression} expr call expression
 * @param {JavascriptParser} parser parser
 * @returns {{ options: ParsedImportMetaGlobOptions | undefined, errors: WebpackError[], warnings: UnsupportedFeatureWarning[] }} parse result
 */
const parseImportMetaGlobCall = (expr, parser) => {
	/** @type {WebpackError[]} */
	const errors = [];
	/** @type {UnsupportedFeatureWarning[]} */
	const warnings = [];
	const callLoc = parser.getLocation(expr);

	if (expr.arguments.length < 1 || expr.arguments.length > 2) {
		errors.push(
			createImportMetaGlobError(
				"import.meta.glob() requires 1 or 2 arguments",
				callLoc
			)
		);
		return { options: undefined, errors, warnings };
	}

	const directoryNode = expr.arguments[0];
	if (directoryNode.type === "SpreadElement") {
		warnings.push(
			createImportMetaGlobWarning(
				"import.meta.glob() first argument must be a string literal or array of string literals",
				parser.getLocation(directoryNode)
			)
		);
		return { options: undefined, errors, warnings };
	}

	const rawGlobPatterns = parseStaticGlobPatternsFromExpr(
		/** @type {Expression} */ (directoryNode),
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
					parser.getLocation(directoryNode)
				)
			);
		}
	}

	const optionsNode = expr.arguments[1];
	if (optionsNode) {
		if (optionsNode.type === "SpreadElement") {
			errors.push(
				createImportMetaGlobError(
					"import.meta.glob() second argument must be an object literal",
					parser.getLocation(optionsNode)
				)
			);
			return { options: undefined, errors, warnings };
		}
		if (optionsNode.type !== "ObjectExpression") {
			errors.push(
				createImportMetaGlobError(
					"import.meta.glob() second argument must be an object literal",
					parser.getLocation(optionsNode)
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
		optionsNode && optionsNode.type === "ObjectExpression"
			? /** @type {ObjectExpression} */ (optionsNode)
			: undefined;
	const { eager, importName, query, base, exhaustive, caseSensitive } =
		parseImportMetaGlobOptionsObject(globOptions, parser, warnings);
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
			range: /** @type {Range} */ (expr.range)
		},
		errors,
		warnings
	};
};

module.exports = {
	parseImportMetaGlobCall
};
