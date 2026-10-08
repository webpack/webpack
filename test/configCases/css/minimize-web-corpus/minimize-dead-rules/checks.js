"use strict";

const readMinifiedSections = require("../../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["minimize-dead-rules.js"];
	},
	afterExecute(options) {
		expect(
			readMinifiedSections(options.output.path, "minimize-dead-rules.css")
		).toMatchSnapshot("minimize-dead-rules");
	}
};
