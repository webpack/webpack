"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");

module.exports = {
	moduleScope(scope, options) {
		scope.custom = {
			url: pathToFileURL(
				path.join(options.output.path, "bundle0.mjs")
			).toString()
		};
	}
};
