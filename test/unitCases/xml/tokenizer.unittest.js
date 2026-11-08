"use strict";

const { fixture } = require("../../helpers/fixture");

const { tokenizeXml } = require("../../../lib/html/syntax-parser");

// What the tokenizer emits for each fixture, from any offset its `parse.json`
// names, is in `invariants.unittest.js`'s snapshot; this holds what it does
// with only some callbacks.
describe("tokenizeXml", () => {
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
