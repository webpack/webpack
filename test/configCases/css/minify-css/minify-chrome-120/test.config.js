"use strict";

const cases = ["minify-at-rule-seam-order", "minify-legacy-box-prefixes"];

module.exports = {
	findBundle() {
		return cases.map((name) => `./${name}.js`);
	},
	afterExecute(options) {
		// each case's own checks, reading the stylesheet its entry emitted
		for (const name of cases) {
			require(`./${name}/checks.js`).afterExecute(options);
		}
	}
};
