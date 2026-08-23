"use strict";

// URL extraction, ranges and invalid JSON are covered by the `webmanifest-*`
// config cases. Only this guard stays: nothing hands the parser a preparsed AST.
const WebManifestParser = require("../lib/asset/WebManifestParser");

describe("WebManifestParser", () => {
	it("throws on a preparsed AST", () => {
		expect(() =>
			new WebManifestParser().parse(
				/** @type {any} */ ({}),
				/** @type {any} */ ({})
			)
		).toThrow("webpackAst is unexpected");
	});
});
