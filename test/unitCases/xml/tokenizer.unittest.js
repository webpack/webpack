"use strict";

const { fixture } = require("../../helpers/fixture");

const { tokenizeXml } = require("../../../lib/html/syntax-parser");

// What the tokenizer emits for each fixture is in `invariants.unittest.js`'s
// snapshot; these hold what it does past one read from offset 0.
describe("tokenizeXml", () => {
	it("does not scan a NUL before the offset it starts at", () => {
		/** @type {(string | boolean)[]} */
		const seen = [];
		const end = tokenizeXml(
			fixture(
				"xml",
				"tokenize-xml-reports-a-nul-anywhere-past-the-start-once-before-any-token-2"
			),
			1,
			{
				parseError: (input, code) => {
					seen.push(code);
				},
				openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
					seen.push(input.slice(start, end), selfClosing);
					return end;
				}
			}
		);
		expect(seen).toEqual(["<a/>", true]);
		expect(end).toBe(5);
	});

	it("advances over markup whose callback is missing", () => {
		const source =
			fixture("xml", "tokenize-xml-advances-over-markup-whose-callback-is-missing");
		/** @type {string[]} */
		const texts = [];
		expect(
			tokenizeXml(source, 0, {
				text: (input, start, end) => {
					texts.push(input.slice(start, end));
					return end;
				}
			})
		).toBe(source.length);
		expect(texts).toEqual(["a", "b", "e", "f", "h", "j", "n", "o", "r", "u"]);
		// With no callbacks at all, it still reads to the end.
		expect(tokenizeXml(fixture("xml", "tokenize-xml-advances-over-markup-whose-callback-is-missing-2"))).toBe(source.length + 1);
		/** @type {string[]} */
		const tags = [];
		tokenizeXml(source, 0, {
			openTag: (input, start, end, nameStart, nameEnd) => {
				tags.push(input.slice(nameStart, nameEnd));
				return end;
			}
		});
		expect(tags).toEqual(["k", "q", "s", "t", "p"]);
	});
});
