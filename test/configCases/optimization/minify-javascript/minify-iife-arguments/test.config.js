"use strict";

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

module.exports = {
	findBundle(index, options) {
		return options.output.filename;
	},
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options[0].output.path, "es5.js"),
			"utf8"
		);
		expect(() => acorn.parse(code, { ecmaVersion: 5 })).not.toThrow();
	}
};
