const walkCssTokens = require("../lib/css/walkCssTokens");

describe("walkCssTokens", () => {
	const test = (name, content, fn) => {
		it(`should ${name}`, () => {
			const results = [];
			walkCssTokens(content, {
				isSelector: () => true,
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
				pseudoClass: (input, s, e) => {
					results.push(["pseudoClass", input.slice(s, e)]);
					return e;
				},
				pseudoFunction: (input, s, e) => {
					results.push(["pseudoFunction", input.slice(s, e)]);
					return e;
				},
				atKeyword: (input, s, e) => {
					results.push(["atKeyword", input.slice(s, e)]);
					return e;
				},
				class: (input, s, e) => {
					results.push(["class", input.slice(s, e)]);
					return e;
				},
				identifier: (input, s, e) => {
					results.push(["identifier", input.slice(s, e)]);
					return e;
				},
				id: (input, s, e) => {
					results.push(["id", input.slice(s, e)]);
					return e;
				}
			});
			fn(expect(results));
		});
	};
	test(
		"parse urls",
		`body {
	background: url(
		https://example\\2f4a8f.com\
/image.png
	)
}
--element\\ name.class\\ name#_id {
	background: url(  "https://example.com/some url \\"with\\" 'spaces'.png"   )  url('https://example.com/\\'"quotes"\\'.png');
}`,
		e =>
			e.toMatchInlineSnapshot(`
			Array [
			  Array [
			    "identifier",
			    "body",
			  ],
			  Array [
			    "leftCurlyBracket",
			    "{",
			  ],
			  Array [
			    "identifier",
			    "background",
			  ],
			  Array [
			    "url",
			    "url(
					https://example\\\\2f4a8f.com/image.png
				)",
			    "https://example\\\\2f4a8f.com/image.png",
			  ],
			  Array [
			    "rightCurlyBracket",
			    "}",
			  ],
			  Array [
			    "identifier",
			    "--element\\\\ name",
			  ],
			  Array [
			    "class",
			    ".class\\\\ name",
			  ],
			  Array [
			    "id",
			    "#_id",
			  ],
			  Array [
			    "leftCurlyBracket",
			    "{",
			  ],
			  Array [
			    "identifier",
			    "background",
			  ],
			  Array [
			    "url",
			    "url(  \\"https://example.com/some url \\\\\\"with\\\\\\" 'spaces'.png\\"   )",
			    "https://example.com/some url \\\\\\"with\\\\\\" 'spaces'.png",
			  ],
			  Array [
			    "url",
			    "url('https://example.com/\\\\'\\"quotes\\"\\\\'.png')",
			    "https://example.com/\\\\'\\"quotes\\"\\\\'.png",
			  ],
			  Array [
			    "semicolon",
			    ";",
			  ],
			  Array [
			    "rightCurlyBracket",
			    "}",
			  ],
			]
		`)
	);

	test(
		"parse pseudo functions",
		`:local(.class#id, .class:not(*:hover)) { color: red; }
:import(something from ":somewhere") {}`,
		e =>
			e.toMatchInlineSnapshot(`
			Array [
			  Array [
			    "pseudoFunction",
			    ":local(",
			  ],
			  Array [
			    "class",
			    ".class",
			  ],
			  Array [
			    "id",
			    "#id",
			  ],
			  Array [
			    "comma",
			    ",",
			  ],
			  Array [
			    "class",
			    ".class",
			  ],
			  Array [
			    "pseudoFunction",
			    ":not(",
			  ],
			  Array [
			    "pseudoClass",
			    ":hover",
			  ],
			  Array [
			    "rightParenthesis",
			    ")",
			  ],
			  Array [
			    "rightParenthesis",
			    ")",
			  ],
			  Array [
			    "leftCurlyBracket",
			    "{",
			  ],
			  Array [
			    "identifier",
			    "color",
			  ],
			  Array [
			    "identifier",
			    "red",
			  ],
			  Array [
			    "semicolon",
			    ";",
			  ],
			  Array [
			    "rightCurlyBracket",
			    "}",
			  ],
			  Array [
			    "pseudoFunction",
			    ":import(",
			  ],
			  Array [
			    "identifier",
			    "something",
			  ],
			  Array [
			    "identifier",
			    "from",
			  ],
			  Array [
			    "rightParenthesis",
			    ")",
			  ],
			  Array [
			    "leftCurlyBracket",
			    "{",
			  ],
			  Array [
			    "rightCurlyBracket",
			    "}",
			  ],
			]
		`)
	);

	test(
		"parse at rules",
		`@media (max-size: 100px) {
	@import "external.css";
	body { color: red; }
}`,
		e =>
			e.toMatchInlineSnapshot(`
			Array [
			  Array [
			    "atKeyword",
			    "@media",
			  ],
			  Array [
			    "leftParenthesis",
			    "(",
			  ],
			  Array [
			    "identifier",
			    "max-size",
			  ],
			  Array [
			    "rightParenthesis",
			    ")",
			  ],
			  Array [
			    "leftCurlyBracket",
			    "{",
			  ],
			  Array [
			    "atKeyword",
			    "@import",
			  ],
			  Array [
			    "semicolon",
			    ";",
			  ],
			  Array [
			    "identifier",
			    "body",
			  ],
			  Array [
			    "leftCurlyBracket",
			    "{",
			  ],
			  Array [
			    "identifier",
			    "color",
			  ],
			  Array [
			    "identifier",
			    "red",
			  ],
			  Array [
			    "semicolon",
			    ";",
			  ],
			  Array [
			    "rightCurlyBracket",
			    "}",
			  ],
			  Array [
			    "rightCurlyBracket",
			    "}",
			  ],
			]
		`)
	);
});
