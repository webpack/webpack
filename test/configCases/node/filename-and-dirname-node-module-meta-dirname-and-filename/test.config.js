"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

let counter = 0;

module.exports = {
	moduleScope(scope, options) {
		const bundleFilename = path.join(
			options.output.path,
			`bundle${counter++}.mjs`
		);
		scope.custom = {
			url: pathToFileURL(bundleFilename),
			dirname: path.dirname(bundleFilename),
			filename: bundleFilename
		};
	}
};
