"use strict";
const path = require("path");

const looksLikeAbsolutePath = maybeAbsolutePath => {
	return /^(?:[a-z]:\\|\/)/i.test(maybeAbsolutePath);
};

const normalizePathSeparator = p => p.replace(/\\/g, "/");

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
