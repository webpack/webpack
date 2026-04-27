"use strict";

const conventions = [
	"as-is",
	"camel-case",
	"camel-case-only",
	"dashes",
	"dashes-only"
];

module.exports = {
	findBundle(i, options) {
		const ext =
			options.experiments && options.experiments.outputModule ? "mjs" : "js";
		return [
			...conventions.map((c) => `style_module_css_${c}.bundle${i}.${ext}`),
			`bundle${i}.${ext}`
		];
	}
};
