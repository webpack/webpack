"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["./main.js"];
	},
	afterExecute(options) {
		expect(
			fs.readFileSync(path.join(options.output.path, "page.html"), "utf8")
		).toMatchSnapshot();
	}
};
