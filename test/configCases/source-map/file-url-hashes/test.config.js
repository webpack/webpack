"use strict";

const path = require("path");
const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle(i, options) {
		const files = findOutputFiles(options, /^main\.[a-f0-9]+\.js$/);
		expect(files).toHaveLength(1);
		return path.join(options.output.path, files[0]);
	}
};
