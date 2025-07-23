"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

module.exports = {
	moduleScope(scope, options) {
		scope.custom = {
			url: pathToFileURL(path.join(options.output.path, "bundle0.mjs"))
		};
	}
};
