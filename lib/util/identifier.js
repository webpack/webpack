"use strict";
const path = require("path");

const looksLikeAbsolutePath = (maybeAbsolutePath) => {
	return /^(?:[a-z]:\\|\/)/i.test(maybeAbsolutePath);
};

const normalizePathSeparator = (p) => p.replace(/\\/g, "/");

const _makePathsRelative = (context, identifier) => {
	return identifier
		.split(/([|! ])/)
		.map(str => looksLikeAbsolutePath(str) ?
			normalizePathSeparator(path.relative(context, str)) : str)
		.join("");
}

exports.makePathsRelative = (context, identifier, cache) => {
	if(!cache) return _makePathsRelative(context, identifier);

	const relativePaths = cache.relativePaths || (cache.relativePaths = new Map());
	if(!relativePaths.has(context)) {
		relativePaths.set(context, new Map());
	}

	const contextCache = relativePaths.get(context);

	if(contextCache.has(identifier)) {
		return contextCache.get(identifier);
	} else {
		let relativePath = _makePathsRelative(context, identifier);
		contextCache.set(identifier, relativePath);
		return relativePath;
	}

};
