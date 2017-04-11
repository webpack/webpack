"use strict";
const path = require("path");

const looksLikeAbsolutePath = (maybeAbsolutePath) => {
	return /^(?:[a-z]:\\|\/)/i.test(maybeAbsolutePath);
};

const normalizePathSeparator = (p) => p.replace(/\\/g, "/");

exports.makePathsRelative = (context, identifier) => {
	return identifier
		.split(/([|! ])/)
		.map(str => looksLikeAbsolutePath(str) ?
			normalizePathSeparator(path.relative(context, str)) : str)
		.join("");
};
