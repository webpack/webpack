"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = ["future", "disabled"];

module.exports = {
	findBundle(i) {
		return `${NAMES[i]}.js`;
	},
	afterExecute(options) {
		for (const [i, name] of NAMES.entries()) {
			const read = (ext) =>
				fs.readFileSync(
					path.join(options[i].output.path, `${name}.${ext}`),
					"utf8"
				);
			expect(read("css")).toMatchSnapshot(`${name} css`);
			expect(read("html")).toMatchSnapshot(`${name} html`);
		}
	}
};
