"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		return fs.readdirSync(options.output.path).includes("main.js")
			? ["./main.js"]
			: undefined;
	},
	afterExecute(options) {
		expect(
			fs.readFileSync(path.join(options.output.path, "page.html"), "utf8")
		).toMatchSnapshot();
	}
};
