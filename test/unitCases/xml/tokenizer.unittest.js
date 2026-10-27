"use strict";

const { A, Quote, tokenizeXml } = require("../../../lib/html/syntax-parser");

describe("tokenizeXml", () => {
	/**
	 * @param {string} input source
	 * @param {number} start range start
	 * @param {number} end range end
	 * @returns {string | null} the range, or null when absent (-1)
	 */
	const part = (input, start, end) =>
		start === -1 ? null : input.slice(start, end);

	/**
	 * @param {string} source XML
	 * @param {number=} pos where to start
	 * @returns {EXPECTED_ANY[][]} callbacks in call order, then the returned offset
	 */
	const xml = (source, pos) => {
		/** @type {EXPECTED_ANY[][]} */
		const out = [];
		const result = tokenizeXml(source, pos, {
			text: (input, start, end) => {
				out.push(["text", input.slice(start, end)]);
				return end;
			},
			comment: (input, start, end, dataStart, dataEnd) => {
				out.push([
					"comment",
					input.slice(start, end),
					input.slice(dataStart, dataEnd)
				]);
				return end;
			},
			openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
				out.push([
					"open",
					input.slice(start, end),
					input.slice(nameStart, nameEnd),
					selfClosing
				]);
				return end;
			},
			closeTag: (input, start, end, nameStart, nameEnd) => {
				out.push([
					"close",
					input.slice(start, end),
					input.slice(nameStart, nameEnd)
				]);
				return end;
			},
			attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quote) => {
				out.push([
					"attr",
					input.slice(nameStart, nameEnd),
					part(input, valueStart, valueEnd),
					quote
				]);
				return valueEnd;
			},
			doctype: (
				input,
				start,
				end,
				nameStart,
				nameEnd,
				publicStart,
				publicEnd,
				systemStart,
				systemEnd,
				forceQuirks,
				subsetStart = -1,
				subsetEnd = -1
			) => {
				out.push([
					"doctype",
					input.slice(start, end),
					part(input, nameStart, nameEnd),
					part(input, publicStart, publicEnd),
					part(input, systemStart, systemEnd),
					forceQuirks,
					part(input, subsetStart, subsetEnd)
				]);
				return end;
			},
			parseError: (input, code, start, end, severity) => {
				out.push(["error", code, severity]);
			}
		});
		out.push(["end", result]);
		return out;
	};

	it("emits text, tags and attributes of a well-formed document", () => {
		expect(xml(`a<b c="1" d='2' e = "3"\tf\n=\r'4'/>t</b>`)).toEqual([
			["text", "a"],
			["attr", "c", "1", Quote.Double],
			["attr", "d", "2", Quote.Single],
			["attr", "e", "3", Quote.Double],
			["attr", "f", "4", Quote.Single],
			["open", `<b c="1" d='2' e = "3"\tf\n=\r'4'/>`, "b", true],
			["text", "t"],
			["close", "</b>", "b"],
			["end", 38]
		]);
	});

	it("reads names that start with a letter, `_`, `:` or a non-ASCII character", () => {
		expect(xml("<é:ü _x='1' :y='2'><A/><_/><:n></:n></é:ü>")).toEqual([
			["attr", "_x", "1", Quote.Single],
			["attr", ":y", "2", Quote.Single],
			["open", "<é:ü _x='1' :y='2'>", "é:ü", false],
			["open", "<A/>", "A", true],
			["open", "<_/>", "_", true],
			["open", "<:n>", ":n", false],
			["close", "</:n>", ":n"],
			["close", "</é:ü>", "é:ü"],
			["end", 42]
		]);
	});

	it("ends a name at every delimiter the markup around it uses", () => {
		// Whitespace, `>`, `/`, `=`, `<`, quotes, `[` and `?` each end the name.
		expect(xml(`<a\tb=c"d'e[f?g/>`)).toEqual([
			["attr", "b", "c\"d'e[f?g/", Quote.None],
			["open", `<a\tb=c"d'e[f?g/>`, "a", false],
			["end", 16]
		]);
		expect(xml(`<a b"c'd[e?f>`)).toEqual([
			["attr", "b", null, Quote.None],
			["attr", "c", null, Quote.None],
			["attr", "d", null, Quote.None],
			["attr", "e", null, Quote.None],
			["attr", "f", null, Quote.None],
			["open", `<a b"c'd[e?f>`, "a", false],
			["end", 13]
		]);
	});

	it("leaves a `<` that opens no markup in the text", () => {
		// Neither a digit, a space, a `/` without a name nor EOF can open a tag.
		expect(xml("a < b <1 </ > <")).toEqual([
			["text", "a < b <1 </ > <"],
			["end", 15]
		]);
	});

	it("reads unquoted and empty attribute values", () => {
		expect(xml("<a b=c d=>")).toEqual([
			["attr", "b", "c", Quote.None],
			["attr", "d", "", Quote.None],
			["open", "<a b=c d=>", "a", false],
			["end", 10]
		]);
		// An unquoted value runs to EOF when nothing ends it.
		expect(xml("<a b=c")).toEqual([
			["attr", "b", "c", Quote.None],
			["error", "eof-in-tag", "error"],
			["open", "<a b=c", "a", false],
			["end", 6]
		]);
	});

	it("skips a stray `/`, quote or `=` inside a start tag", () => {
		expect(xml(`<a / "=b>`)).toEqual([
			["attr", "b", null, Quote.None],
			["open", `<a / "=b>`, "a", false],
			["end", 9]
		]);
	});

	it("ends a start tag at a `<`, which opens markup of its own", () => {
		expect(xml("<a <b>")).toEqual([
			["open", "<a ", "a", false],
			["open", "<b>", "b", false],
			["end", 6]
		]);
	});

	it("reports `eof-in-tag` for a start tag cut off by EOF", () => {
		expect(xml("<a b")).toEqual([
			["attr", "b", null, Quote.None],
			["error", "eof-in-tag", "error"],
			["open", "<a b", "a", false],
			["end", 4]
		]);
		// An unclosed quoted value runs to EOF.
		expect(xml('<a b="x')).toEqual([
			["attr", "b", "x", Quote.Double],
			["error", "eof-in-tag", "error"],
			["open", '<a b="x', "a", false],
			["end", 7]
		]);
	});

	it("drops an end tag cut off by EOF", () => {
		expect(xml("x</a")).toEqual([
			["text", "x"],
			["end", 4]
		]);
	});

	it("emits comments, CDATA sections and declarations through `comment`", () => {
		expect(xml("a<!--c--><![CDATA[<d>]]><!ELEMENT e>")).toEqual([
			["text", "a"],
			["comment", "<!--c-->", "c"],
			["comment", "<![CDATA[<d>]]>", "<d>"],
			// A declaration outside the DTD reads as a bogus comment.
			["comment", "<!ELEMENT e>", "ELEMENT e"],
			["end", 36]
		]);
	});

	it("runs an unterminated comment, CDATA section or declaration to EOF", () => {
		expect(xml("a<!-- c")).toEqual([
			["text", "a"],
			["comment", "<!-- c", " c"],
			["end", 7]
		]);
		expect(xml("a<![CDATA[<c>")).toEqual([
			["text", "a"],
			["comment", "<![CDATA[<c>", "<c>"],
			["end", 13]
		]);
		expect(xml("a<!ELEMENT")).toEqual([
			["text", "a"],
			["comment", "<!ELEMENT", "ELEMENT"],
			["end", 10]
		]);
	});

	it("emits a processing instruction through `comment` and drops an unterminated one", () => {
		expect(xml("a<?pi data?>b")).toEqual([
			["text", "a"],
			["comment", "<?pi data?>", "pi data"],
			["text", "b"],
			["end", 13]
		]);
		expect(xml("a<?pi data")).toEqual([
			["text", "a"],
			["end", 10]
		]);
	});

	it("reads a DOCTYPE with external IDs and an internal subset", () => {
		const subset = `<!ENTITY e "]"><!ENTITY f ']'><!-- ] --><?pi ]?>`;
		expect(xml(`a<!DOCTYPE r PUBLIC "p" 's' [${subset}] >`)).toEqual([
			["text", "a"],
			[
				"doctype",
				`<!DOCTYPE r PUBLIC "p" 's' [${subset}] >`,
				"r",
				"p",
				"s",
				false,
				subset
			],
			["end", 80]
		]);
		expect(xml("<!DOCTYPE r SYSTEM 's'>")).toEqual([
			["doctype", "<!DOCTYPE r SYSTEM 's'>", "r", null, "s", false, null],
			["end", 23]
		]);
	});

	it("reads a malformed DOCTYPE leniently", () => {
		// The keyword matches in any case; a missing name or literal is absent.
		expect(xml("<!doctype>")).toEqual([
			["doctype", "<!doctype>", null, null, null, false, null],
			["end", 10]
		]);
		expect(xml("<!DOCTYPE r PUBLIC>")).toEqual([
			["doctype", "<!DOCTYPE r PUBLIC>", "r", null, null, false, null],
			["end", 19]
		]);
		// Unterminated literals and subsets run to EOF.
		expect(xml('<!DOCTYPE r "s')).toEqual([
			["doctype", '<!DOCTYPE r "s', "r", null, "s", false, null],
			["end", 14]
		]);
		for (const subset of [" x", ' "x', " 'x", " <!-- x", " <? x"]) {
			expect(xml(`<!DOCTYPE r [${subset}`)).toEqual([
				["doctype", `<!DOCTYPE r [${subset}`, "r", null, null, false, subset],
				["end", 13 + subset.length]
			]);
		}
	});

	it("reports a NUL anywhere past the start once, before any token", () => {
		expect(xml("<a>\0</a>")).toEqual([
			["error", "unexpected-null-character", "warning"],
			["open", "<a>", "a", false],
			["text", "\0"],
			["close", "</a>", "a"],
			["end", 8]
		]);
		// A NUL before the start offset is not scanned.
		expect(xml("\0<a/>", 1)).toEqual([
			["open", "<a/>", "a", true],
			["end", 5]
		]);
	});

	it("advances over markup whose callback is missing", () => {
		const source =
			"a<!--c-->b<![CDATA[d]]>e<!X>f<?g?>h<!DOCTYPE i>j<k l='m'/>n</k>o<q>r<s<t>u<p";
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
		expect(tokenizeXml(`${source}\0`)).toBe(source.length + 1);
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
