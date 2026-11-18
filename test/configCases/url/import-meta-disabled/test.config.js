"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return "./bundle.mjs";
	},
	moduleScope(scope) {
		scope.URL = URL;
	},
	afterExecute(options) {
		const bundle = fs.readFileSync(
			path.resolve(options.output.path, "./bundle.mjs"),
			"utf8"
		);

		if (!bundle.includes("const moduleUrl = import.meta.url;")) {
			throw new Error("The bare import.meta.url was not kept");
		}
	}
};
