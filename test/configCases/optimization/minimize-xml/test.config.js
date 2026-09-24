"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = ["future", "disabled", "object", "absent", "claimed"];

module.exports = {
	findBundle(i) {
		return `${NAMES[i]}.js`;
	},
	afterExecute(options) {
		for (const [i, name] of NAMES.entries()) {
			expect(
				fs.readFileSync(
					path.join(options[i].output.path, `${name}.svg`),
					"utf8"
				)
			).toMatchSnapshot(name);
		}
	}
};
