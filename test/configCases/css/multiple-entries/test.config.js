"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = {
	findBundle() {
		return ["basic.js"];
	},
	afterExecute(options) {
		// Sort: readdirSync order is filesystem-dependent (differs on Bun).
		const files = fs
			.readdirSync(options.output.path)
			.filter((item) => !/stats/.test(item))
			.sort();

		expect(files).toMatchSnapshot();

		for (const file of files.filter((item) => /\.css/.test(item))) {
			expect(
				fs.readFileSync(path.join(options.output.path, file), "utf8")
			).toMatchSnapshot(file);
		}
	}
};
