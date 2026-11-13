"use strict";

const fs = require("fs");
const path = require("path");
const {
	FILES,
	inlineInputs
} = require("../../../tooling/check-syntax-test-inputs");

/**
 * @param {string} code a test file's text
 * @returns {string[]} each inline source it writes, as `line callee`
 */
const found = (code) =>
	inlineInputs(code).map(({ line, callee }) => `${line} ${callee}`);

describe("check-syntax-test-inputs", () => {
	it("flags a source written inline at an entry point", () => {
		expect(
			found(
				[
					'parseAStylesheet("a{}");',
					"new SourceProcessor().process(`a{${b}}`, {});",
					'tokenize("<i>".repeat(5000));',
					'parse(fixture("javascript", "x") + ";");',
					'cssMinify({ "a.css": "a{}" });',
					'new WebpackParser({}, "a;");'
				].join("\n")
			)
		).toEqual([
			"1 parseAStylesheet",
			"2 SourceProcessor.process",
			"3 tokenize",
			"4 parse",
			"5 cssMinify",
			"6 WebpackParser"
		]);
	});

	it("follows a source through names, loops, tables and local helpers", () => {
		expect(
			found(
				[
					'const deep = `a{${"(".repeat(9)}}`;',
					"readToken(deep, 0, {});",
					"const min = (src) => new SourceProcessor().process(src).code;",
					'min("a{}");',
					'for (const source of ["a", "b"]) parseProgram(source);',
					'it.each([["x", "a;"]])("%s", (_, code) => parse(code));',
					'const { parseHtml: refs } = require("x");',
					'refs("<p>");'
				].join("\n")
			)
		).toEqual([
			"2 readToken",
			"4 min",
			"5 parseProgram",
			"6 it.each row",
			"8 refs"
		]);
	});

	it("passes a source read from a fixture, and what is not a source", () => {
		expect(
			found(
				[
					'const source = fixture("css", "a");',
					"parseAStylesheet(source);",
					'parseAStylesheet(fixture("css", "b"), 0, { comment: "x" });',
					'expect(minify(fixture("css", "c"))).toBe("a{}");',
					'JSON.parse("{}");',
					'escapeText("a & b");',
					'const all = fixtures("javascript").map(({ source }) => source);',
					"for (const one of all) parseProgram(one);",
					'it.each([["", "name"]])("%s", (_, name) => parse(fixture("css", name)));'
				].join("\n")
			)
		).toEqual([]);
	});

	it("finds no inline source in the syntax unit tests", () => {
		const root = path.resolve(__dirname, "../../..");
		for (const file of FILES) {
			expect([
				file,
				found(fs.readFileSync(path.join(root, file), "utf8"))
			]).toEqual([file, []]);
		}
	});
});
