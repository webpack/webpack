"use strict";

// The URL extraction, the source ranges and the untouched-on-invalid-JSON
// behaviour are covered by real builds in `configCases/html/webmanifest-icons`,
// `webmanifest-build-http` and `webmanifest-parsing`. Only the guard below
// stays here: nothing hands this parser a preparsed AST.
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
