"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		// One snapshot: every rewrite the two options turn off, declined.
		expect(
			fs.readFileSync(path.join(options.output.path, "page.html"), "utf8")
		).toMatchSnapshot();
	}
};
