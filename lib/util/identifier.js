"use strict";
const path = require("path");

const looksLikeAbsolutePath = exports.looksLikeAbsolutePath = (maybeAbsolutePath) => {
	return /^(?:[a-z]:\\|\/)/i.test(maybeAbsolutePath);
};

exports.makePathsRelative = (context, identifier) => {
	return identifier
		.split(/([|! ])/)
		.map(str => looksLikeAbsolutePath(str) ? path.relative(context, str) : str)
		.join("");
};
