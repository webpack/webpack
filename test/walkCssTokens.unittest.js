const fs = require("fs");
const path = require("path");
const walkCssTokens = require("../lib/css/walkCssTokens");

describe("walkCssTokens", () => {
	const test = (name, content, fn) => {
		it(`should parse ${name}`, () => {
			const results = [];
			walkCssTokens(content, 0, {
				comment: (input, s, e) => {
					results.push(["comment", input.slice(s, e)]);
					return e;
				},
				url: (input, s, e, cs, ce) => {
					results.push(["url", input.slice(s, e), input.slice(cs, ce)]);
					return e;
				},
				leftCurlyBracket: (input, s, e) => {
					results.push(["leftCurlyBracket", input.slice(s, e)]);
					return e;
				},
				rightCurlyBracket: (input, s, e) => {
					results.push(["rightCurlyBracket", input.slice(s, e)]);
					return e;
				},
				leftParenthesis: (input, s, e) => {
					results.push(["leftParenthesis", input.slice(s, e)]);
					return e;
				},
				rightParenthesis: (input, s, e) => {
					results.push(["rightParenthesis", input.slice(s, e)]);
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
					results.push(["atKeyword", input.slice(s, e)]);
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
				}
			});
			fn(expect(results));
		});
	};

	const casesPath = path.resolve(__dirname, "./configCases/css/parsing/cases");
	const tests = fs
		.readdirSync(casesPath)
		.filter(test => /\.css/.test(test))
		.map(item => [
			item,
			fs.readFileSync(path.resolve(casesPath, item), "utf-8")
		]);

	for (const [name, code] of tests) {
		test(name, code, e => e.toMatchSnapshot());
	}
});
