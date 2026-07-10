/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const path = require("path");
const { join: joinPath } = require("./fs");
const memoize = require("./memoize");

// watchpack is only needed at watch time otherwise; load its glob core lazily
const getGlobToRegExpSource = memoize(
	() =>
		/** @type {{ util: { globToRegExp: (glob: string) => string } }} */ (
			/** @type {unknown} */ (require("watchpack"))
		).util.globToRegExp
);

/** @typedef {{ caseSensitive?: boolean, requireLiteralLeadingDot?: boolean }} GlobMatchOptions */

/**
 * @param {string} s string
 * @returns {string} escaped glob pattern
 */
const escapeGlobPattern = (s) => {
	let result = "";
	for (const c of s) {
		result +=
			c === "*" || c === "?" || c === "[" || c === "]" || c === "{" || c === "}"
				? `\\${c}`
				: c;
	}
	return result;
};

/**
 * @param {string} s string
 * @returns {string} normalized path separators for glob patterns
 */
const normalizePathSeparators = (s) => {
	let result = "";
	const chars = [...s];
	for (let i = 0; i < chars.length; i++) {
		const c = chars[i];
		if (c === "\\") {
			const next = chars[i + 1];
			if (
				next === "*" ||
				next === "?" ||
				next === "[" ||
				next === "]" ||
				next === "{" ||
				next === "}"
			) {
				result += c;
			} else {
				result += "/";
			}
		} else {
			result += c;
		}
	}
	return result;
};

/**
 * @param {string} s string
 * @returns {string} normalized path separators for filesystem paths
 */
const normalizePathSeparatorsForPath = (s) => s.replace(/\\/g, "/");

/**
 * @param {string} s string
 * @returns {string} unescaped glob path
 */
const unescapeGlobPath = (s) => {
	let result = "";
	const chars = [...s];
	for (let i = 0; i < chars.length; i++) {
		const c = chars[i];
		if (c === "\\") {
			const next = chars[i + 1];
			if (
				next === "*" ||
				next === "?" ||
				next === "[" ||
				next === "]" ||
				next === "{" ||
				next === "}"
			) {
				result += next;
				i++;
			} else {
				result += c;
			}
		} else {
			result += c;
		}
	}
	return result;
};

/**
 * @param {string} c character
 * @returns {boolean} is glob metacharacter
 */
const isGlobMetacharacter = (c) =>
	c === "*" || c === "?" || c === "[" || c === "{";

/**
 * @param {string} pattern pattern
 * @returns {number} end index of base directory
 */
const globBaseDirEnd = (pattern) => {
	let escaped = false;
	let idx = pattern.length;
	for (let byteIdx = 0; byteIdx < pattern.length; byteIdx++) {
		const c = pattern[byteIdx];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (c === "\\") {
			escaped = true;
			continue;
		}
		if (isGlobMetacharacter(c)) {
			idx = byteIdx;
			break;
		}
	}
	const slashIdx = pattern.lastIndexOf("/", idx - 1);
	return slashIdx === -1 ? 0 : slashIdx + 1;
};

/**
 * @param {string} pattern pattern
 * @returns {string} base directory
 */
const extractGlobBaseDir = (pattern) => {
	const end = globBaseDirEnd(pattern);
	return end === 0 ? "./" : pattern.slice(0, end);
};

/**
 * @param {string} c character
 * @returns {string} regexp-escaped character
 */
const quoteRegExpChar = (c) => (/[$()*+\-./?[\\\]^{|}]/.test(c) ? `\\${c}` : c);

/**
 * Expands `{a,b}` alternations (escape- and class-aware, nested) into
 * brace-free globs; unmatched braces are kept as literal characters.
 * @param {string} glob glob
 * @returns {string[]} brace-free globs
 */
