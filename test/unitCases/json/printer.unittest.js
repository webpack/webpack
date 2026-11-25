"use strict";

const { fixture } = require("../../helpers/fixture");
const jsonMinify = require("../../../lib/json/jsonMinify");

const SOURCE = fixture(
	"json",
	"json-minify-should-drop-whitespace-between-tokens-and-keep-every-token-as-written"
);

describe("jsonMinify", () => {
	it("should drop whitespace between tokens and keep every token as written", async () => {
		const { code } = await jsonMinify({ "data.json": SOURCE });
		expect(code).toMatchSnapshot();
		expect(JSON.parse(code)).toEqual(JSON.parse(SOURCE));
	});

	it("should read a Buffer as UTF-8", async () => {
		const { code } = await jsonMinify({
			"data.json": Buffer.from(
				fixture("json", "json-minify-should-read-a-buffer-as-utf-8")
			)
		});
		expect(code).toMatchSnapshot();
	});

	it("should return source that is not JSON unchanged", async () => {
		const source = fixture(
			"json",
			"json-minify-should-return-source-that-is-not-json-unchanged"
		);
		const { code } = await jsonMinify({ "data.json": source });
		expect(code).toBe(source);
	});

	it("should describe itself to the minimizer plugin", () => {
		expect(jsonMinify.supportsWorkerThreads()).toBe(true);
		expect(jsonMinify.getTypes()).toEqual(["json"]);
		expect(jsonMinify.filter("data.json")).toBe(true);
		expect(jsonMinify.filter("data.JSON?v=1")).toBe(true);
		expect(jsonMinify.filter("data.json#abc123")).toBe(true);
		expect(jsonMinify.filter("data.json.map")).toBe(false);
		expect(jsonMinify.filter("data.js")).toBe(false);
		expect(jsonMinify.filter("data.jsonc")).toBe(false);
		expect(jsonMinify.filter("site.webmanifest")).toBe(true);
		expect(jsonMinify.filter("a1b2.webmanifest?v=1")).toBe(true);
	});
});
