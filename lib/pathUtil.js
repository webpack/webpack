"use strict";
const path = require("path");
const memoize = require("lodash.memoize");

const resolveRelative = memoize(function(context, str) {
	return path.relative(context, str);
}, function resolveResolveRelative(context, str) {
	return context + str;
});

exports.makeRelative = memoize(function makeRelativePreMemoize(context, identifier) {
	return identifier.split("|").map(function(str) {
		return str.split("!").map(function(str) {
			return resolveRelative(context, str);
		}).join("!");
	}).join("|");
}, function resolveMakeRelative(context, identifier) {
	return context + identifier;
});
