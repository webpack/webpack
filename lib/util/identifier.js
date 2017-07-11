"use strict";
const path = require("path");

const looksLikeAbsolutePath = (maybeAbsolutePath) => {
	return /^(?:[a-z]:\\|\/)/i.test(maybeAbsolutePath);
};

const normalizePathSeparator = (p) => p.replace(/\\/g, "/");

/* A map from context dir strings to maps from identifier names to relative paths */
const relativePaths = new Map();

exports.makePathsRelative = (context, identifier) => {
	if(!relativePaths.has(context)) {
		relativePaths.set(context, new Map());
	}

	const contextCache = relativePaths.get(context);

	if(contextCache.has(identifier)) {
		return contextCache.get(identifier);
	} else {
		var relativePath = identifier
			.split(/([|! ])/)
			.map(str => looksLikeAbsolutePath(str) ?
				normalizePathSeparator(path.relative(context, str)) : str)
			.join("");
		contextCache.set(identifier, relativePath);
		return relativePath;
	}

};
