"use strict";

// terser is a development dependency only, there to compare against. What a
// build minifies with is the copy webpack carries, so a build must not reach
// for the published package at all — which this holds by taking it away.
jest.mock("terser", () => {
	throw new Error("terser is not installed");
});

const jsMinify = require("../../lib/javascript/jsMinify");

const SOURCE = "function add(first, second) { return first + second; }\nsink(add);";

describe("jsMinify without terser installed", () => {
	it("should have no terser to reach", () => {
		expect(() => require("terser")).toThrow("terser is not installed");
	});

	it.each([
		["as released", false],
		["through webpack's printer", true]
	])("should minify with the terser webpack carries: %s", async (_name, printer) => {
		const result = await jsMinify({ "a.js": SOURCE }, undefined, { printer });
		expect(result.errors).toBeUndefined();
		expect(result.code).toBe("function add(d,n){return d+n}sink(add);");
	});
});
