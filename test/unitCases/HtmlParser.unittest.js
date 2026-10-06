"use strict";

// Everything a build can reach is a `configCases/html` or `watchCases` case;
// what stays here is the part of `parse`'s contract no build drives.
const path = require("path");
const HtmlSourceDependency = require("../../lib/dependencies/html/HtmlSourceDependency");
const HtmlParser = require("../../lib/html/HtmlParser");

/**
 * Parse with a module double and return the first source dependency's range.
 * @param {string | Buffer} source html
 * @returns {[number, number]} the range of its first `HtmlSourceDependency`
 */
const firstSourceRange = (source) => {
	/** @type {EXPECTED_OBJECT[]} */
	const dependencies = [];
	const module = {
		resource: path.resolve(__dirname, "../index.html"),
		buildInfo: {},
		buildMeta: {},
		identifier() {
			return this.resource;
		},
		addPresentationalDependency() {},
		addDependency(/** @type {EXPECTED_OBJECT} */ dependency) {
			dependencies.push(dependency);
		},
		addCodeGenerationDependency() {}
	};
	new HtmlParser({}).parse(
		source,
		/** @type {import("../../lib/module/Parser").ParserState} */ (
			/** @type {unknown} */ ({
				module,
				compilation: {
					outputOptions: { hashFunction: "md4", module: false },
					compiler: { context: path.resolve(__dirname, "../..") },
					options: { experiments: { css: false } }
				}
			})
		)
	);
	const dependency = /** @type {HtmlSourceDependency} */ (
		dependencies.find((item) => item instanceof HtmlSourceDependency)
	);
	return /** @type {[number, number]} */ (dependency.range);
};

describe("HtmlParser", () => {
	// An html module's source is always a string in a build, since no html
	// generator option makes it binary; `Parser.parse` still accepts a Buffer.
	it("parses a Buffer source like the equivalent string", () => {
		expect(firstSourceRange(Buffer.from("<img src=a.png>"))).toEqual(
			firstSourceRange("<img src=a.png>")
		);
	});
});
