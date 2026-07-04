/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author xiaoxiaojx @xiaoxiaojx
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
/** @typedef {import("./ImportMetaContextDependency").ImportMetaGlobDependencyOptions} ImportMetaGlobDependencyOptions */

const SUPPORTED_IMPORT_META_GLOB_OPTIONS =
	"eager, import, query, base, exhaustive";

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
				/** @type {DependencyLocation} */ (expr.loc)
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
					/** @type {DependencyLocation} */ (expr.loc)
				)
			);
			return;
		}
		if (elem.type === "SpreadElement") {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					/** @type {DependencyLocation} */ (elem.loc)
				)
			);
			return;
		}
		const pattern = staticStringFromExpr(elem, parser);
		if (pattern === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() pattern array elements must be constant strings",
					/** @type {DependencyLocation} */ (elem.loc)
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
				/** @type {DependencyLocation} */ (expr.loc)
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
				/** @type {DependencyLocation} */ (expr.loc)
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
					/** @type {DependencyLocation} */ (expr.loc)
				)
			);
			return;
		}
		const key = staticImportMetaGlobQueryKeyFromPropName(prop.key, parser);
		if (key === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() 'query' object keys must be constant strings",
					/** @type {DependencyLocation} */ (prop.key.loc)
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
						/** @type {DependencyLocation} */ (valueExpr.loc)
					)
				);
				return;
			}
		} else {
			warnings.push(
				createImportMetaGlobWarning(
					`import.meta.glob() 'query' object value for key '${key}' must be a constant string or boolean`,
					/** @type {DependencyLocation} */ (valueExpr.loc)
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
 * @returns {{ eager: boolean, globImport: string | undefined, globQuery: string, base: string | undefined, globExhaustive: boolean }} parsed options
 */
const parseImportMetaGlobOptionsObject = (globOptions, parser, warnings) => {
	let eager = false;
	/** @type {string | undefined} */
	let globImport;
	let globQuery = "";
	/** @type {string | undefined} */
	let base;
	let globExhaustive = false;

	if (!globOptions) {
		return { eager, globImport, globQuery, base, globExhaustive };
	}

	for (const prop of globOptions.properties) {
		if (prop.type !== "Property") {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() options object must only contain constant key-value pairs",
					/** @type {DependencyLocation} */ (globOptions.loc)
				)
			);
			continue;
		}
		if (prop.computed) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() option keys must be constant strings",
					/** @type {DependencyLocation} */ (prop.key.loc)
				)
			);
			continue;
		}
		const key = staticOptionKeyFromPropName(prop.key);
		if (key === undefined) {
			warnings.push(
				createImportMetaGlobWarning(
					"import.meta.glob() option keys must be constant strings",
					/** @type {DependencyLocation} */ (prop.key.loc)
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
							/** @type {DependencyLocation} */ (valueExpr.loc)
						)
					);
				}
				break;
			}
			case "import": {
				const importName = staticStringFromExpr(valueExpr, parser);
				if (importName === undefined) {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'import' option must be a constant string, ignoring",
							/** @type {DependencyLocation} */ (valueExpr.loc)
						)
					);
				} else if (importName !== "*") {
					globImport = importName;
				}
				break;
			}
			case "query": {
				const query = parseStaticImportMetaGlobQueryFromExpr(
					valueExpr,
					parser,
					warnings
				);
				if (query !== undefined) globQuery = query;
				break;
			}
			case "base": {
				const baseValue = staticStringFromExpr(valueExpr, parser);
				if (baseValue === undefined) {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'base' option must be a constant string, ignoring",
							/** @type {DependencyLocation} */ (valueExpr.loc)
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
					globExhaustive = /** @type {boolean} */ (evaluated.bool);
				} else {
					warnings.push(
						createImportMetaGlobWarning(
							"import.meta.glob() 'exhaustive' option must be a constant boolean (true or false), defaulting to false",
							/** @type {DependencyLocation} */ (valueExpr.loc)
						)
					);
				}
				break;
			}
			case "as":
				warnings.push(
					createImportMetaGlobWarning(
						"import.meta.glob() 'as' option is not supported. Use 'query' instead (e.g. { query: '?raw' })",
						/** @type {DependencyLocation} */ (prop.loc)
					)
				);
				break;
			default:
				warnings.push(
					createImportMetaGlobWarning(
						`import.meta.glob() unsupported option '${key}'. Supported options are: ${SUPPORTED_IMPORT_META_GLOB_OPTIONS}`,
						/** @type {DependencyLocation} */ (prop.loc)
					)
				);
		}
	}

	return { eager, globImport, globQuery, base, globExhaustive };
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
 * @returns {{ options: ImportMetaGlobDependencyOptions | undefined, errors: WebpackError[], warnings: UnsupportedFeatureWarning[] }} parse result
 */
const parseImportMetaGlobCall = (expr, parser) => {
	/** @type {WebpackError[]} */
	const errors = [];
	/** @type {UnsupportedFeatureWarning[]} */
	const warnings = [];
	const callLoc = /** @type {DependencyLocation} */ (expr.loc);

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
				/** @type {DependencyLocation} */ (directoryNode.loc)
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

	const optionsNode = expr.arguments[1];
	if (optionsNode) {
		if (optionsNode.type === "SpreadElement") {
			errors.push(
				createImportMetaGlobError(
					"import.meta.glob() second argument must be an object literal",
					/** @type {DependencyLocation} */ (optionsNode.loc)
				)
			);
			return { options: undefined, errors, warnings };
		}
		if (optionsNode.type !== "ObjectExpression") {
			errors.push(
				createImportMetaGlobError(
					"import.meta.glob() second argument must be an object literal",
					/** @type {DependencyLocation} */ (optionsNode.loc)
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
	const { eager, globImport, globQuery, base, globExhaustive } =
		parseImportMetaGlobOptionsObject(globOptions, parser, warnings);
	/** @type {ContextModuleOptions["mode"]} */
	const mode = eager ? "sync" : "lazy";
	const context = resolveImportMetaGlobContext(
		importerContext,
		compilerContext,
		base
	);
	const globPatterns = normalizeImportMetaGlobPatterns(
		rawGlobPatterns,
		context,
		compilerContext,
		base !== undefined
	);

	const resolvedGlobPatterns = globPatterns.map((pattern) =>
		resolveContextModuleGlobPattern(pattern, context, compilerContext)
	);
	const baseDir = commonGlobBaseDir(resolvedGlobPatterns, context);
	const recursive = globPatternsAreRecursive(resolvedGlobPatterns, baseDir);
	/** @type {RawReferencedExports | undefined} */
	let referencedExports;
	if (globImport && globImport !== "*") {
		referencedExports = [[globImport]];
	}
	return {
		options: {
			globPatterns,
			resolvedGlobPatterns,
			context,
			baseDir,
			recursive,
			mode,
			globImport,
			globQuery,
			globExhaustive,
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
