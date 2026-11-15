"use strict";

const fs = require("fs");
const { fixture } = require("../../helpers/fixture");

// cspell:ignore apos notpre Elig reconsumes xyzabc zzzunknown codepoint DFFF ampx noncharacter FFFE scrip
// cspell:ignore scripty
// cspell:ignore DOCTYPEÐ DOCTYPEİ doctypehtml
// cspell:ignore noembed

/** @import { MatText } from "../../helpers/materializeHtmlTree" */

const {
	Quote,
	decodeEntities,
	escapeAttribute,
	escapeText,
	tokenize
} = require("../../../lib/html/syntax-parser");

describe("tokenize", () => {

	describe("coverage: state-machine branches", () => {
		// --- Callback can advance `pos` past the natural end (skip-ahead) ---
		it("openTag callback returning a larger position causes state to fall to DATA", () => {
			// A callback returning `nextPos > pos + 1` keeps the machine in DATA
			// rather than switching to `<script>` / `<style>` content mode — the
			// branch every `>` handler carries, one case per state below.
			/** @type {[string, ...EXPECTED_ANY[]][]} */
			const out = [];
			const skipFn =
				(/** @type {string} */ label) =>
				(
					/** @type {string} */ input,
					/** @type {number} */ start,
					/** @type {number} */ end,
					/** @type {number} */ ns,
					/** @type {number} */ ne
				) => {
					out.push([label, input.slice(ns, ne)]);
					// Skip one character past `>` so nextPos > end.
					return end + 1;
				};
			tokenize(
				fixture("html", "tokenize-coverage-state-machine-branches-open-tag-callback-returning-a-larger"),
				0,
				{
					openTag: skipFn("open"),
					closeTag: (input, start, end, ns, ne) => {
						out.push(["close", input.slice(ns, ne)]);
						return end;
					},
					attribute: (input, ns, ne, vs, ve, qt) => {
						if (vs === -1) return ne;
						if (qt !== Quote.None) return ve + 1;
						return ve;
					},
					text: (input, start, end) => {
						out.push(["text", input.slice(start, end)]);
						return end;
					}
				}
			);
			// Each open-tag callback skips one char past `>`, so the text that
			// follows is shorter than the source. The spans do not matter; staying
			// in DATA mode, with no content-mode trapping of `<script>`, does.
			expect(out.filter(([k]) => k === "open").map((e) => e[1])).toEqual([
				"script",
				"a",
				"b",
				"c",
				"d",
				"e"
			]);
			// `<script>` did NOT trap into SCRIPT_DATA — `</script>` is a
			// regular close tag, not content.
			expect(out.filter(([k]) => k === "close").map((e) => e[1])).toEqual([
				"script",
				"a",
				"b",
				"c",
				"d"
			]);
		});

		it("reads an unquoted attribute value as one run between its stops", () => {
			// Whitespace ends the value, `&` opens a reference in it, and NUL, `"`,
			// `'`, `<`, `=` and a backtick each report a parse error inside it.
			/** @type {[string, string][]} */
			const attributes = [];
			/** @type {[string, number][]} */
			const errors = [];
			tokenize(
				fixture("html", "coverage-state-machine-branches-reads-an-unquoted-attribute-value-as-one-run-bet"),
				0,
				{
					attribute: (input, ns, ne, vs, ve) => {
						attributes.push([input.slice(ns, ne), input.slice(vs, ve)]);
						return ve;
					},
					parseError: (input, code, start) => {
						errors.push([code, start]);
					}
				}
			);
			expect(attributes).toEqual([
				["b", "x\"y'z<w=v`u\0t&amp;\u00E9"],
				["c", "1"],
				["d", "2"],
				["e", "3"],
				["f", "4"],
				["g", "&h"],
				["i", "`"]
			]);
			const unexpected = "unexpected-character-in-unquoted-attribute-value";
			expect(errors).toEqual([
				[unexpected, 6],
				[unexpected, 8],
				[unexpected, 10],
				[unexpected, 12],
				[unexpected, 14],
				["unexpected-null-character", 16],
				[unexpected, 48]
			]);
		});
	});


	describe("decodeEntities", () => {
		it("should decode core named entities", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-core-named-entities"))).toBe(
				"&<>\"'\u00A0"
			);
		});

		it("should decode legacy named entities without trailing semicolon", () => {
			// `&AMP` and `&copy` are legacy bare-form entities in the WHATWG
			// named character references table.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-legacy-named-entities-without-trailing"))).toBe("&");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-legacy-named-entities-without-trailing-2"))).toBe("\u00A9");
		});

		it("should decode entities outside the BMP and multi-codepoint entities", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-entities-outside-the-bmp-and-multi"))).toBe("\u00C6");
			// `&NotEqualTilde;` is a multi-codepoint named reference (\u2242 + combining slash).
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-entities-outside-the-bmp-and-multi-2"))).toBe("\u2242\u0338");
		});

		it("should apply longest-prefix backtrack per WHATWG", () => {
			// `&notpre;` is not in the table, but `&not` is \u2014 the prefix matches
			// and the remainder `pre;` is left as literal text.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-apply-longest-prefix-backtrack-per-whatwg"))).toBe("\u00ACpre;");
		});

		it("should decode numeric decimal references", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-numeric-decimal-references"))).toBe("ABC");
		});

		it("should decode numeric references without trailing semicolon", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-numeric-references-without-trailing"))).toBe("A");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-numeric-references-without-trailing-2"))).toBe("A");
		});

		it("should not let decimal references swallow trailing hex-letter chars", () => {
			// Regression: a decimal numeric reference consumes only `[0-9]+`, so
			// `&#65b` decodes to `A` and leaves `b` as text. The earlier regexp
			// matched `[0-9a-fA-F]+` for both bases and swallowed the `b`.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-not-let-decimal-references-swallow-trailing-hex"))).toBe("Ab");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-not-let-decimal-references-swallow-trailing-hex-2"))).toBe("f");
		});

		it("should decode numeric hexadecimal references", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-numeric-hexadecimal-references"))).toBe("ABC");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-decode-numeric-hexadecimal-references-2"))).toBe("ABC");
		});

		it("should leave unknown or incomplete entities as literals", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-leave-unknown-or-incomplete-entities-as-literals"))).toBe("&zzzunknown;");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-leave-unknown-or-incomplete-entities-as-literals-2"))).toBe("&#;");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-leave-unknown-or-incomplete-entities-as-literals-3"))).toBe("&#x;");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-leave-unknown-or-incomplete-entities-as-literals-4"))).toBe("bare & alone");
		});

		it("should not match inherited Object.prototype keys as entities", () => {
			// Regression: from a plain object literal `HTML_ENTITIES["toString"]`
			// returns `Object.prototype.toString` and the lookup reads the entity as
			// matched. The generated table has a null prototype, so it does not.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-not-match-inherited-object-prototype-keys-as"))).toBe("&toString;");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-not-match-inherited-object-prototype-keys-as-2"))).toBe("&constructor;");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-not-match-inherited-object-prototype-keys-as-3"))).toBe("&hasOwnProperty;");
		});

		it("should handle mixed text and entities", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-handle-mixed-text-and-entities"))).toBe(
				"foo & bar A baz"
			);
		});

		it("should fast-path strings with no `&`", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-fast-path-strings-with-no"))).toBe("plain text");
		});

		it("should replace numeric references above U+10FFFF with U+FFFD", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-replace-numeric-references-above-u-10ffff-with-u"))).toBe("�");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-replace-numeric-references-above-u-10ffff-with-u-2"))).toBe("�");
		});

		it("should replace NULL and surrogate numeric references with U+FFFD", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-replace-null-and-surrogate-numeric-references"))).toBe("�");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-replace-null-and-surrogate-numeric-references-2"))).toBe("�");
			expect(decodeEntities(fixture("html", "tokenize-parse-error-callback-validates-numeric-references-that-end-exactly-at-3"))).toBe("�");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-replace-null-and-surrogate-numeric-references-3"))).toBe("�");
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-replace-null-and-surrogate-numeric-references-4"))).toBe("�");
		});

		it("should remap C1 numeric references via the Windows-1252 table", () => {
			// `&#x80;` (Windows-1252 euro sign) per WHATWG remaps to U+20AC.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-remap-c1-numeric-references-via-the-windows-1252"))).toBe("€");
			// `&#x99;` remaps to U+2122 (trade mark sign).
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-remap-c1-numeric-references-via-the-windows-1252-2"))).toBe("™");
			// `&#x9F;` remaps to U+0178 (Ÿ).
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-remap-c1-numeric-references-via-the-windows-1252-3"))).toBe("Ÿ");
			// C1 control codepoints with no remap entry pass through.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-remap-c1-numeric-references-via-the-windows-1252-4"))).toBe("");
		});

		it("should stay linear-time on long alphanumeric runs after `&`", () => {
			// Regression: longest-prefix backtrack must be capped at the longest
			// WHATWG entity name, otherwise inputs like `&` + thousands of chars
			// trigger O(n²) substring allocations.
			const longRun = "a".repeat(1000);
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-stay-linear-time-on-long-alphanumeric-runs-after"))).toBe(`&${longRun}`);
			// `&amp` prefix at the start still decodes; the rest is appended verbatim.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-stay-linear-time-on-long-alphanumeric-runs-after-2"))).toBe(`&${longRun}`);
		});

		it("should apply the consumed-as-part-of-an-attribute rule when asked", () => {
			// In text context, `&amp=foo` decodes to `&=foo`.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-apply-the-consumed-as-part-of-an-attribute-rule"))).toBe("&=foo");
			// In attribute context, the same input stays literal.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-apply-the-consumed-as-part-of-an-attribute-rule"), true)).toBe("&amp=foo");
			// `&amp;=foo` (with semicolon) decodes regardless of context.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-apply-the-consumed-as-part-of-an-attribute-rule-2"), true)).toBe("&=foo");
			// Longest-prefix leftover case: `&ampx` → `&amp` matches but leftover
			// `x` is alphanumeric, so in attribute context this stays literal.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-apply-the-consumed-as-part-of-an-attribute-rule-3"), true)).toBe("&ampX");
			// In text context it still decodes the prefix.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-apply-the-consumed-as-part-of-an-attribute-rule-3"))).toBe("&X");
		});
	});

	describe("decodeEntities with map", () => {
		it("should return the input and no map when nothing decodes", () => {
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-should-fast-path-strings-with-no"), false, true)).toEqual({
				text: "plain text",
				map: undefined
			});
			// Attribute rule keeps `&amp=1` literal — no map either.
			expect(decodeEntities(fixture("html", "tokenize-decode-entities-with-map-should-return-the-input-and-no-map-when"), true, true)).toEqual({
				text: "&amp=1",
				map: undefined
			});
		});

		it("should map decoded boundaries back to raw offsets", () => {
			const { text, map } = decodeEntities(fixture("html", "tokenize-parse-error-callback-does-not-report-missing-semicolon-for-a-named"), true, true);
			expect(text).toBe("a&b");
			// Boundaries: `a` 0, decoded `&` starts at raw 1, `b` at raw 6, end 7.
			expect(map).toEqual([0, 1, 6, 7]);
			// A decoded span maps to the covering raw span.
			expect(
				fixture("html", "tokenize-parse-error-callback-does-not-report-missing-semicolon-for-a-named").slice(
					/** @type {number[]} */ (map)[0],
					/** @type {number[]} */ (map)[3]
				)
			).toBe("a&amp;b");
		});

		it("should map around numeric references and trailing text", () => {
			const { text, map } = decodeEntities(fixture("html", "tokenize-decode-entities-with-map-should-map-around-numeric-references-and"), true, true);
			expect(text).toBe("x yz");
			expect(map).toEqual([0, 1, 6, 7, 8]);
		});
	});

	describe("escapeAttribute", () => {
		it("should return the input unchanged when nothing needs escaping", () => {
			const s = "plain value with spaces, <tags> and 'quotes'";
			expect(escapeAttribute(s)).toBe(s);
		});

		it("should escape the WHATWG attribute-mode set", () => {
			expect(escapeAttribute('a&b"c\u00A0d')).toBe("a&amp;b&quot;c&nbsp;d");
		});

		it("should not escape text-mode characters", () => {
			expect(escapeAttribute("<b>")).toBe("<b>");
		});

		it("should encode CR/LF as numeric references", () => {
			expect(escapeAttribute("a\nb\rc")).toBe("a&#10;b&#13;c");
		});

		it("should handle leading, trailing and consecutive escapes", () => {
			expect(escapeAttribute('"a""')).toBe("&quot;a&quot;&quot;");
			expect(escapeAttribute("&")).toBe("&amp;");
			expect(escapeAttribute("")).toBe("");
		});

		it("should escape only the delimiting quote", () => {
			// Whichever quote writes the value is escaped and the other stands
			// literal, which is what makes `alt='say "hi"'` legal.
			const apostrophe = "'".charCodeAt(0);
			expect(escapeAttribute("a\"b'c")).toBe("a&quot;b'c");
			expect(escapeAttribute("a\"b'c", apostrophe)).toBe('a"b&#39;c');
			expect(escapeAttribute("a&b c\nd\re", apostrophe)).toBe(
				"a&amp;b&nbsp;c&#10;d&#13;e"
			);
			// The fast path has to test the delimiter it was given, not `"`.
			expect(escapeAttribute('say "hi"', apostrophe)).toBe('say "hi"');
			expect(escapeAttribute("plain", apostrophe)).toBe("plain");
		});

		it("leaves U+00A0 literal only where the caller minifies", () => {
			// Generated markup stays ASCII-safe; the minifier writes the character,
			// as `_escapeTextContent` does for a text node. Both the fast path and
			// the loop have to answer the same way.
			const quote = '"'.charCodeAt(0);
			expect(escapeAttribute('c"d\u00A0e', quote, true)).toBe(
				"c&quot;d\u00A0e"
			);
			expect(escapeAttribute('c"d\u00A0e', quote)).toBe("c&quot;d&nbsp;e");
			expect(escapeAttribute("a\u00A0b", quote, true)).toBe("a\u00A0b");
			expect(escapeAttribute("a\u00A0b", quote)).toBe("a&nbsp;b");
		});
	});

	describe("escapeText", () => {
		it("should return the input unchanged when nothing needs escaping", () => {
			const s = 'plain text with "quotes" and spaces';
			expect(escapeText(s)).toBe(s);
		});

		it("should escape the WHATWG text-mode set", () => {
			expect(escapeText("a&b<c>d\u00A0e")).toBe("a&amp;b&lt;c&gt;d&nbsp;e");
		});

		it("should not escape quotes", () => {
			expect(escapeText("\"'")).toBe("\"'");
		});

		it("should encode CR/LF as numeric references", () => {
			expect(escapeText("a\nb\rc")).toBe("a&#10;b&#13;c");
		});
	});

	it("labels every state's case with that state's number", () => {
		// The state switch has literal labels, so only a label's comment ties
		// it to the constant the transitions assign.
		const source = fs.readFileSync(
			require.resolve("../../../lib/html/syntax-parser"),
			"utf8"
		);
		/**
		 * @param {RegExp} regexp a global pattern capturing a name and a number
		 * @param {number} name index of the group holding the name
		 * @returns {string[]} every match as `name = number`, sorted
		 */
		const pairs = (regexp, name) => {
			/** @type {string[]} */
			const found = [];
			for (let m = regexp.exec(source); m !== null; m = regexp.exec(source)) {
				found.push(`${m[name]} = ${m[3 - name]}`);
			}
			return found.sort();
		};
		const states = pairs(/^const (STATE_[A-Z_]+) = (\d+);$/gm, 1);
		const labels = pairs(/^\t+case (\d+): \/[/*] (STATE_[A-Z_]+)\b/gm, 2);
		expect(states).toHaveLength(80);
		expect(labels).toEqual(states);
	});

	it("takes the start offset and the callbacks as optional", () => {
		const source = fixture(
			"html",
			"tokenize-coverage-state-machine-branches-default-arguments-walks-with-no-pos"
		);
		expect(tokenize(source)).toBe(source.length);
	});

	it("reads a CDATA section with no comment callback", () => {
		/** @type {string[]} */
		const codes = [];
		const callbacks = {
			isForeign: () => true,
			/**
			 * @param {string} input source
			 * @param {string} code error code
			 * @returns {void}
			 */
			parseError: (input, code) => {
				codes.push(code);
			}
		};
		for (const name of ["3", "4"]) {
			const source = fixture(
				"html",
				`tokenize-content-modes-cdata-and-nul-arcs-cdata-sections-in-foreign-content-${name}`
			);
			expect(tokenize(source, 0, callbacks)).toBe(source.length);
		}
		expect(codes).toEqual([
			"eof-in-cdata",
			"unexpected-null-character",
			"unexpected-null-character"
		]);
	});

	it("reads a named reference the same wherever the input repeats it", () => {
		// `lt;`, `le;` and `lx;` share a first character and a length, and only
		// the first two are names; `nope;` is none however often it comes.
		/** @type {[string, number][]} */
		const errors = [];
		tokenize(
			fixture("html", "tokenize-reads-a-named-reference-the-same-wherever-the-input-repeats-it"),
			0,
			{
				parseError: (input, code, start) => {
					errors.push([code, start]);
				}
			}
		);
		expect(errors).toEqual([
			["unknown-named-character-reference", 19],
			["unknown-named-character-reference", 25],
			["unknown-named-character-reference", 31],
			["missing-semicolon-after-character-reference", 35],
			["unknown-named-character-reference", 54]
		]);
	});
});



