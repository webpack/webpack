"use strict";

const fs = require("fs");

module.exports = {
	moduleScope(scope) {
		scope.URL = URL;
	},
	findBundle(index, options) {
		return fs
			.readdirSync(options.output.path)
			.filter((name) => /^main\..+\.mjs$/.test(name));
	}
};
