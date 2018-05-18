"use strict";
const path = require("path");

/**
 * @typedef {Object} MakeRelativePathsCache
 * @property {Map<string, Map<string, string>>=} relativePaths
 */

/**
 *
 * @param {string} maybeAbsolutePath path to check
 * @returns {boolean} returns true if path is "Absolute Path"-like
 */
const looksLikeAbsolutePath = maybeAbsolutePath => {
	return /^(?:[a-z]:\\|\/)/i.test(maybeAbsolutePath);
};

/**
 *
 * @param {string} p path to normalize
 * @returns {string} normalized version of path
 */
const normalizePathSeparator = p => p.replace(/\\/g, "/");

/**
 *
 * @param {string} context context for relative path
 * @param {string} identifier identifier for path
 * @returns {string} a converted relative path
 */
const _makePathsRelative = (context, identifier) => {
	return identifier
		.split(/([|! ])/)
		.map(
			str =>
				looksLikeAbsolutePath(str)
					? normalizePathSeparator(path.relative(context, str))
					: str
		)
		.join("");
};

/**
 *
 * @param {string} context context used to create relative path
 * @param {string} identifier identifier used to create relative path
 * @param {MakeRelativePathsCache=} cache the cache object being set
 * @returns {string} the returned relative path
 */
exports.makePathsRelative = (context, identifier, cache) => {
	if (!cache) return _makePathsRelative(context, identifier);

	const relativePaths =
		cache.relativePaths || (cache.relativePaths = new Map());

	let cachedResult;
	let contextCache = relativePaths.get(context);
	if (typeof contextCache === "undefined") {
		relativePaths.set(context, (contextCache = new Map()));
	} else {
		cachedResult = contextCache.get(identifier);
	}

	if (typeof cachedResult !== "undefined") {
		return cachedResult;
	} else {
		const relativePath = _makePathsRelative(context, identifier);
		contextCache.set(identifier, relativePath);
		return relativePath;
	}
};
