"use strict";

const RequestShortener = require("../lib/RequestShortener");

describe("RequestShortener", () => {
	it("should create RequestShortener and shorten with ./ file in directory", () => {
		const shortener = new RequestShortener("/foo/bar");
		expect(shortener.shorten("/foo/bar/some.js")).toEqual("./some.js");
	});

	it("should create RequestShortener and shorten with ../ file in parent directory", () => {
		const shortener = new RequestShortener("/foo/bar");
		expect(shortener.shorten("/foo/baz/some.js")).toEqual("../baz/some.js");
	});

	it("should create RequestShortener and not shorten parent directory neighbor", () => {
		const shortener = new RequestShortener("/foo/bar");
		expect(shortener.shorten("/foo_baz/bar/some.js")).toEqual(
			"../../foo_baz/bar/some.js"
		);
	});
});
