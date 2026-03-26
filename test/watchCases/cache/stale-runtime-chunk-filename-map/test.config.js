"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return "./service-worker.js";
	},
	moduleScope(scope, options) {
		scope.readOutputFile = (filename) =>
			fs.readFileSync(path.join(options.output.path, filename), "utf8");
	}
};