const expandGlobBraces = (glob) => {
	let braceStart = -1;
	let braceEnd = -1;
	let depth = 0;
	for (let i = 0; i < glob.length; i++) {
		const c = glob[i];
		if (c === "\\") {
			i++;
		} else if (c === "[") {
			while (i + 1 < glob.length && glob[i + 1] !== "]") {
				i += glob[i + 1] === "\\" ? 2 : 1;
			}
			i++;
		} else if (c === "{") {
			if (depth === 0) braceStart = i;
			depth++;
		} else if (c === "}") {
			if (depth === 0) {
				return expandGlobBraces(`${glob.slice(0, i)}\\}${glob.slice(i + 1)}`);
			}
			if (--depth === 0) {
				braceEnd = i;
				break;
			}
		}
	}
	if (braceStart === -1) return [glob];
	if (braceEnd === -1) {
		return expandGlobBraces(
			`${glob.slice(0, braceStart)}\\{${glob.slice(braceStart + 1)}`
		);
	}
	const prefix = glob.slice(0, braceStart);
	const suffix = glob.slice(braceEnd + 1);
	const inner = glob.slice(braceStart + 1, braceEnd);
	/** @type {string[]} */
	const alternatives = [];
	let altStart = 0;
	let altDepth = 0;
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i];
		if (c === "\\") {
			i++;
		} else if (c === "[") {
			while (i + 1 < inner.length && inner[i + 1] !== "]") {
				i += inner[i + 1] === "\\" ? 2 : 1;
			}
			i++;
		} else if (c === "{") {
			altDepth++;
		} else if (c === "}") {
			altDepth--;
		} else if (c === "," && altDepth === 0) {
			alternatives.push(inner.slice(altStart, i));
			altStart = i + 1;
		}
	}
	alternatives.push(inner.slice(altStart));
	/** @type {string[]} */
	const result = [];
	for (const alt of alternatives) {
		for (const expanded of expandGlobBraces(`${prefix}${alt}${suffix}`)) {
			result.push(expanded);
		}
	}
	return result;
};

/**
 * watchpack compiles `?` to a bare `.` (its only unescaped dot in runs
 * without classes); restrict it to a single non-separator character.
 * @param {string} source regexp source
 * @returns {string} fixed regexp source
 */
const fixupGlobRegExpSource = (source) =>
	source.replace(/\\[\s\S]|\./g, (m) => (m === "." ? "[^/]" : m));

/**
 * Converts a brace-free glob into a regexp source. Escapes and character
 * classes are translated here (watchpack mishandles `?`/`!` inside classes);
 * remaining runs go through watchpack's glob-to-regexp core.
 * @param {string} glob brace-free glob
 * @returns {string} regexp source without anchors
 */
const braceFreeGlobToRegExpSource = (glob) => {
	const globToRegExpSource = getGlobToRegExpSource();
	let source = "";
	let runStart = 0;
	/**
	 * @param {number} end run end index
	 */
	const flushRun = (end) => {
		if (runStart < end) {
			source += fixupGlobRegExpSource(
				globToRegExpSource(glob.slice(runStart, end))
			);
		}
	};
	for (let i = 0; i < glob.length; i++) {
		const c = glob[i];
		if (c === "\\") {
			flushRun(i);
			source += quoteRegExpChar(i + 1 < glob.length ? glob[i + 1] : "\\");
			i++;
			runStart = i + 1;
		} else if (c === "[") {
			let end = i + 1;
			let negated = false;
			if (glob[end] === "!" || glob[end] === "^") {
				negated = true;
				end++;
			}
			const bodyStart = end;
			while (end < glob.length && glob[end] !== "]") {
				end += glob[end] === "\\" ? 2 : 1;
			}
			flushRun(i);
			if (end >= glob.length) {
				// unterminated class: literal `[`
				source += "\\[";
				runStart = i + 1;
				continue;
			}
			let body = "";
			for (let j = bodyStart; j < end; j++) {
				const bc = glob[j];
				if (bc === "\\" && j + 1 < end) {
					body += quoteRegExpChar(glob[j + 1]);
					j++;
				} else if (bc === "]" || bc === "\\" || bc === "[") {
					body += `\\${bc}`;
				} else {
					body += bc;
				}
			}
			// negated glob classes must not cross a path separator
			source += `[${negated ? "^/" : ""}${body}]`;
			i = end;
			runStart = end + 1;
		}
	}
	flushRun(glob.length);
	return source;
};

/**
 * @param {string} pattern glob pattern
 * @param {boolean} caseSensitive case sensitive
 * @returns {RegExp | null} anchored regexp, null for un-compilable patterns
 */
const globToRegExp = (pattern, caseSensitive) => {
	const sources = expandGlobBraces(pattern).map(braceFreeGlobToRegExpSource);
	const source = sources.length === 1 ? sources[0] : `(?:${sources.join("|")})`;
	try {
		return new RegExp(`^${source}$`, caseSensitive ? "" : "i");
	} catch (_err) {
		return null;
	}
};

/**
 * @param {string} pattern pattern
 * @param {string} str path
 * @param {GlobMatchOptions=} options options
 * @returns {boolean} matches
 */
