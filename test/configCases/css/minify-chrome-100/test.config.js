"use strict";

const cases = [
	"minify-hoisted-nested-join",
	"minify-light-dark-idempotent",
	"minify-light-dark-name-only",
	"minify-nested-combinator",
	"minify-nested-idempotent"
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
