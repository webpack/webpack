"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return "./service-worker.js";
	},
	moduleScope(scope, options) {
		scope.getServiceWorkerSource = () =>
			fs.readFileSync(
				path.join(options.output.path, "service-worker.js"),
				"utf8"
			);
	}
};
