"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = ["default", "svg"];

module.exports = {
	findBundle(i) {
		return `./${NAMES[i]}.js`;
	},
	afterExecute(options) {
		for (const [i, name] of NAMES.entries()) {
			expect(
				fs.readFileSync(
					path.join(options[i].output.path, name, "page.html"),
					"utf8"
				)
			).toMatchSnapshot(name);
		}
	}
};
