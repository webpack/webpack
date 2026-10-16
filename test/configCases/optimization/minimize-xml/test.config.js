"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = [
	"future",
	"disabled",
	"object",
	"absent",
	"none",
	"claimed",
	"sorted",
	"cleaned",
	"attributes",
	"whitespace",
	"numbers",
	"colors",
	"paths",
	"containers",
	"compact",
	"constraints"
];

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
			if (["colors", "paths", "containers", "compact"].includes(name)) {
				const animated = fs.readFileSync(
					path.join(options[i].output.path, "animated.svg"),
					"utf8"
				);
				expect(animated).toContain('d="M010 020L010 030L040 030l000 010"');
				expect(animated).toContain('id="animated"');
				expect(animated).toContain('href="#animated"');
			}
		}
	}
};
