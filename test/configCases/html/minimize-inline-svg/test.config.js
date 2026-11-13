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
			const html = fs.readFileSync(
				path.join(options[i].output.path, name, "page.html"),
				"utf8"
			);
			expect(html.match(/<\/style>/g)).toHaveLength(1);
			expect(html).toContain("%3C%2Fstyle%3E");
			expect(html).toMatchSnapshot(name);
		}
	}
};
