"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");

let counter = 0;

module.exports = {
	moduleScope(scope, options) {
		const bundleFilename = path.join(
			options.output.path,
			`bundle${counter++}.mjs`
		);
		scope.custom = {
			url: pathToFileURL(bundleFilename).toString(),
			dirname: path.dirname(bundleFilename),
			filename: bundleFilename
		};
	}
};