const globMatchWithOptions = (pattern, str, options = {}) => {
	const regexp = globToRegExp(pattern, options.caseSensitive !== false);
	return regexp !== null && regexp.test(str);
};

/**
 * @param {string} path path
 * @param {string} baseDir base directory
 * @returns {boolean} has dot component
 */
const pathHasDotComponent = (path, baseDir) => {
	const relative = path.startsWith(baseDir) ? path.slice(baseDir.length) : path;
	for (const segment of relative.split("/").filter(Boolean)) {
		if (segment.startsWith(".")) return true;
	}
	return false;
};

/**
 * @param {string[]} patterns pattern segments
 * @param {string[]} paths path segments
 * @param {GlobMatchOptions} options options
 * @returns {boolean} matches
 */
const matchesExplicitDotSegments = (patterns, paths, options) => {
	if (patterns.length === 0) return paths.length === 0;
	if (paths.length === 0) return false;
	const [patternHead, ...patternRest] = patterns;
	const [pathHead, ...pathRest] = paths;
	if (patternHead === "**") {
		return (
			matchesExplicitDotSegments(patternRest, paths, options) ||
			(!pathHead.startsWith(".") &&
				matchesExplicitDotSegments(patterns, pathRest, options))
		);
	}
	if (pathHead.startsWith(".") && !patternHead.startsWith(".")) {
		return false;
	}
	return (
		globMatchWithOptions(patternHead, pathHead, options) &&
		matchesExplicitDotSegments(patternRest, pathRest, options)
	);
};

/**
 * @param {string} pattern pattern
 * @param {string} baseDir base directory
 * @param {string} path path
 * @param {GlobMatchOptions} options options
 * @returns {boolean} has explicit dot
 */
const patternHasExplicitDotFor = (pattern, baseDir, path, options) => {
	const escapedBaseDir = escapeGlobPattern(baseDir);
	const patternSuffix =
		(pattern.startsWith(baseDir) && pattern.slice(baseDir.length)) ||
		(pattern.startsWith(escapedBaseDir) &&
			pattern.slice(escapedBaseDir.length)) ||
		pattern;
	const relative = path.startsWith(baseDir) ? path.slice(baseDir.length) : path;
	const patternSegments = patternSuffix.split("/").filter(Boolean);
	const pathSegments = relative.split("/").filter(Boolean);
	return matchesExplicitDotSegments(patternSegments, pathSegments, options);
};

/**
 * @param {string} pattern pattern
 * @param {string} path path
 * @param {string} baseDir base directory
 * @param {GlobMatchOptions=} options options
 * @returns {boolean} matches
 */
const globMatchWithExplicitDot = (pattern, path, baseDir, options = {}) => {
	const normalizedPattern = normalizePathSeparators(pattern);
	const normalizedPath = normalizePathSeparatorsForPath(path);
	const normalizedBaseDir = normalizePathSeparatorsForPath(baseDir);
	return globMatchNormalizedWithExplicitDot(
		normalizedPattern,
		normalizedPath,
		normalizedBaseDir,
		options
	);
};

/**
 * @param {string} normalizedPattern pattern
 * @param {string} normalizedPath path
 * @param {string} normalizedBaseDir base directory
 * @param {GlobMatchOptions=} options options
 * @returns {boolean} matches
 */
const globMatchNormalizedWithExplicitDot = (
	normalizedPattern,
	normalizedPath,
	normalizedBaseDir,
	options = {}
) => {
	const requireLiteralLeadingDot = options.requireLiteralLeadingDot !== false;
	if (
		requireLiteralLeadingDot &&
		pathHasDotComponent(normalizedPath, normalizedBaseDir) &&
		!patternHasExplicitDotFor(
			normalizedPattern,
			normalizedBaseDir,
			normalizedPath,
			options
		)
	) {
		return false;
	}
	return globMatchWithOptions(normalizedPattern, normalizedPath, options);
};

/**
 * @param {string} base base path
 * @param {string} subPath sub path
 * @returns {string} joined path
 */
const joinImportMetaGlobPath = (base, subPath) => {
	let normalizedSubPath = normalizePathSeparators(subPath);
	if (normalizedSubPath.startsWith("./")) {
		normalizedSubPath = normalizedSubPath.slice(2);
	}
	if (base.endsWith("/")) {
		return normalizePathSeparators(`${base}${normalizedSubPath}`);
	}
	return normalizePathSeparators(`${base}/${normalizedSubPath}`);
};

