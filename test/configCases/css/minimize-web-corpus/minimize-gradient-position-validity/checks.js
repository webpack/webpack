"use strict";

const readMinifiedSections = require("../../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["minimize-gradient-position-validity.js"];
	},
	afterExecute(options) {
		expect(
			readMinifiedSections(options.output.path, "minimize-gradient-position-validity.css")
		).toMatchSnapshot("minimize-gradient-position-validity");
	}
};
