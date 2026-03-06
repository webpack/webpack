"use strict";

const fs = require("fs");
const path = require("path");
const walkCssTokens = require("../lib/css/walkCssTokens");

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

			walkCssTokens(code, 0, {
				whitespace: (input, s, e) => {
					results.push(["whitespace", input.slice(s, e)]);
					return e;
				},
				comment: (input, s, e) => {
					results.push(["comment", input.slice(s, e)]);
					return e;
				},
				url: (input, s, e, cs, ce) => {
					results.push(["url", input.slice(s, e), input.slice(cs, ce)]);
					return e;
				},
				leftCurlyBracket: (input, s, e) => {
					results.push(["left-curly-bracket", input.slice(s, e)]);
					return e;
				},
				rightCurlyBracket: (input, s, e) => {
					results.push(["right-curly-bracket", input.slice(s, e)]);
					return e;
				},
				leftParenthesis: (input, s, e) => {
					results.push(["left-parenthesis", input.slice(s, e)]);
					return e;
				},
				rightParenthesis: (input, s, e) => {
					results.push(["right-parenthesis", input.slice(s, e)]);
					return e;
				},
				leftSquareBracket: (input, s, e) => {
					results.push(["left-square-bracket", input.slice(s, e)]);
					return e;
				},
				rightSquareBracket: (input, s, e) => {
					results.push(["right-square-bracket", input.slice(s, e)]);
					return e;
				},
				semicolon: (input, s, e) => {
					results.push(["semicolon", input.slice(s, e)]);
					return e;
				},
				comma: (input, s, e) => {
					results.push(["comma", input.slice(s, e)]);
					return e;
				},
				atKeyword: (input, s, e) => {
					results.push(["at-keyword", input.slice(s, e)]);
					return e;
				},
				colon: (input, s, e) => {
					results.push(["colon", input.slice(s, e)]);
					return e;
				},
				delim: (input, s, e) => {
					results.push(["delim", input.slice(s, e)]);
					return e;
				},
				number: (input, s, e) => {
					results.push(["number", input.slice(s, e)]);
					return e;
				},
				percentage: (input, s, e) => {
					results.push(["percentage", input.slice(s, e)]);
					return e;
				},
				dimension: (input, s, e) => {
					results.push(["dimension", input.slice(s, e)]);
					return e;
				},
				identifier: (input, s, e) => {
					results.push(["identifier", input.slice(s, e)]);
					return e;
				},
				hash: (input, s, e, isID) => {
					results.push(["hash", input.slice(s, e), isID]);
					return e;
				},
				string: (input, s, e) => {
					results.push(["string", input.slice(s, e)]);
					return e;
				},
				function: (input, s, e) => {
					results.push(["function", input.slice(s, e)]);
					return e;
				},
				cdo: (input, s, e) => {
					results.push(["cdo", input.slice(s, e)]);
					return e;
				},
				cdc: (input, s, e) => {
					results.push(["cdc", input.slice(s, e)]);
					return e;
				},
				badStringToken: (input, s, e) => {
					results.push(["bad-string-token", input.slice(s, e)]);
					return e;
				},
				badUrlToken: (input, s, e) => {
					results.push(["bad-url-token", input.slice(s, e)]);
					return e;
				}
			});

			expect(
				results.filter((item) => item[0] !== "whitespace")
			).toMatchSnapshot();
			expect(results.map((item) => item[1]).join("")).toBe(code);
		});
	}
});
