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
		for (const file of [
			"page.html",
			"kept-comment.html",
			"head-content.html",
			"leading-space.html"
		]) {
			expect(
				fs.readFileSync(path.join(options.output.path, file), "utf8")
			).toMatchSnapshot(file);
		}
	}
};
