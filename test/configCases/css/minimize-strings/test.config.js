"use strict";

const readMinifiedSections = require("../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["./main.js", "./unterminated.js"];
	},
	afterExecute(options) {
		expect(
			readMinifiedSections(options.output.path, "main.css")
		).toMatchSnapshot();
		expect(
			readMinifiedSections(options.output.path, "unterminated.css")
		).toMatchSnapshot();
	}
};
