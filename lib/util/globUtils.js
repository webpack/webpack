/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author xiaoxiaojx @xiaoxiaojx
*/

"use strict";

const path = require("path");
const { join: joinPath } = require("./fs");

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
 * @param {string} inner brace inner content
 * @returns {string[]} alternatives
 */
const splitBraceAlternatives = (inner) => {
	/** @type {string[]} */
	const alts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i];
		if (c === "{") {
			depth++;
		} else if (c === "}") {
			depth--;
		} else if (c === "," && depth === 0) {
			alts.push(inner.slice(start, i));
			start = i + 1;
		}
	}
	alts.push(inner.slice(start));
	return alts;
};

/**
 * @param {string} pattern pattern
 * @param {string} pathStr path
 * @returns {boolean} matches
 */
const globMatchCore = (pattern, pathStr) => {
	const p = pattern;
	const s = pathStr;
	const patternLen = p.length;
	const pathLen = s.length;
	/** @type {number[][]} */
	const memo = Array.from({ length: patternLen + 1 }, () =>
		Array.from({ length: pathLen + 1 }, () => -1)
	);

	/**
	 * @param {number} pi pattern index
	 * @param {number} si path index
	 * @returns {boolean} matches
	 */
	const match = (pi, si) => {
		if (memo[pi][si] !== -1) return memo[pi][si] === 1;
		let result = false;
		if (pi === patternLen) {
			result = si === pathLen;
		} else if (p[pi] === "*") {
			if (pi + 1 < patternLen && p[pi + 1] === "*") {
				const rest = pi + 2;
				if (rest < patternLen && p[rest] === "/") {
					for (let j = si; j <= pathLen; j++) {
						if (match(rest + 1, j)) {
							result = true;
							break;
						}
					}
				} else {
					result = match(rest, si) || (si < pathLen && match(pi, si + 1));
				}
			} else {
				result =
					match(pi + 1, si) ||
					(si < pathLen && s[si] !== "/" && match(pi, si + 1));
			}
		} else if (p[pi] === "?") {
			result = si < pathLen && s[si] !== "/" && match(pi + 1, si + 1);
		} else if (p[pi] === "{") {
			let end = pi + 1;
			let depth = 1;
			while (end < patternLen && depth > 0) {
				if (p[end] === "{") depth++;
				else if (p[end] === "}") depth--;
				end++;
			}
			const inner = p.slice(pi + 1, end - 1);
			for (const alt of splitBraceAlternatives(inner)) {
				if (globMatchCore(`${p.slice(0, pi)}${alt}${p.slice(end)}`, pathStr)) {
					result = true;
					break;
				}
			}
		} else if (p[pi] === "[") {
			let end = pi + 1;
			let negated = false;
			if (end < patternLen && p[end] === "!") {
				negated = true;
				end++;
			} else if (end < patternLen && p[end] === "^") {
				negated = true;
				end++;
			}
			const classStart = end;
			while (end < patternLen && p[end] !== "]") end++;
			const classPattern = p.slice(classStart, end);
			const char = si < pathLen ? s[si] : "";
			let inClass = false;
			for (let i = 0; i < classPattern.length; i++) {
				const cc = classPattern[i];
				if (i + 2 < classPattern.length && classPattern[i + 1] === "-") {
					const from = cc;
					const to = classPattern[i + 2];
					if (char >= from && char <= to) inClass = true;
					i += 2;
				} else if (cc === char) {
					inClass = true;
				}
			}
			result =
				si < pathLen &&
				char !== "/" &&
				inClass !== negated &&
				match(end + 1, si + 1);
		} else if (p[pi] === "\\") {
			result =
				si < pathLen &&
				pi + 1 < patternLen &&
				p[pi + 1] === s[si] &&
				match(pi + 2, si + 1);
		} else {
			result = si < pathLen && p[pi] === s[si] && match(pi + 1, si + 1);
		}
		memo[pi][si] = result ? 1 : 0;
		return result;
	};

	return match(0, 0);
};

/**
 * @param {string} pattern pattern
 * @param {string} str path
 * @returns {boolean} matches
 */
const globMatchBytes = globMatchCore;

/**
 * @param {string} pattern pattern
 * @param {string} str path
 * @param {GlobMatchOptions=} options options
 * @returns {boolean} matches
 */
const globMatchWithOptions = (pattern, str, options = {}) => {
	const caseSensitive = options.caseSensitive !== false;
	if (caseSensitive) {
		return globMatchBytes(pattern, str);
	}
	return globMatchBytes(pattern.toLowerCase(), str.toLowerCase());
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
 * @returns {boolean} matches
 */
const globPatternMatches = (pattern, normalizedPath, exhaustive) =>
	globMatchNormalizedWithExplicitDot(
		pattern.absolutePattern,
		normalizedPath,
		pattern.absoluteBase,
		{ requireLiteralLeadingDot: !exhaustive }
	);

/**
 * @param {ResolvedContextModuleGlobPattern[]} patterns patterns
 * @param {string} filePath path
 * @param {boolean} exhaustive exhaustive
 * @returns {string | undefined} user request
 */
const globUserRequest = (patterns, filePath, exhaustive) => {
	const normalizedPath = normalizePathSeparatorsForPath(filePath);
	const matched = patterns
		.filter((pattern) => !pattern.negative)
		.find((pattern) => globPatternMatches(pattern, normalizedPath, exhaustive));
	if (!matched) return;
	if (
		patterns
			.filter((pattern) => pattern.negative)
			.some((pattern) =>
				globPatternMatches(pattern, normalizedPath, exhaustive)
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

module.exports = {
	commonGlobBaseDir,
	escapeGlobPattern,
	extractGlobBaseDir,
	globMatchCore,
	globMatchNormalizedWithExplicitDot,
	globMatchWithExplicitDot,
	globMatchWithOptions,
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
	splitBraceAlternatives,
	unescapeGlobPath
};