/**
 * @param {string} base base path
 * @param {string} subPath sub path
 * @returns {string} joined filesystem path
 */
const joinImportMetaGlobFsPath = (base, subPath) =>
	normalizePathSeparatorsForPath(joinPath(undefined, base, subPath));

/**
 * @param {string} context context
 * @param {string} compilerContext compiler context
 * @param {string} globPath path
 * @returns {[string, string]} base and path parts
 */
const importMetaGlobPathParts = (context, compilerContext, globPath) => {
	if (globPath.startsWith("/")) {
		return [compilerContext, globPath.slice(1)];
	}
	return [context, globPath];
};

/**
 * @typedef {object} ResolvedContextModuleGlobPattern
 * @property {string} absolutePattern
 * @property {string} base
 * @property {string} absoluteBase
 * @property {boolean} negative
 */

/**
 * @param {string} pattern pattern
 * @param {string} context context
 * @param {string} commonBase common base
 * @returns {ResolvedContextModuleGlobPattern} resolved pattern
 */
const resolveContextModuleGlobPattern = (pattern, context, commonBase) => {
	let negative = false;
	let normalizedPattern = pattern;
	if (normalizedPattern.startsWith("!")) {
		negative = true;
		normalizedPattern = normalizedPattern.slice(1);
	}
	normalizedPattern = normalizePathSeparators(normalizedPattern);
	/** @type {string} */
	let base;
	/** @type {string} */
	let patternToJoin;
	if (normalizedPattern.startsWith("/")) {
		base = inferGlobRootContext(
			commonBase,
			extractGlobBaseDir(normalizedPattern.slice(1))
		);
		patternToJoin = normalizedPattern.slice(1);
	} else {
		base = context || commonBase;
		patternToJoin = normalizedPattern;
	}
	base = normalizePathSeparatorsForPath(base);
	const escapedBase = escapeGlobPattern(base);
	const absolutePattern = normalizePathSeparators(
		path.posix.normalize(path.posix.join(escapedBase, patternToJoin))
	);
	const patternBase = extractGlobBaseDir(normalizedPattern);
	const absoluteBase = unescapeGlobPath(extractGlobBaseDir(absolutePattern));
	return {
		absolutePattern,
		base: patternBase,
		absoluteBase,
		negative
	};
};

/**
 * @param {string} commonBase common base
 * @param {string} patternBase pattern base
 * @returns {string} inferred root context
 */
const inferGlobRootContext = (commonBase, patternBase) => {
	let normalizedCommonBase = normalizePathSeparatorsForPath(commonBase);
	if (!normalizedCommonBase.endsWith("/")) {
		normalizedCommonBase += "/";
	}
	const trimmedPatternBase = patternBase.replace(/^\/+/, "");
	let matchedLen = 0;
	const indices = [];
	for (let i = 0; i <= trimmedPatternBase.length; i++) {
		indices.push(i);
	}
	for (const idx of indices) {
		if (
			!trimmedPatternBase.slice(0, idx).endsWith("/") &&
			idx !== trimmedPatternBase.length
		) {
			continue;
		}
		if (normalizedCommonBase.endsWith(trimmedPatternBase.slice(0, idx))) {
			matchedLen = idx;
		}
	}
	return normalizedCommonBase.slice(
		0,
		normalizedCommonBase.length - matchedLen
	);
};

/**
 * @param {ResolvedContextModuleGlobPattern[]} patterns patterns
 * @param {string} fallback fallback
 * @returns {string} common base directory
 */
const commonGlobBaseDir = (patterns, fallback) => {
	const positivePatterns = patterns.filter((p) => !p.negative);
	if (positivePatterns.length === 0) return fallback;
	let commonBase = positivePatterns[0].absoluteBase;
	for (const pattern of positivePatterns.slice(1)) {
		const base = pattern.absoluteBase;
		while (!base.startsWith(commonBase)) {
			const parent = path.posix.dirname(commonBase);
			if (parent === commonBase) return fallback;
			commonBase = parent.endsWith("/") ? parent : `${parent}/`;
		}
	}
	return commonBase.endsWith("/")
		? normalizePathSeparatorsForPath(commonBase)
		: normalizePathSeparatorsForPath(`${commonBase}/`);
};

/**
 * @param {ResolvedContextModuleGlobPattern} pattern pattern
 * @param {string} normalizedPath path
 * @param {boolean} exhaustive exhaustive
 * @param {boolean} caseSensitive case sensitive
 * @returns {boolean} matches
 */
