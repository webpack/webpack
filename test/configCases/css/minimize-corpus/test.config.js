"use strict";

const readMinifiedSections = require("../../../helpers/readMinifiedSections");

const corpora = [
	"escaped-property-names",
	"minimize-calc",
	"minimize-calc-lightningcss",
	"minimize-colors",
	"minimize-cssnano-custom-properties",
	"minimize-declined",
	"minimize-empty-rules",
	"minimize-esbuild",
	"minimize-lightningcss-selectors",
	"minimize-lightningcss-values",
	"minimize-media-queries",
	"minimize-nesting",
	"minimize-omitted-values",
	"minimize-selectors",
	"minimize-shorthand-folds",
	"minimize-shorthands",
	"minimize-supports",
	"minimize-timing-functions",
	"minimize-urls",
	"minimize-value-validity",
	"minimize-values"
];

module.exports = {
	findBundle() {
		return corpora.map((name) => `./${name}.js`);
	},
	afterExecute(options) {
		for (const name of corpora) {
			expect(
				readMinifiedSections(options.output.path, `${name}.css`)
			).toMatchSnapshot(name);
		}
	}
};
