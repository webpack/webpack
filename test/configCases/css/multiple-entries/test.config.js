"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["basic.js"];
	},
	afterExecute(options) {
		const files = fs
			.readdirSync(options.output.path)
			.filter((item) => !/stats/.test(item));

		expect(files).toMatchSnapshot();

		for (const file of files.filter((item) => /\.css/.test(item))) {
			expect(
				fs.readFileSync(path.join(options.output.path, file), "utf8")
			).toMatchSnapshot(file);
		}
	}
};
