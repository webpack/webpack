"use strict";

const readMinifiedSections = require("../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		expect(
			readMinifiedSections(options.output.path, "bundle0.css")
		).toMatchSnapshot();
	}
};