describe("a tag whose name a NUL interrupts", () => {
	it("ends at the `>` the tag-name state reads", () => {
		// The name scan stops on the NUL, so the `>` after it is left to the
		// state; the first open tag's callback also skips a character ahead.
		/** @type {[string, string, number, number][]} */
		const tags = [];
		/** @type {[string, number][]} */
		const errors = [];
		let skip = 1;
		tokenize(fixture("html", "a-tag-whose-name-a-nul-interrupts-ends-at-the-the-tag-name-state-reads"), 0, {
			openTag: (input, start, end, ns, ne) => {
				tags.push(["open", input.slice(ns, ne), start, end]);
				const next = end + skip;
				skip = 0;
				return next;
			},
			closeTag: (input, start, end, ns, ne) => {
				tags.push(["close", input.slice(ns, ne), start, end]);
				return end;
			},
			parseError: (input, code, start) => {
				errors.push([code, start]);
			}
		});
		expect(tags).toEqual([
			["open", "a\0b", 0, 5],
			["close", "a\0b", 6, 12],
			["open", "c\0", 12, 16]
		]);
		expect(errors).toEqual([
			["unexpected-null-character", 2],
			["unexpected-null-character", 9],
			["unexpected-null-character", 14]
		]);
	});
});

describe("HtmlSyntax — Infra string helpers", () => {
	const {
		asciiLowercase,
		stripAsciiWhitespace
	} = require("../../../lib/html/syntax-parser");

	it("folds only ASCII letters", () => {
		expect(asciiLowercase("DIV")).toBe("div");
		// U+212A KELVIN SIGN is no ASCII letter, though `toLowerCase` maps it to `k`.
		expect(asciiLowercase("K")).toBe("K");
		const lower = "already lower";
		expect(asciiLowercase(lower)).toBe(lower);
	});

	it("strips ASCII whitespace but keeps NBSP", () => {
		expect(stripAsciiWhitespace(" \t\n x \f\r")).toBe("x");
		expect(stripAsciiWhitespace(" x ")).toBe(" x ");
	});
});
