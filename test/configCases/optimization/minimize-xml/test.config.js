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
	"symbols",
	"constraints",
	"structure"
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
			if (name === "structure") {
				const structure = fs.readFileSync(
					path.join(options[i].output.path, "structure.svg"),
					"utf8"
				);
				expect(structure.match(/fill="context-fill"/g)).toHaveLength(2);
				expect(structure).not.toContain('href="#context"');
				const dependent = fs.readFileSync(
					path.join(options[i].output.path, "attribute-dependency.svg"),
					"utf8"
				);
				expect(dependent).toContain('x="0"');
				expect(dependent).toContain('opacity="1"');
				expect(dependent).toContain('d="M000.00 000.00L010.00 000.00"');
				expect(dependent).toContain('transform="translate(00 00)"');
			}
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
