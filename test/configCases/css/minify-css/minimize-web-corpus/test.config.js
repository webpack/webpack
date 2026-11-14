"use strict";

const cases = [
	"minimize-dead-rules",
	"minimize-escaped-at-rule-names",
	"minimize-gradient-position-validity",
	"minimize-merge-rules-order"
];

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
