"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		expect(
			fs.readFileSync(path.join(options.output.path, "style.css"), "utf8")
		).toMatchSnapshot();
	}
};
