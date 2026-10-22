"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(i) {
		return `bundle${i}.js`;
	},
	moduleScope(scope, options) {
		scope.BUILD_REPORT = JSON.parse(
			fs.readFileSync(
				path.join(options.output.path, `${options.name}.modules.json`),
				"utf8"
			)
		);
	}
};