const globPatternMatches = (
	pattern,
	normalizedPath,
	exhaustive,
	caseSensitive
) =>
	globMatchNormalizedWithExplicitDot(
		pattern.absolutePattern,
		normalizedPath,
		pattern.absoluteBase,
		{ requireLiteralLeadingDot: !exhaustive, caseSensitive }
	);

/**
 * @param {ResolvedContextModuleGlobPattern[]} patterns patterns
 * @param {string} filePath path
 * @param {boolean} exhaustive exhaustive
 * @param {boolean=} caseSensitive case sensitive (default true)
 * @returns {string | undefined} user request
 */
const globUserRequest = (
	patterns,
	filePath,
	exhaustive,
	caseSensitive = true
) => {
	const normalizedPath = normalizePathSeparatorsForPath(filePath);
	const matched = patterns
		.filter((pattern) => !pattern.negative)
		.find((pattern) =>
			globPatternMatches(pattern, normalizedPath, exhaustive, caseSensitive)
		);
	if (!matched) return;
	if (
		patterns
			.filter((pattern) => pattern.negative)
			.some((pattern) =>
				globPatternMatches(pattern, normalizedPath, exhaustive, caseSensitive)
			)
	) {
		return;
	}
	const suffix = (
		normalizedPath.startsWith(matched.absoluteBase)
			? normalizedPath.slice(matched.absoluteBase.length)
			: normalizedPath
	).replace(/^\/+/, "");
	return joinImportMetaGlobPath(matched.base, suffix);
};

/**
 * @param {ResolvedContextModuleGlobPattern[]} patterns patterns
 * @param {string} commonBaseDir common base
 * @returns {boolean} recursive
 */
const globPatternsAreRecursive = (patterns, commonBaseDir) => {
	const normalizedCommonBase = normalizePathSeparatorsForPath(commonBaseDir);
	const normalizedBase = normalizedCommonBase.endsWith("/")
		? normalizedCommonBase
		: `${normalizedCommonBase}/`;
	return patterns
		.filter((pattern) => !pattern.negative)
		.some((pattern) => {
			const unescapedPattern = unescapeGlobPath(pattern.absolutePattern);
			if (unescapedPattern.includes("**")) return true;
			const suffix = unescapedPattern.startsWith(normalizedBase)
				? unescapedPattern.slice(normalizedBase.length)
				: unescapedPattern.startsWith(normalizedCommonBase)
					? unescapedPattern.slice(normalizedCommonBase.length)
					: unescapedPattern;
			return suffix.includes("/");
		});
};

/**
 * @param {string} dirname directory name
 * @returns {boolean} skipped in non-exhaustive mode
 */
const isNonExhaustiveImportMetaGlobSkippedDir = (dirname) =>
	dirname === "node_modules" || dirname.startsWith(".");

/**
 * A dot/node_modules directory is still traversed in non-exhaustive mode when
 * it lies within the literal base of some positive pattern — the user named it
 * explicitly — so combined patterns behave like that pattern used alone.
 * @param {ResolvedContextModuleGlobPattern[]} patterns patterns
 * @param {string} dirPath absolute directory path
 * @returns {boolean} directory is within a positive pattern's literal base
 */
const globPatternBaseReachesDir = (patterns, dirPath) => {
	const normalizedDir = normalizePathSeparatorsForPath(dirPath);
	const dirWithSlash = normalizedDir.endsWith("/")
		? normalizedDir
		: `${normalizedDir}/`;
	return patterns.some((pattern) => {
		if (pattern.negative) return false;
		const base = pattern.absoluteBase.endsWith("/")
			? pattern.absoluteBase
			: `${pattern.absoluteBase}/`;
		return base.startsWith(dirWithSlash);
	});
};

module.exports = {
	commonGlobBaseDir,
	escapeGlobPattern,
	extractGlobBaseDir,
	globMatchNormalizedWithExplicitDot,
	globMatchWithExplicitDot,
	globMatchWithOptions,
	globPatternBaseReachesDir,
	globPatternsAreRecursive,
	globUserRequest,
	importMetaGlobPathParts,
	inferGlobRootContext,
	isNonExhaustiveImportMetaGlobSkippedDir,
	joinImportMetaGlobFsPath,
	joinImportMetaGlobPath,
	normalizePathSeparators,
	normalizePathSeparatorsForPath,
	patternHasExplicitDotFor,
	resolveContextModuleGlobPattern,
	unescapeGlobPath
};
