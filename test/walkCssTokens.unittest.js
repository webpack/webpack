"use strict";

const fs = require("fs");
const path = require("path");
const walkCssTokens = require("../lib/css/walkCssTokens");

// Snapshot uses the spec-style kebab-case names for multi-word token
// types; the generator emits camelCase. Map between them so the
// existing snapshot files stay valid.
const TYPE_TO_PRINTED = {
	whitespace: "whitespace",
	comment: "comment",
	url: "url",
	leftCurlyBracket: "left-curly-bracket",
	rightCurlyBracket: "right-curly-bracket",
	leftParenthesis: "left-parenthesis",
	rightParenthesis: "right-parenthesis",
	leftSquareBracket: "left-square-bracket",
	rightSquareBracket: "right-square-bracket",
	semicolon: "semicolon",
	comma: "comma",
	atKeyword: "at-keyword",
	colon: "colon",
	delim: "delim",
	number: "number",
	percentage: "percentage",
	dimension: "dimension",
	identifier: "identifier",
	hash: "hash",
	string: "string",
	function: "function",
	cdo: "cdo",
	cdc: "cdc",
	badStringToken: "bad-string-token",
	badUrlToken: "bad-url-token"
};

describe("walkCssTokens", () => {
	const casesPath = path.resolve(__dirname, "./configCases/css/parsing/cases");
	const tests = fs
		.readdirSync(casesPath)
		.filter((test) => /\.css/.test(test))
		.map((item) => [
			item,
			fs.readFileSync(path.resolve(casesPath, item), "utf8")
		]);

	for (const [name, code] of tests) {
		it(`should parse and print "${name}"`, () => {
			const results = [];
			for (const t of walkCssTokens(code, 0)) {
				const printed = TYPE_TO_PRINTED[t.type] || t.type;
				if (t.type === "url") {
					results.push([
						printed,
						code.slice(t.start, t.end),
						code.slice(t.contentStart, t.contentEnd)
					]);
				} else if (t.type === "hash") {
					results.push([printed, code.slice(t.start, t.end), t.isId]);
				} else {
					results.push([printed, code.slice(t.start, t.end)]);
				}
			}

			expect(
				results.filter((item) => item[0] !== "whitespace")
			).toMatchSnapshot();
			expect(results.map((item) => item[1]).join("")).toBe(code);
		});
	}
});
