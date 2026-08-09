"use strict";

// URL extraction, ranges and invalid JSON are covered by the `webmanifest-*`
// config cases. Only this guard stays: nothing hands the parser a preparsed AST.
const WebManifestParser = require("../lib/asset/WebManifestParser");

describe("WebManifestParser", () => {
	it("throws on a preparsed AST", () => {
		expect(() =>
			new WebManifestParser().parse(
				/** @type {EXPECTED_ANY} */ ({}),
				/** @type {EXPECTED_ANY} */ ({})
			)
		).toThrow("webpackAst is unexpected");
	});
});
