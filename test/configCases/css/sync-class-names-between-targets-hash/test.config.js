"use strict";

// Shared across the web and node compilations so the second build can compare
// its class names with the ones produced by the first build.
/** @type {Record<string, Record<string, Record<string, string>>>} */
const classNames = {};

module.exports = {
	moduleScope(scope, options) {
		scope.CLASS_NAMES = classNames;
		scope.CONFIG_NAME = options.name;
	}
};
