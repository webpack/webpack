"use strict";

const jsonMinify = require("../../lib/json/jsonMinify");

const SOURCE = `{
	"id": 9007199254740993,
	"precise": 1.50,
	"huge": -1E+400,
	"list": [ 1,\r\n\t2 ],
	"text": "keep  \\"these\\"  spaces\\\\",
	"unicode": "\\u0020 \\n"
}
`;

describe("jsonMinify", () => {
	it("should drop whitespace between tokens and keep every token as written", async () => {
		const { code } = await jsonMinify({ "data.json": SOURCE });
		expect(code).toMatchSnapshot();
		expect(JSON.parse(code)).toEqual(JSON.parse(SOURCE));
	});

	it("should read a Buffer as UTF-8", async () => {
		const { code } = await jsonMinify({
			"data.json": Buffer.from('{ "name": "café" }')
		});
		expect(code).toBe('{"name":"café"}');
	});

	it("should return source that is not JSON unchanged", async () => {
		const source = '{\n\t// comment\n\t"a": 1\n}\n';
		const { code } = await jsonMinify({ "data.json": source });
		expect(code).toBe(source);
	});

	it("should describe itself to the minimizer plugin", () => {
		expect(jsonMinify.supportsWorkerThreads()).toBe(true);
		expect(jsonMinify.getTypes()).toEqual(["json"]);
		expect(jsonMinify.filter("data.json")).toBe(true);
		expect(jsonMinify.filter("data.JSON?v=1")).toBe(true);
		expect(jsonMinify.filter("data.js")).toBe(false);
		expect(jsonMinify.filter("data.jsonc")).toBe(false);
	});
});
