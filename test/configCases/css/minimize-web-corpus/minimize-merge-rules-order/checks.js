"use strict";

const readMinifiedSections = require("../../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["minimize-merge-rules-order.js"];
	},
	afterExecute(options) {
		expect(
			readMinifiedSections(options.output.path, "minimize-merge-rules-order.css")
		).toMatchSnapshot("minimize-merge-rules-order");
	}
};
