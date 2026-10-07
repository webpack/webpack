"use strict";

const cases = [
	"minify-at-rules-and-values",
	"minify-calc-number-outside",
	"minify-color-names",
	"minify-initial-keyword-engine-gap",
	"minify-modern-longhands",
	"minify-selectors-and-functions",
	"minify-value-keywords"
];

module.exports = {
	findBundle() {
		return cases.map((name) => `./${name}.js`);
	},
	afterExecute(options) {
		// each case's own checks, reading the stylesheet its entry emitted
		for (const name of cases)
			{require(`./${name}/checks.js`).afterExecute(options);}
	}
};
