"use strict";

const readMinifiedSections = require("../../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["minimize-escaped-at-rule-names.js"];
	},
	afterExecute(options) {
		expect(
			readMinifiedSections(options.output.path, "minimize-escaped-at-rule-names.css")
		).toMatchSnapshot("minimize-escaped-at-rule-names");
	}
};
