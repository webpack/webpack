"use strict";

// cspell:ignore apos notpre Elig reconsumes xyzabc zzzunknown codepoint DFFF ampx noncharacter FFFE
// cspell:ignore selectedcontent mtext mglyph colgroups viewbox definitionurl

const fs = require("fs");
const path = require("path");
const {
	A,
	NS_HTML,
	NS_MATHML,
	NS_SVG,
	NodeType,
	QUOTE_DOUBLE,
	QUOTE_NONE,
	QUOTE_SINGLE,
	decodeEntities,
	escapeAttribute,
	escapeText,
	parseHtml: parseHtmlRefs,
	tokenize
} = require("../lib/html/syntax");

describe("tokenize", () => {
	const casesPath = path.resolve(__dirname, "./fixtures/html/parsing/cases");
	const tests = fs
		.readdirSync(casesPath)
		.filter((test) => /\.html$/.test(test))
		.map((item) => [
			item,
			fs.readFileSync(path.resolve(casesPath, item), "utf8")
		]);

	for (const [name, code] of tests) {
		it(`should tokenize and roundtrip "${name}"`, () => {
			/** @type {unknown[]} */
			const results = [];

			tokenize(code, 0, {
				openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
					results.push([
						"open-tag",
						input.slice(start, end),
						input.slice(nameStart, nameEnd),
						selfClosing
					]);
					return end;
				},
				closeTag: (input, start, end, nameStart, nameEnd) => {
					results.push([
						"close-tag",
						input.slice(start, end),
						input.slice(nameStart, nameEnd)
					]);
					return end;
				},
				attribute: (
					input,
					nameStart,
					nameEnd,
					valueStart,
					valueEnd,
					quoteType
				) => {
					const attrName = input.slice(nameStart, nameEnd);
					const attrValue =
						valueStart === -1 ? null : input.slice(valueStart, valueEnd);
					results.push(["attribute", attrName, attrValue, quoteType]);
					// Return position after the value (or after the name for boolean attrs)
					if (valueStart === -1) return nameEnd;
					if (quoteType === QUOTE_DOUBLE) {
						return valueEnd + 1;
					}
					if (quoteType === QUOTE_SINGLE) {
						return valueEnd + 1;
					}
					return valueEnd;
				},
				comment: (input, start, end) => {
					results.push(["comment", input.slice(start, end)]);
					return end;
				},
				doctype: (input, start, end) => {
					results.push(["doctype", input.slice(start, end)]);
					return end;
				},
				text: (input, start, end) => {
					results.push(["text", input.slice(start, end)]);
					return end;
				}
			});

			// Snapshot the full token stream, including text tokens
			expect(results).toMatchSnapshot();

			// Roundtrip: concatenating all token values must reconstruct the original
			/** @type {unknown[]} */
			const reconstructed = [];
			tokenize(code, 0, {
				openTag: (input, start, end) => {
					reconstructed.push(input.slice(start, end));
					return end;
				},
				closeTag: (input, start, end) => {
					reconstructed.push(input.slice(start, end));
					return end;
				},
				comment: (input, start, end) => {
					reconstructed.push(input.slice(start, end));
					return end;
				},
				doctype: (input, start, end) => {
					reconstructed.push(input.slice(start, end));
					return end;
				},
				text: (input, start, end) => {
					reconstructed.push(input.slice(start, end));
					return end;
				}
			});

			expect(reconstructed.join("")).toBe(code);
		});
	}

	it("should handle empty input", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("", 0, {
			text: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual([]);
	});

	it("should handle plain text with no tags", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("hello world", 0, {
			text: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual(["hello world"]);
	});

	it("should detect self-closing tags", () => {
		/** @type {unknown[]} */
		const tags = [];
		tokenize("<br/><img src='x'/>", 0, {
			openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
				tags.push([input.slice(nameStart, nameEnd), selfClosing]);
				return end;
			}
		});
		expect(tags).toEqual([
			["br", true],
			["img", true]
		]);
	});

	it("should parse boolean attributes", () => {
		/** @type {unknown[]} */
		const attrs = [];
		tokenize('<input disabled required type="text">', 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([
					input.slice(ns, ne),
					vs === -1 ? null : input.slice(vs, ve)
				]);
				if (vs === -1) return ne;
				if (qt !== QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([
			["disabled", null],
			["required", null],
			["type", "text"]
		]);
	});

	it("should handle all quote types", () => {
		/** @type {unknown[]} */
		const attrs = [];
		tokenize("<div a=\"1\" b='2' c=3>", 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve), qt]);
				if (qt !== QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([
			["a", "1", QUOTE_DOUBLE],
			["b", "2", QUOTE_SINGLE],
			["c", "3", QUOTE_NONE]
		]);
	});

	it("should parse comments", () => {
		/** @type {unknown[]} */
		const comments = [];
		tokenize("before<!-- hi -->after", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<!-- hi -->"]);
	});

	it("should handle lone < at EOF", () => {
		/** @type {unknown[]} */
		const texts = [];
		tokenize("hello<", 0, {
			text: (input, start, end) => {
				texts.push(input.slice(start, end));
				return end;
			}
		});
		expect(texts).toEqual(["hello<"]);
	});

	it("should parse DOCTYPE as doctype", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<!DOCTYPE html><div>hi</div>", 0, {
			doctype: (input, start, end) => {
				results.push(["doctype", input.slice(start, end)]);
				return end;
			},
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["doctype", "<!DOCTYPE html>"],
			["open", "div"],
			["text", "hi"],
			["close", "div"]
		]);
	});

	it("should parse DOCTYPE case-insensitively", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<!doctype html><!DoCtYpE html>", 0, {
			doctype: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual(["<!doctype html>", "<!DoCtYpE html>"]);
	});

	it("should handle CDATA sections", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<div><![CDATA[<img src='x'>]]></div>", 0, {
			comment: (input, start, end) => {
				results.push(["comment", input.slice(start, end)]);
				return end;
			},
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			}
		});
		// CDATA content should NOT be parsed as tags
		expect(results).toEqual([
			["open", "div"],
			["comment", "<![CDATA[<img src='x'>]]>"],
			["close", "div"]
		]);
	});

	it("should handle nested brackets in CDATA", () => {
		/** @type {unknown[]} */
		const comments = [];
		tokenize("<![CDATA[a]b]]c]]>", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<![CDATA[a]b]]c]]>"]);
	});

	it("should handle nested <!-- inside comments", () => {
		/** @type {unknown[]} */
		const comments = [];
		tokenize("<!-- outer <!-- inner -->", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<!-- outer <!-- inner -->"]);
	});

	it("should handle EOF in DOCTYPE", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<!DOCTYPE html", 0, {
			doctype: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual(["<!DOCTYPE html"]);
	});

	it("should handle EOF in CDATA", () => {
		/** @type {unknown[]} */
		const comments = [];
		tokenize("<![CDATA[unclosed", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<![CDATA[unclosed"]);
	});

	it("should roundtrip DOCTYPE + tags + CDATA", () => {
		const html = "<!DOCTYPE html><html><body><![CDATA[data]]></body></html>";
		/** @type {unknown[]} */
		const parts = [];
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			comment: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			doctype: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	it("should handle RCDATA for title element", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<title>Hello <b>World</b></title>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "title"],
			["text", "Hello <b>World</b>"],
			["close", "title"]
		]);
	});

	it("should handle RCDATA for textarea element", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<textarea><p>not a tag</p></textarea>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "textarea"],
			["text", "<p>not a tag</p>"],
			["close", "textarea"]
		]);
	});

	it("should handle RAWTEXT for style element", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<style>.a { color: red; }</style>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "style"],
			["text", ".a { color: red; }"],
			["close", "style"]
		]);
	});

	it("should handle RAWTEXT for iframe and noembed elements", () => {
		for (const tag of ["iframe", "noembed"]) {
			/** @type {unknown[]} */
			const results = [];
			tokenize(`<${tag}><b>not a tag</b></${tag}>`, 0, {
				openTag: (input, start, end, ns, ne) => {
					results.push(["open", input.slice(ns, ne)]);
					return end;
				},
				closeTag: (input, start, end, ns, ne) => {
					results.push(["close", input.slice(ns, ne)]);
					return end;
				},
				text: (input, start, end) => {
					results.push(["text", input.slice(start, end)]);
					return end;
				}
			});
			expect(results).toEqual([
				["open", tag],
				["text", "<b>not a tag</b>"],
				["close", tag]
			]);
		}
	});

	it("should handle script data state", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<script>var x = 1 < 2;</script>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "script"],
			["text", "var x = 1 < 2;"],
			["close", "script"]
		]);
	});

	it("should handle script data escaped state (<!-- inside script)", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<script><!--- comment --></script>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "script"],
			["text", "<!--- comment -->"],
			["close", "script"]
		]);
	});

	it("should handle script data double escaped state transitions (<script and </script)", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<script><!-- <script> var x = 1; </script> --></script>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "script"],
			["text", "<!-- <script> var x = 1; </script> -->"],
			["close", "script"]
		]);
	});

	it("should not exit script-data-double-escaped on tag prefixes longer than 'script'", () => {
		// Regression: tempBuffer in script-data-double-escape-end-state must
		// accumulate the full tag name (per WHATWG spec). With a length cap,
		// `</scripts>` (or any longer prefix) would falsely match `"script"`
		// and prematurely exit the double-escaped state.
		const html = "<script><!--<script>x</scripts>y</script>--></script>";
		/** @type {unknown[]} */
		const results = [];
		tokenize(html, 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "script"],
			["text", "<!--<script>x</scripts>y</script>-->"],
			["close", "script"]
		]);
	});

	it("should preserve script content when close tag is reached from escaped state without `-->`", () => {
		// Regression: when the matching `</script>` is emitted directly from
		// SCRIPT_DATA_ESCAPED (no transition back through SCRIPT_DATA via `-->`),
		// `tagStart` must point to the `<` of the actual close tag — otherwise
		// `flushText(tagStart)` emits an empty range and the script body is lost.
		const html = "<script><!--<script></script></script>";
		/** @type {unknown[]} */
		const results = [];
		tokenize(html, 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "script"],
			["text", "<!--<script></script>"],
			["close", "script"]
		]);
	});

	it("should not match wrong end tag in RCDATA", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<title>text</div></title>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "title"],
			["text", "text</div>"],
			["close", "title"]
		]);
	});

	it("should handle case-insensitive end tags in content modes", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<style>.a{}</STYLE>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "style"],
			["text", ".a{}"],
			["close", "STYLE"]
		]);
	});

	it("should roundtrip HTML with script and style", () => {
		const html =
			"<html><head><style>.a{}</style></head><body><script>var x=1;</script></body></html>";
		/** @type {unknown[]} */
		const parts = [];
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	it("should handle PLAINTEXT state", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<div><plaintext><p>ignored</p></div>", 0, {
			openTag: (input, start, end, ns, ne) => {
				results.push(["open", input.slice(ns, ne)]);
				return end;
			},
			closeTag: (input, start, end, ns, ne) => {
				results.push(["close", input.slice(ns, ne)]);
				return end;
			},
			text: (input, start, end) => {
				results.push(["text", input.slice(start, end)]);
				return end;
			}
		});
		expect(results).toEqual([
			["open", "div"],
			["open", "plaintext"],
			["text", "<p>ignored</p></div>"]
		]);
	});

	it("should handle named character references in text", () => {
		/** @type {unknown[]} */
		const parts = [];
		const html = "<p>Tom &amp; Jerry</p>";
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	it("should handle named character references in double-quoted attributes", () => {
		/** @type {unknown[]} */
		const attrs = [];
		tokenize('<a href="?a=1&amp;b=2">', 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve)]);
				if (qt !== QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([["href", "?a=1&amp;b=2"]]);
	});

	it("should handle named character references in single-quoted attributes", () => {
		/** @type {unknown[]} */
		const attrs = [];
		tokenize("<a href='?x=1&lt;2'>", 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve)]);
				if (qt !== QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([["href", "?x=1&lt;2"]]);
	});

	it("should handle character references in unquoted attributes", () => {
		/** @type {unknown[]} */
		const attrs = [];
		tokenize("<a href=foo&amp;bar>", 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve)]);
				if (qt !== QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([["href", "foo&amp;bar"]]);
	});

	it("should handle decimal numeric character references", () => {
		/** @type {unknown[]} */
		const parts = [];
		const html = "<p>&#65;&#66;&#67;</p>";
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	it("should handle hexadecimal character references", () => {
		/** @type {unknown[]} */
		const parts = [];
		const html = "<p>&#x41;&#X42;</p>";
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	it("should handle bare ampersand (not a character reference)", () => {
		/** @type {unknown[]} */
		const parts = [];
		const html = "<p>bare & alone</p>";
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	it("should handle unknown named character references", () => {
		/** @type {unknown[]} */
		const parts = [];
		const html = "<p>&unknown;</p>";
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	it("should handle empty numeric character references (&#; and &#x;)", () => {
		/** @type {unknown[]} */
		const parts = [];
		const html = "<p>&#;&#x;</p>";
		tokenize(html, 0, {
			openTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			closeTag: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			},
			text: (input, start, end) => {
				parts.push(input.slice(start, end));
				return end;
			}
		});
		expect(parts.join("")).toBe(html);
	});

	describe("coverage: state-machine branches", () => {
		/**
		 * @param {string} html input
		 * @returns {[string, ...EXPECTED_ANY[]][]} token stream
		 */
		const walk = (html) => {
			/** @type {[string, ...EXPECTED_ANY[]][]} */
			const out = [];
			tokenize(html, 0, {
				openTag: (input, start, end, ns, ne, selfClosing) => {
					out.push(["open", input.slice(ns, ne), selfClosing]);
					return end;
				},
				closeTag: (input, start, end, ns, ne) => {
					out.push(["close", input.slice(ns, ne)]);
					return end;
				},
				attribute: (input, ns, ne, vs, ve, qt) => {
					out.push([
						"attr",
						input.slice(ns, ne),
						vs === -1 ? null : input.slice(vs, ve),
						qt
					]);
					if (vs === -1) return ne;
					if (qt !== QUOTE_NONE) return ve + 1;
					return ve;
				},
				comment: (input, start, end) => {
					out.push(["comment", input.slice(start, end)]);
					return end;
				},
				doctype: (input, start, end) => {
					out.push(["doctype", input.slice(start, end)]);
					return end;
				},
				text: (input, start, end) => {
					out.push(["text", input.slice(start, end)]);
					return end;
				}
			});
			return out;
		};

		/**
		 * @param {string} html input
		 * @returns {string} reconstructed html
		 */
		const roundtrip = (html) => {
			/** @type {unknown[]} */
			const parts = [];
			tokenize(html, 0, {
				openTag: (input, start, end) => {
					parts.push(input.slice(start, end));
					return end;
				},
				closeTag: (input, start, end) => {
					parts.push(input.slice(start, end));
					return end;
				},
				comment: (input, start, end) => {
					parts.push(input.slice(start, end));
					return end;
				},
				doctype: (input, start, end) => {
					parts.push(input.slice(start, end));
					return end;
				},
				text: (input, start, end) => {
					parts.push(input.slice(start, end));
					return end;
				}
			});
			return parts.join("");
		};

		// --- STATE_TAG_OPEN ---
		it("tAG_OPEN: `<?xml ?>` becomes bogus comment", () => {
			expect(walk("a<?pi?>b")).toEqual([
				["text", "a"],
				["comment", "<?pi?>"],
				["text", "b"]
			]);
		});

		it("tAG_OPEN: `<` followed by non-tag char stays as text (reconsume in DATA)", () => {
			expect(walk("a< b")).toEqual([["text", "a< b"]]);
			expect(walk("1<2")).toEqual([["text", "1<2"]]);
		});

		// --- STATE_END_TAG_OPEN ---
		it("eND_TAG_OPEN: `</>` is missing-end-tag-name (kept in text span for roundtrip)", () => {
			// Per spec this is a parse error and no token is emitted. The walker
			// preserves `</>` as part of the surrounding text span so roundtrip
			// reconstruction is exact.
			expect(walk("a</>b")).toEqual([["text", "a</>b"]]);
		});

		it("eND_TAG_OPEN: `</1foo>` becomes bogus comment", () => {
			expect(walk("a</1bar>b")).toEqual([
				["text", "a"],
				["comment", "</1bar>"],
				["text", "b"]
			]);
		});

		// --- STATE_BEFORE_ATTRIBUTE_NAME ---
		it("bEFORE_ATTR_NAME: `/` reconsumes in AFTER_ATTR_NAME → self-closing", () => {
			expect(walk("<br />")).toEqual([["open", "br", true]]);
		});

		it("bEFORE_ATTR_NAME: `=` starts attribute name with `=` (per spec)", () => {
			expect(walk("<a =foo>")).toEqual([
				["attr", "=foo", null, QUOTE_NONE],
				["open", "a", false]
			]);
		});

		// --- STATE_AFTER_ATTRIBUTE_NAME ---
		it("aFTER_ATTR_NAME: space then `/` self-closes", () => {
			expect(walk("<br foo />")).toEqual([
				["attr", "foo", null, QUOTE_NONE],
				["open", "br", true]
			]);
		});

		it("aFTER_ATTR_NAME: space then `=` switches to BEFORE_ATTR_VALUE", () => {
			expect(walk("<a foo = 'bar'>")).toEqual([
				["attr", "foo", "bar", QUOTE_SINGLE],
				["open", "a", false]
			]);
		});

		it("aFTER_ATTR_NAME: `>` closing on a close tag form `</a foo >`", () => {
			expect(walk("<a></a foo >")).toEqual([
				["open", "a", false],
				["attr", "foo", null, QUOTE_NONE],
				["close", "a"]
			]);
		});

		it("aFTER_ATTR_NAME: new attribute begins after whitespace", () => {
			expect(walk("<a foo bar>")).toEqual([
				["attr", "foo", null, QUOTE_NONE],
				["attr", "bar", null, QUOTE_NONE],
				["open", "a", false]
			]);
		});

		// --- STATE_BEFORE_ATTRIBUTE_VALUE ---
		it("bEFORE_ATTR_VALUE: leading whitespace before value is ignored", () => {
			expect(walk("<a foo=   'bar'>")).toEqual([
				["attr", "foo", "bar", QUOTE_SINGLE],
				["open", "a", false]
			]);
		});

		it("bEFORE_ATTR_VALUE: `>` after `=` emits attribute with empty value", () => {
			// Per spec, `<a foo=>` is a missing-attribute-value parse error and
			// `foo` is created with the empty string. The walker reports an empty
			// value range pointing at `>`.
			expect(walk("<a foo=>")).toEqual([
				["attr", "foo", "", QUOTE_NONE],
				["open", "a", false]
			]);
		});

		it("bEFORE_ATTR_VALUE: `>` after `=` on close tag form", () => {
			expect(walk("<a></a foo=>")).toEqual([
				["open", "a", false],
				["attr", "foo", "", QUOTE_NONE],
				["close", "a"]
			]);
		});

		// --- STATE_ATTRIBUTE_VALUE_UNQUOTED ---
		it("aTTR_VALUE_UNQUOTED: space terminates value", () => {
			expect(walk("<a foo=bar baz>")).toEqual([
				["attr", "foo", "bar", QUOTE_NONE],
				["attr", "baz", null, QUOTE_NONE],
				["open", "a", false]
			]);
		});

		it("aTTR_VALUE_UNQUOTED: `>` on close tag form", () => {
			expect(walk("<a></a foo=bar>")).toEqual([
				["open", "a", false],
				["attr", "foo", "bar", QUOTE_NONE],
				["close", "a"]
			]);
		});

		// --- STATE_AFTER_ATTRIBUTE_VALUE_QUOTED ---
		it("aFTER_ATTR_VALUE_QUOTED: `/` self-closes", () => {
			expect(walk('<br foo="bar"/>')).toEqual([
				["attr", "foo", "bar", QUOTE_DOUBLE],
				["open", "br", true]
			]);
		});

		it("aFTER_ATTR_VALUE_QUOTED: `>` on close tag form", () => {
			expect(walk('<a></a foo="bar">')).toEqual([
				["open", "a", false],
				["attr", "foo", "bar", QUOTE_DOUBLE],
				["close", "a"]
			]);
		});

		it("aFTER_ATTR_VALUE_QUOTED: anything else reconsumes (missing-whitespace)", () => {
			expect(walk('<a foo="x"bar>')).toEqual([
				["attr", "foo", "x", QUOTE_DOUBLE],
				["attr", "bar", null, QUOTE_NONE],
				["open", "a", false]
			]);
		});

		// --- STATE_SELF_CLOSING_START_TAG ---
		it("sELF_CLOSING: on close-tag form (treated as close, not self-close)", () => {
			expect(walk("<a></a/>")).toEqual([
				["open", "a", false],
				["close", "a"]
			]);
		});

		it("sELF_CLOSING: garbage char reconsumes in BEFORE_ATTR_NAME", () => {
			expect(walk("<br /foo>")).toEqual([
				["attr", "foo", null, QUOTE_NONE],
				["open", "br", false]
			]);
		});

		// --- STATE_MARKUP_DECLARATION_OPEN anything else (bogus comment) ---
		it("mARKUP_DECLARATION_OPEN: `<!foo>` → bogus comment", () => {
			expect(walk("a<!foo>b")).toEqual([
				["text", "a"],
				["comment", "<!foo>"],
				["text", "b"]
			]);
		});

		// --- STATE_COMMENT_START ---
		it("cOMMENT_START: `<!-->` abrupt-closing-of-empty-comment", () => {
			expect(walk("a<!-->b")).toEqual([
				["text", "a"],
				["comment", "<!-->"],
				["text", "b"]
			]);
		});

		// --- STATE_COMMENT_START_DASH ---
		it("cOMMENT_START_DASH: `<!--->` abrupt-closing-of-empty-comment", () => {
			expect(walk("a<!--->b")).toEqual([
				["text", "a"],
				["comment", "<!--->"],
				["text", "b"]
			]);
		});

		it("cOMMENT_START_DASH: `<!--- text -->`", () => {
			expect(walk("a<!--- x -->b")).toEqual([
				["text", "a"],
				["comment", "<!--- x -->"],
				["text", "b"]
			]);
		});

		// --- STATE_COMMENT (with `<` and various) ---
		it("cOMMENT: `<` enters comment-less-than-sign and back", () => {
			expect(walk("<!-- a < b -->")).toEqual([["comment", "<!-- a < b -->"]]);
		});

		// --- STATE_COMMENT_END_DASH ---
		it("cOMMENT_END_DASH: dash then non-dash returns to comment", () => {
			expect(walk("<!-- a -b -->")).toEqual([["comment", "<!-- a -b -->"]]);
		});

		// --- STATE_COMMENT_END ---
		it("cOMMENT_END: extra `-` stays in comment-end", () => {
			expect(walk("<!-- a ---->")).toEqual([["comment", "<!-- a ---->"]]);
		});

		it("cOMMENT_END: anything-else returns to comment", () => {
			expect(walk("<!-- a --b -->")).toEqual([["comment", "<!-- a --b -->"]]);
		});

		// --- STATE_COMMENT_END_BANG ---
		it("cOMMENT_END_BANG: `--!-` continues as comment-end-dash", () => {
			expect(walk("<!-- a --!- -->")).toEqual([["comment", "<!-- a --!- -->"]]);
		});

		it("cOMMENT_END_BANG: `--!>` incorrectly-closed-comment", () => {
			expect(walk("a<!-- x --!>b")).toEqual([
				["text", "a"],
				["comment", "<!-- x --!>"],
				["text", "b"]
			]);
		});

		it("cOMMENT_END_BANG: anything-else returns to comment", () => {
			expect(walk("<!-- a --!b -->")).toEqual([["comment", "<!-- a --!b -->"]]);
		});

		// --- STATE_COMMENT_LESS_THAN_SIGN family ---
		it("cOMMENT_LESS_THAN_SIGN: `<!--<!--->`", () => {
			expect(walk("<!--<!--->")).toEqual([["comment", "<!--<!--->"]]);
		});

		it("cOMMENT_LESS_THAN_SIGN: extra `<` stays in less-than-sign", () => {
			expect(walk("<!-- << -->")).toEqual([["comment", "<!-- << -->"]]);
		});

		it("cOMMENT_LESS_THAN_SIGN_BANG: not followed by `-`", () => {
			// Need a `<` while already in COMMENT (not COMMENT_START), so put
			// content before the nested `<!`.
			expect(walk("<!-- a<!x-->")).toEqual([["comment", "<!-- a<!x-->"]]);
		});

		it("cOMMENT_LESS_THAN_SIGN_BANG_DASH: not followed by `-`", () => {
			expect(walk("<!-- a<!-x-->")).toEqual([["comment", "<!-- a<!-x-->"]]);
		});

		it("cOMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: nested comment parse error", () => {
			expect(walk("<!--<!---->")).toEqual([["comment", "<!--<!---->"]]);
		});

		// --- STATE_DOCTYPE ---
		it("dOCTYPE: `<!DOCTYPE>` missing-doctype-name", () => {
			expect(walk("<!DOCTYPE>")).toEqual([["doctype", "<!DOCTYPE>"]]);
		});

		it("dOCTYPE: `<!DOCTYPEhtml>` missing-whitespace-before-doctype-name", () => {
			expect(walk("<!DOCTYPEhtml>")).toEqual([["doctype", "<!DOCTYPEhtml>"]]);
		});

		// --- STATE_BEFORE_DOCTYPE_NAME ---
		it("bEFORE_DOCTYPE_NAME: ignores leading whitespace", () => {
			expect(walk("<!DOCTYPE   html>")).toEqual([
				["doctype", "<!DOCTYPE   html>"]
			]);
		});

		it("bEFORE_DOCTYPE_NAME: NULL char", () => {
			expect(walk("<!DOCTYPE \0name>")).toEqual([
				["doctype", "<!DOCTYPE \0name>"]
			]);
		});

		// --- STATE_DOCTYPE_NAME with NULL ---
		it("dOCTYPE_NAME: NULL char in name", () => {
			expect(walk("<!DOCTYPE htm\0l>")).toEqual([
				["doctype", "<!DOCTYPE htm\0l>"]
			]);
		});

		// --- STATE_AFTER_DOCTYPE_NAME ---
		it("aFTER_DOCTYPE_NAME: trailing whitespace then `>` closes", () => {
			expect(walk("<!DOCTYPE html  >")).toEqual([
				["doctype", "<!DOCTYPE html  >"]
			]);
		});

		it("aFTER_DOCTYPE_NAME: invalid keyword → bogus doctype", () => {
			expect(walk("<!DOCTYPE html FOO>")).toEqual([
				["doctype", "<!DOCTYPE html FOO>"]
			]);
		});

		// --- STATE_AFTER_DOCTYPE_PUBLIC_KEYWORD ---
		it("aFTER_DOCTYPE_PUBLIC_KEYWORD: with whitespace and quoted public id", () => {
			expect(
				walk('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">')
			).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">']
			]);
		});

		it("aFTER_DOCTYPE_PUBLIC_KEYWORD: missing-whitespace then quoted", () => {
			expect(walk('<!DOCTYPE html PUBLIC"abc">')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC"abc">']
			]);
		});

		it("aFTER_DOCTYPE_PUBLIC_KEYWORD: missing-whitespace then single-quoted", () => {
			expect(walk("<!DOCTYPE html PUBLIC'abc'>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC'abc'>"]
			]);
		});

		it("aFTER_DOCTYPE_PUBLIC_KEYWORD: `>` missing-doctype-public-identifier", () => {
			expect(walk("<!DOCTYPE html PUBLIC>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC>"]
			]);
		});

		it("aFTER_DOCTYPE_PUBLIC_KEYWORD: garbage → bogus doctype", () => {
			expect(walk("<!DOCTYPE html PUBLICx>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLICx>"]
			]);
		});

		// --- STATE_BEFORE_DOCTYPE_PUBLIC_IDENTIFIER ---
		it("bEFORE_DOCTYPE_PUBLIC_ID: extra whitespace is ignored", () => {
			// First space transitions AFTER_DOCTYPE_PUBLIC_KEYWORD →
			// BEFORE_DOCTYPE_PUBLIC_IDENTIFIER. Second space is ignored inside
			// BEFORE_DOCTYPE_PUBLIC_IDENTIFIER itself.
			expect(walk('<!DOCTYPE html PUBLIC   "abc">')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC   "abc">']
			]);
		});

		it("bEFORE_DOCTYPE_PUBLIC_ID: single-quoted public id", () => {
			expect(walk("<!DOCTYPE html PUBLIC  'abc'>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC  'abc'>"]
			]);
		});

		it("bEFORE_DOCTYPE_PUBLIC_ID: `>` missing-doctype-public-identifier", () => {
			expect(walk("<!DOCTYPE html PUBLIC >")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC >"]
			]);
		});

		it("bEFORE_DOCTYPE_PUBLIC_ID: garbage → bogus doctype", () => {
			expect(walk("<!DOCTYPE html PUBLIC x>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC x>"]
			]);
		});

		// --- STATE_DOCTYPE_PUBLIC_IDENTIFIER_* ---
		it("dOCTYPE_PUBLIC_ID_DOUBLE: NULL inside id", () => {
			expect(walk('<!DOCTYPE html PUBLIC "a\0b">')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "a\0b">']
			]);
		});

		it("dOCTYPE_PUBLIC_ID_DOUBLE: abrupt `>` closes doctype", () => {
			expect(walk('<!DOCTYPE html PUBLIC "abc>')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "abc>']
			]);
		});

		it("dOCTYPE_PUBLIC_ID_SINGLE: NULL inside id", () => {
			expect(walk("<!DOCTYPE html PUBLIC 'a\0b'>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC 'a\0b'>"]
			]);
		});

		it("dOCTYPE_PUBLIC_ID_SINGLE: abrupt `>` closes doctype", () => {
			expect(walk("<!DOCTYPE html PUBLIC 'abc>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC 'abc>"]
			]);
		});

		// --- STATE_AFTER_DOCTYPE_PUBLIC_IDENTIFIER ---
		it("aFTER_DOCTYPE_PUBLIC_ID: missing-whitespace-between then system id (double)", () => {
			expect(walk('<!DOCTYPE html PUBLIC "p""s">')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "p""s">']
			]);
		});

		it("aFTER_DOCTYPE_PUBLIC_ID: missing-whitespace-between then system id (single)", () => {
			expect(walk("<!DOCTYPE html PUBLIC \"p\"'s'>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC \"p\"'s'>"]
			]);
		});

		it("aFTER_DOCTYPE_PUBLIC_ID: garbage → bogus doctype", () => {
			expect(walk('<!DOCTYPE html PUBLIC "p"x>')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "p"x>']
			]);
		});

		// --- STATE_BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS ---
		it("bETWEEN_PUBLIC_AND_SYSTEM: extra whitespace is ignored", () => {
			expect(walk('<!DOCTYPE html PUBLIC "p"   "s">')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "p"   "s">']
			]);
		});

		it("bETWEEN_PUBLIC_AND_SYSTEM: space then system (double-quoted)", () => {
			expect(walk('<!DOCTYPE html PUBLIC "p" "s">')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "p" "s">']
			]);
		});

		it("bETWEEN_PUBLIC_AND_SYSTEM: space then system (single-quoted)", () => {
			expect(walk("<!DOCTYPE html PUBLIC 'p' 's'>")).toEqual([
				["doctype", "<!DOCTYPE html PUBLIC 'p' 's'>"]
			]);
		});

		it("bETWEEN_PUBLIC_AND_SYSTEM: `>` ends doctype", () => {
			expect(walk('<!DOCTYPE html PUBLIC "p" >')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "p" >']
			]);
		});

		it("bETWEEN_PUBLIC_AND_SYSTEM: garbage → bogus doctype", () => {
			expect(walk('<!DOCTYPE html PUBLIC "p" x>')).toEqual([
				["doctype", '<!DOCTYPE html PUBLIC "p" x>']
			]);
		});

		// --- STATE_AFTER_DOCTYPE_SYSTEM_KEYWORD ---
		it("aFTER_DOCTYPE_SYSTEM_KEYWORD: space then double-quoted", () => {
			expect(walk('<!DOCTYPE html SYSTEM "s">')).toEqual([
				["doctype", '<!DOCTYPE html SYSTEM "s">']
			]);
		});

		it("aFTER_DOCTYPE_SYSTEM_KEYWORD: missing-whitespace then double-quoted", () => {
			expect(walk('<!DOCTYPE html SYSTEM"s">')).toEqual([
				["doctype", '<!DOCTYPE html SYSTEM"s">']
			]);
		});

		it("aFTER_DOCTYPE_SYSTEM_KEYWORD: missing-whitespace then single-quoted", () => {
			expect(walk("<!DOCTYPE html SYSTEM's'>")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEM's'>"]
			]);
		});

		it("aFTER_DOCTYPE_SYSTEM_KEYWORD: `>` missing-doctype-system-identifier", () => {
			expect(walk("<!DOCTYPE html SYSTEM>")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEM>"]
			]);
		});

		it("aFTER_DOCTYPE_SYSTEM_KEYWORD: garbage → bogus doctype", () => {
			expect(walk("<!DOCTYPE html SYSTEMx>")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEMx>"]
			]);
		});

		// --- STATE_BEFORE_DOCTYPE_SYSTEM_IDENTIFIER ---
		it("bEFORE_DOCTYPE_SYSTEM_ID: single-quoted system id", () => {
			expect(walk("<!DOCTYPE html SYSTEM  's'>")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEM  's'>"]
			]);
		});

		it("bEFORE_DOCTYPE_SYSTEM_ID: `>` missing-doctype-system-identifier", () => {
			expect(walk("<!DOCTYPE html SYSTEM >")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEM >"]
			]);
		});

		it("bEFORE_DOCTYPE_SYSTEM_ID: garbage → bogus doctype", () => {
			expect(walk("<!DOCTYPE html SYSTEM x>")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEM x>"]
			]);
		});

		// --- STATE_DOCTYPE_SYSTEM_IDENTIFIER_* ---
		it("dOCTYPE_SYSTEM_ID_DOUBLE: NULL inside id", () => {
			expect(walk('<!DOCTYPE html SYSTEM "a\0b">')).toEqual([
				["doctype", '<!DOCTYPE html SYSTEM "a\0b">']
			]);
		});

		it("dOCTYPE_SYSTEM_ID_DOUBLE: abrupt `>` closes doctype", () => {
			expect(walk('<!DOCTYPE html SYSTEM "abc>')).toEqual([
				["doctype", '<!DOCTYPE html SYSTEM "abc>']
			]);
		});

		it("dOCTYPE_SYSTEM_ID_SINGLE: NULL inside id", () => {
			expect(walk("<!DOCTYPE html SYSTEM 'a\0b'>")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEM 'a\0b'>"]
			]);
		});

		it("dOCTYPE_SYSTEM_ID_SINGLE: abrupt `>` closes doctype", () => {
			expect(walk("<!DOCTYPE html SYSTEM 'abc>")).toEqual([
				["doctype", "<!DOCTYPE html SYSTEM 'abc>"]
			]);
		});

		// --- STATE_AFTER_DOCTYPE_SYSTEM_IDENTIFIER ---
		it("aFTER_DOCTYPE_SYSTEM_ID: whitespace then `>` closes", () => {
			expect(walk('<!DOCTYPE html SYSTEM "s"  >')).toEqual([
				["doctype", '<!DOCTYPE html SYSTEM "s"  >']
			]);
		});

		it("aFTER_DOCTYPE_SYSTEM_ID: garbage → bogus doctype", () => {
			expect(walk('<!DOCTYPE html SYSTEM "s" garbage>')).toEqual([
				["doctype", '<!DOCTYPE html SYSTEM "s" garbage>']
			]);
		});

		// --- STATE_BOGUS_DOCTYPE NULL ---
		it("bOGUS_DOCTYPE: NULL char is ignored", () => {
			expect(walk("<!DOCTYPE x bogus\0content>")).toEqual([
				["doctype", "<!DOCTYPE x bogus\0content>"]
			]);
		});

		// --- STATE_CDATA_SECTION_BRACKET anything else ---
		it("cDATA_SECTION_BRACKET: `]x` returns to CDATA section", () => {
			expect(walk("<![CDATA[a]x]]>")).toEqual([["comment", "<![CDATA[a]x]]>"]]);
		});

		// --- STATE_CDATA_SECTION_END with extra `]` ---
		it("cDATA_SECTION_END: extra `]` stays in CDATA_SECTION_END", () => {
			expect(walk("<![CDATA[a]]]>")).toEqual([["comment", "<![CDATA[a]]]>"]]);
		});

		// --- RCDATA end tag non-matching forms ---
		it("rCDATA_END_TAG_OPEN: non-alpha char emits `</` as text", () => {
			expect(walk("<title>a</1>b</title>")).toEqual([
				["open", "title", false],
				["text", "a</1>b"],
				["close", "title"]
			]);
		});

		it("rCDATA_END_TAG_NAME: non-matching space then continues as content", () => {
			expect(walk("<title>a</div b></title>")).toEqual([
				["open", "title", false],
				["text", "a</div b>"],
				["close", "title"]
			]);
		});

		it("rCDATA_END_TAG_NAME: non-matching `/` then continues as content", () => {
			expect(walk("<title>a</div/></title>")).toEqual([
				["open", "title", false],
				["text", "a</div/>"],
				["close", "title"]
			]);
		});

		it("rCDATA_END_TAG_NAME: matching with space → attributes", () => {
			expect(walk("<title>a</title foo>")).toEqual([
				["open", "title", false],
				["text", "a"],
				["attr", "foo", null, QUOTE_NONE],
				["close", "title"]
			]);
		});

		it("rCDATA_END_TAG_NAME: matching with `/` → self-closing close tag form", () => {
			expect(walk("<title>a</title/>")).toEqual([
				["open", "title", false],
				["text", "a"],
				["close", "title"]
			]);
		});

		it("rCDATA_END_TAG_NAME: non-alpha garbage falls through to text", () => {
			expect(walk("<title>a</title!b</title>")).toEqual([
				["open", "title", false],
				["text", "a</title!b"],
				["close", "title"]
			]);
		});

		// --- RAWTEXT end tag non-matching forms ---
		it("rAWTEXT_LESS_THAN_SIGN: non-`/` returns to RAWTEXT", () => {
			expect(walk("<style>a<b</style>")).toEqual([
				["open", "style", false],
				["text", "a<b"],
				["close", "style"]
			]);
		});

		it("rAWTEXT_END_TAG_OPEN: non-alpha returns to RAWTEXT", () => {
			expect(walk("<style>a</1</style>")).toEqual([
				["open", "style", false],
				["text", "a</1"],
				["close", "style"]
			]);
		});

		it("rAWTEXT_END_TAG_NAME: non-matching space", () => {
			expect(walk("<style>a</div ></style>")).toEqual([
				["open", "style", false],
				["text", "a</div >"],
				["close", "style"]
			]);
		});

		it("rAWTEXT_END_TAG_NAME: non-matching `/`", () => {
			expect(walk("<style>a</div/></style>")).toEqual([
				["open", "style", false],
				["text", "a</div/>"],
				["close", "style"]
			]);
		});

		it("rAWTEXT_END_TAG_NAME: matching with space → attributes", () => {
			expect(walk("<style>a</style foo>")).toEqual([
				["open", "style", false],
				["text", "a"],
				["attr", "foo", null, QUOTE_NONE],
				["close", "style"]
			]);
		});

		it("rAWTEXT_END_TAG_NAME: matching with `/`", () => {
			expect(walk("<style>a</style/>")).toEqual([
				["open", "style", false],
				["text", "a"],
				["close", "style"]
			]);
		});

		it("rAWTEXT_END_TAG_NAME: non-matching `>` is content", () => {
			expect(walk("<style>a</div></style>")).toEqual([
				["open", "style", false],
				["text", "a</div>"],
				["close", "style"]
			]);
		});

		it("rAWTEXT_END_TAG_NAME: non-alpha garbage", () => {
			expect(walk("<style>a</style!b</style>")).toEqual([
				["open", "style", false],
				["text", "a</style!b"],
				["close", "style"]
			]);
		});

		// --- SCRIPT_DATA end tag non-matching forms ---
		it("sCRIPT_DATA_END_TAG_OPEN: non-alpha returns to SCRIPT_DATA", () => {
			expect(walk("<script>a</1</script>")).toEqual([
				["open", "script", false],
				["text", "a</1"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_END_TAG_NAME: non-matching space", () => {
			expect(walk("<script>a</div ></script>")).toEqual([
				["open", "script", false],
				["text", "a</div >"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_END_TAG_NAME: non-matching `/`", () => {
			expect(walk("<script>a</div/></script>")).toEqual([
				["open", "script", false],
				["text", "a</div/>"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_END_TAG_NAME: matching with space → attributes", () => {
			expect(walk("<script>a</script foo>")).toEqual([
				["open", "script", false],
				["text", "a"],
				["attr", "foo", null, QUOTE_NONE],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_END_TAG_NAME: matching with `/`", () => {
			expect(walk("<script>a</script/>")).toEqual([
				["open", "script", false],
				["text", "a"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_END_TAG_NAME: non-matching `>` is content", () => {
			expect(walk("<script>a</div></script>")).toEqual([
				["open", "script", false],
				["text", "a</div>"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_END_TAG_NAME: non-alpha garbage", () => {
			expect(walk("<script>a</script!b</script>")).toEqual([
				["open", "script", false],
				["text", "a</script!b"],
				["close", "script"]
			]);
		});

		// --- SCRIPT_DATA escape transitions ---
		it("sCRIPT_DATA_ESCAPE_START: non-`-` returns to SCRIPT_DATA", () => {
			expect(walk("<script>a<!b</script>")).toEqual([
				["open", "script", false],
				["text", "a<!b"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPE_START_DASH: non-`-` returns to SCRIPT_DATA", () => {
			expect(walk("<script>a<!-b</script>")).toEqual([
				["open", "script", false],
				["text", "a<!-b"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED: `-` enters dash state", () => {
			expect(walk("<script><!--a-b--></script>")).toEqual([
				["open", "script", false],
				["text", "<!--a-b-->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_DASH: `<` enters less-than-sign state", () => {
			expect(walk("<script><!-- a -<b --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- a -<b -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_DASH: anything else returns to escaped", () => {
			expect(walk("<script><!-- -b --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- -b -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: non-alpha non-`/` returns to escaped", () => {
			expect(walk("<script><!-- <! --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <! -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_END_TAG_OPEN: non-alpha emits `</` as text", () => {
			expect(walk("<script><!-- </1 --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- </1 -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_END_TAG_NAME: non-matching space", () => {
			expect(walk("<script><!-- </div ></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- </div >"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_END_TAG_NAME: non-matching `/`", () => {
			expect(walk("<script><!-- </div/></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- </div/>"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_END_TAG_NAME: matching with space → attributes", () => {
			expect(walk("<script><!-- </script foo>")).toEqual([
				["open", "script", false],
				["text", "<!-- "],
				["attr", "foo", null, QUOTE_NONE],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_END_TAG_NAME: matching with `/`", () => {
			expect(walk("<script><!-- </script/>")).toEqual([
				["open", "script", false],
				["text", "<!-- "],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_END_TAG_NAME: non-matching `>` is content", () => {
			expect(walk("<script><!-- </div></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- </div>"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_ESCAPED_END_TAG_NAME: non-alpha garbage", () => {
			expect(walk("<script><!-- </script!b</script>")).toEqual([
				["open", "script", false],
				["text", "<!-- </script!b"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPE_START: lower alpha appended; non-match", () => {
			expect(walk("<script><!-- <scrap></scrap> --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <scrap></scrap> -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPE_START: upper alpha (case-insensitive)", () => {
			expect(walk("<script><!-- <SCRIPT> x </SCRIPT> --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <SCRIPT> x </SCRIPT> -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPE_START: anything else returns to escaped", () => {
			// `<s1` reaches DOUBLE_ESCAPE_START via the `s` alpha, then `1` is the
			// non-alpha/non-tag-end character that returns to ESCAPED.
			expect(walk("<script><!-- <s1 --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <s1 -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPED: `-` enters dash state", () => {
			expect(walk("<script><!-- <script> a-b </script> --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <script> a-b </script> -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPED_DASH: cases", () => {
			expect(
				walk("<script><!-- <script> a-b-c </script> --></script>")
			).toEqual([
				["open", "script", false],
				["text", "<!-- <script> a-b-c </script> -->"],
				["close", "script"]
			]);
			expect(walk("<script><!-- <script> -<x </script> --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <script> -<x </script> -->"],
				["close", "script"]
			]);
			expect(walk("<script><!-- <script> -- </script> --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <script> -- </script> -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: extra `-` stays in dash-dash", () => {
			expect(walk("<script><!-- <script> ---- </script> --></script>")).toEqual(
				[
					["open", "script", false],
					["text", "<!-- <script> ---- </script> -->"],
					["close", "script"]
				]
			);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: `<` enters less-than-sign", () => {
			expect(walk("<script><!-- <script> --<x </script> --></script>")).toEqual(
				[
					["open", "script", false],
					["text", "<!-- <script> --<x </script> -->"],
					["close", "script"]
				]
			);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: `>` exits to SCRIPT_DATA (per spec)", () => {
			// `-->` inside double-escaped script transitions back to SCRIPT_DATA
			// state, so a subsequent `</script>` IS a real close tag.
			expect(
				walk("<script><!-- <script> --> back </script> --></script>")
			).toEqual([
				["open", "script", false],
				["text", "<!-- <script> --> back "],
				["close", "script"],
				["text", " -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: non-`/` reconsumes", () => {
			expect(walk("<script><!-- <script> a<b </script> --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <script> a<b </script> -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPE_END: upper alpha case-insensitive", () => {
			expect(walk("<script><!-- <script> x </SCRIPT> --></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <script> x </SCRIPT> -->"],
				["close", "script"]
			]);
		});

		it("sCRIPT_DATA_DOUBLE_ESCAPE_END: anything else returns to double-escaped", () => {
			expect(walk("<script><!-- <script>x</1y</script>--></script>")).toEqual([
				["open", "script", false],
				["text", "<!-- <script>x</1y</script>-->"],
				["close", "script"]
			]);
		});

		// --- STATE_CHARACTER_REFERENCE: bare `&` with non-alpha/non-`#` next ---
		it("cHARACTER_REFERENCE: `&;` reconsumes `;` in DATA (no entity matched)", () => {
			expect(roundtrip("a&;b")).toBe("a&;b");
		});

		// --- STATE_AMBIGUOUS_AMPERSAND ---
		it("aMBIGUOUS_AMPERSAND: alphanumeric run with `;` terminator", () => {
			// `&xyzabc;` is not in the entity table → NAMED falls through to
			// AMBIGUOUS_AMPERSAND, which consumes the alphanumeric run and
			// reconsumes `;` in the return state.
			expect(roundtrip("a&xyzabc;b")).toBe("a&xyzabc;b");
		});

		it("aMBIGUOUS_AMPERSAND: alphanumeric run terminated by anything-else", () => {
			// `.` is neither alphanumeric nor `;`, so AMBIGUOUS_AMPERSAND
			// reconsumes it in the return state (line 2574 branch).
			expect(roundtrip("a&xyzabc.b")).toBe("a&xyzabc.b");
		});

		// --- STATE_HEXADECIMAL_CHARACTER_REFERENCE anything else ---
		it("hEX_CHAR_REF: trailing non-hex without semicolon", () => {
			// `g` is not a hex digit, so it triggers the missing-semicolon
			// fallthrough into NUMERIC_CHARACTER_REFERENCE_END.
			expect(roundtrip("a&#x41g")).toBe("a&#x41g");
		});

		// --- STATE_DECIMAL_CHARACTER_REFERENCE anything else ---
		it("dEC_CHAR_REF: trailing non-digit without semicolon", () => {
			expect(roundtrip("a&#65b")).toBe("a&#65b");
		});

		// --- EOF in comment / doctype / cdata ---
		it("eOF: in markup-declaration-open emits comment", () => {
			expect(walk("a<!")).toEqual([
				["text", "a"],
				["comment", "<!"]
			]);
		});

		it("eOF: in comment-start emits comment", () => {
			expect(walk("a<!--")).toEqual([
				["text", "a"],
				["comment", "<!--"]
			]);
		});

		it("eOF: in comment emits comment", () => {
			expect(walk("a<!-- x")).toEqual([
				["text", "a"],
				["comment", "<!-- x"]
			]);
		});

		it("eOF: in bogus-comment emits comment", () => {
			expect(walk("a<!x")).toEqual([
				["text", "a"],
				["comment", "<!x"]
			]);
		});

		it("eOF: in DOCTYPE emits doctype", () => {
			expect(walk("<!DOCTYPE")).toEqual([["doctype", "<!DOCTYPE"]]);
		});

		it("eOF: in bogus-doctype emits doctype", () => {
			expect(walk("<!DOCTYPE x bogus")).toEqual([
				["doctype", "<!DOCTYPE x bogus"]
			]);
		});

		it("eOF: in PLAINTEXT emits text", () => {
			expect(walk("<plaintext>raw < text")).toEqual([
				["open", "plaintext", false],
				["text", "raw < text"]
			]);
		});

		it("eOF: trailing < gets emitted as text", () => {
			expect(walk("hello<")).toEqual([["text", "hello<"]]);
		});

		// --- Callback API surface: default arguments + missing callbacks ---
		it("default arguments: walks with no pos/callbacks provided", () => {
			expect(() => tokenize("<a>hello</a>")).not.toThrow();
		});

		it("missing closeTag/comment/doctype callbacks are tolerated", () => {
			// Each branch checks `callbacks.X !== undefined`; exercise the false
			// side by walking a document that would produce those tokens but
			// passing only `openTag` / `text`.
			/** @type {unknown[]} */
			const opens = [];
			expect(() =>
				tokenize("<!DOCTYPE html><!-- c --><a>x</a><![CDATA[ y ]]>", 0, {
					openTag: (input, start, end) => {
						opens.push(input.slice(start, end));
						return end;
					}
				})
			).not.toThrow();
			expect(opens).toEqual(["<a>"]);
		});

		it("missing all callbacks is tolerated", () => {
			expect(() =>
				tokenize("<!DOCTYPE html><!-- c --><a>x</a><![CDATA[ y ]]>z", 0, {})
			).not.toThrow();
		});

		// --- Missing callbacks for comment/doctype across every emission site ---
		it("missing comment callback at every comment emission site", () => {
			// Exercise the false branch of `if (callbacks.comment !== undefined)`
			// in COMMENT_START, COMMENT_START_DASH, COMMENT_END, COMMENT_END_BANG,
			// BOGUS_COMMENT, CDATA_SECTION_END, and the EOF handler.
			const fragments = [
				"<!-->", // COMMENT_START >
				"<!--->", // COMMENT_START_DASH >
				"<!-- ok -->", // COMMENT_END
				"<!-- ok --!>", // COMMENT_END_BANG
				"<!bogus>", // BOGUS_COMMENT
				"<![CDATA[x]]>", // CDATA_SECTION_END
				"<!-- eof" // EOF inside comment
			];
			for (const html of fragments) {
				expect(() => tokenize(html, 0, {})).not.toThrow();
			}
		});

		it("missing doctype callback at every doctype emission site", () => {
			// Exercise the false branch of `if (callbacks.doctype !== undefined)`
			// across every state that emits a doctype.
			const fragments = [
				"<!DOCTYPE>", // BEFORE_DOCTYPE_NAME >
				"<!DOCTYPE html>", // DOCTYPE_NAME >
				"<!DOCTYPE html  >", // AFTER_DOCTYPE_NAME >
				"<!DOCTYPE html PUBLIC>", // AFTER_DOCTYPE_PUBLIC_KEYWORD >
				"<!DOCTYPE html PUBLIC >", // BEFORE_DOCTYPE_PUBLIC_IDENTIFIER >
				'<!DOCTYPE html PUBLIC "abc>', // DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE abrupt
				"<!DOCTYPE html PUBLIC 'abc>", // DOCTYPE_PUBLIC_IDENTIFIER_SINGLE abrupt
				'<!DOCTYPE html PUBLIC "p">', // AFTER_DOCTYPE_PUBLIC_IDENTIFIER >
				'<!DOCTYPE html PUBLIC "p" >', // BETWEEN_PUBLIC_AND_SYSTEM >
				"<!DOCTYPE html SYSTEM>", // AFTER_DOCTYPE_SYSTEM_KEYWORD >
				"<!DOCTYPE html SYSTEM >", // BEFORE_DOCTYPE_SYSTEM_IDENTIFIER >
				'<!DOCTYPE html SYSTEM "abc>', // DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE abrupt
				"<!DOCTYPE html SYSTEM 'abc>", // DOCTYPE_SYSTEM_IDENTIFIER_SINGLE abrupt
				'<!DOCTYPE html SYSTEM "s" >', // AFTER_DOCTYPE_SYSTEM_IDENTIFIER >
				"<!DOCTYPE x bogus>", // BOGUS_DOCTYPE >
				"<!DOCTYPE" // EOF inside doctype
			];
			for (const html of fragments) {
				expect(() => tokenize(html, 0, {})).not.toThrow();
			}
		});

		// --- NAMED_CHARACTER_REFERENCE safety cap on very long entities ---
		it("nAMED_CHARACTER_REFERENCE: caps the alphanumeric run at MAX_ENTITY_NAME_LEN - 1", () => {
			// The longest WHATWG entity name is 32 chars (with the trailing
			// `;`); the alphanumeric run before the optional `;` is therefore
			// at most 31 chars. The scanner bounds the consume loop at
			// `MAX_ENTITY_NAME_LEN - 1 = 31` so pathological inputs (`&` plus
			// thousands of alphanumerics) stay linear-time. Beyond the cap the
			// bytes round-trip as text.
			const longEntity = `&${"a".repeat(50)}`;
			expect(roundtrip(longEntity)).toBe(longEntity);
		});

		// --- Callback can advance `pos` past the natural end (skip-ahead) ---
		it("openTag callback returning a larger position causes state to fall to DATA", () => {
			// When a callback returns nextPos > end (= pos + 1), the state machine
			// stays in DATA instead of switching to the content mode for
			// `<script>` / `<style>` / etc. — verifies the `nextPos > pos + 1`
			// branch in STATE_TAG_NAME, STATE_AFTER_ATTRIBUTE_NAME,
			// STATE_BEFORE_ATTRIBUTE_VALUE, STATE_ATTRIBUTE_VALUE_UNQUOTED, and
			// STATE_AFTER_ATTRIBUTE_VALUE_QUOTED `>` handlers.
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
				"<script>x</script>" +
					"<a foo>y</a>" +
					"<b foo=bar>z</b>" +
					'<c foo="bar">w</c>' +
					"<d foo=>v</d>" +
					"<e/>",
				0,
				{
					openTag: skipFn("open"),
					closeTag: (input, start, end, ns, ne) => {
						out.push(["close", input.slice(ns, ne)]);
						return end;
					},
					attribute: (input, ns, ne, vs, ve, qt) => {
						if (vs === -1) return ne;
						if (qt !== QUOTE_NONE) return ve + 1;
						return ve;
					},
					text: (input, start, end) => {
						out.push(["text", input.slice(start, end)]);
						return end;
					}
				}
			);
			// Each open tag callback skips one extra char past `>`, so the
			// following text content is shorter than the source. The exact
			// text spans aren't important — what matters is that the lexer
			// stays in DATA mode (no content-mode trapping of `<script>`).
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
	});

	describe("parseError callback", () => {
		/**
		 * @param {string} html input
		 * @returns {{ code: string, slice: string, severity: string }[]} list of reported errors
		 */
		const collectErrors = (html) => {
			/** @type {{ code: string, slice: string, severity: string }[]} */
			const errors = [];
			tokenize(html, 0, {
				parseError: (input, code, start, end, severity) => {
					errors.push({ code, slice: input.slice(start, end), severity });
				}
			});
			return errors;
		};

		it("reports missing-attribute-value as a warning", () => {
			const errors = collectErrors("<a foo=>");
			expect(errors).toEqual([
				{ code: "missing-attribute-value", slice: ">", severity: "warning" }
			]);
		});

		it("reports unexpected-equals-sign-before-attribute-name as a warning", () => {
			const errors = collectErrors("<a =foo>");
			expect(errors).toEqual([
				{
					code: "unexpected-equals-sign-before-attribute-name",
					slice: "=",
					severity: "warning"
				}
			]);
		});

		it("reports missing-whitespace-between-attributes as a warning", () => {
			const errors = collectErrors('<a foo="x"bar>');
			expect(errors).toEqual([
				{
					code: "missing-whitespace-between-attributes",
					slice: "b",
					severity: "warning"
				}
			]);
		});

		it("reports unexpected-solidus-in-tag as a warning", () => {
			const errors = collectErrors("<br /foo>");
			expect(errors).toEqual([
				{ code: "unexpected-solidus-in-tag", slice: "f", severity: "warning" }
			]);
		});

		it("reports missing-end-tag-name as a warning", () => {
			const errors = collectErrors("a</>b");
			expect(errors).toEqual([
				{ code: "missing-end-tag-name", slice: ">", severity: "warning" }
			]);
		});

		it("reports unexpected-question-mark-instead-of-tag-name as a warning", () => {
			const errors = collectErrors("a<?pi?>b");
			expect(errors).toEqual([
				{
					code: "unexpected-question-mark-instead-of-tag-name",
					slice: "?",
					severity: "warning"
				}
			]);
		});

		it("reports invalid-first-character-of-tag-name as a warning", () => {
			const errors = collectErrors("a< b");
			expect(errors).toEqual([
				{
					code: "invalid-first-character-of-tag-name",
					slice: " ",
					severity: "warning"
				}
			]);
		});

		it("reports incorrectly-opened-comment as a warning (bogus comment)", () => {
			const errors = collectErrors("a<!foo>b");
			expect(errors).toEqual([
				{ code: "incorrectly-opened-comment", slice: "<!", severity: "warning" }
			]);
		});

		it("reports abrupt-closing-of-empty-comment as a warning", () => {
			const errors = collectErrors("<!-->");
			expect(errors).toEqual([
				{
					code: "abrupt-closing-of-empty-comment",
					slice: ">",
					severity: "warning"
				}
			]);
		});

		it("reports incorrectly-closed-comment as a warning", () => {
			const errors = collectErrors("<!-- x --!>");
			expect(errors).toEqual([
				{ code: "incorrectly-closed-comment", slice: ">", severity: "warning" }
			]);
		});

		it("reports nested-comment as a warning", () => {
			const errors = collectErrors("<!--<!---->");
			expect(errors.find((e) => e.code === "nested-comment")).toEqual({
				code: "nested-comment",
				slice: "-",
				severity: "warning"
			});
		});

		it("does not report nested-comment when followed by `>`", () => {
			// `<!--<!-->` lands in comment-less-than-sign-bang-dash-dash with `>`
			// next; the spec says reconsume in comment-end without an error.
			expect(collectErrors("<!--<!-->")).toEqual([]);
		});

		it("reports missing-doctype-name as a warning", () => {
			const errors = collectErrors("<!DOCTYPE>");
			expect(errors).toEqual([
				{ code: "missing-doctype-name", slice: ">", severity: "warning" }
			]);
		});

		it("reports missing-whitespace-before-doctype-name as a warning", () => {
			const errors = collectErrors("<!DOCTYPEhtml>");
			expect(errors).toEqual([
				{
					code: "missing-whitespace-before-doctype-name",
					slice: "h",
					severity: "warning"
				}
			]);
		});

		it("reports invalid-character-sequence-after-doctype-name as a warning", () => {
			const errors = collectErrors("<!DOCTYPE html FOO>");
			expect(errors).toEqual([
				{
					code: "invalid-character-sequence-after-doctype-name",
					slice: "F",
					severity: "warning"
				}
			]);
		});

		it("reports DOCTYPE public/system identifier errors", () => {
			expect(
				collectErrors('<!DOCTYPE html PUBLIC"x">').map((e) => e.code)
			).toContain("missing-whitespace-after-doctype-public-keyword");
			expect(
				collectErrors("<!DOCTYPE html PUBLIC>").map((e) => e.code)
			).toContain("missing-doctype-public-identifier");
			expect(
				collectErrors('<!DOCTYPE html PUBLIC "abc>').map((e) => e.code)
			).toContain("abrupt-doctype-public-identifier");
			expect(
				collectErrors('<!DOCTYPE html PUBLIC "p""s">').map((e) => e.code)
			).toContain(
				"missing-whitespace-between-doctype-public-and-system-identifiers"
			);
			expect(
				collectErrors('<!DOCTYPE html PUBLIC "p" garbage>').map((e) => e.code)
			).toContain("missing-quote-before-doctype-system-identifier");
			expect(
				collectErrors("<!DOCTYPE html SYSTEM>").map((e) => e.code)
			).toContain("missing-doctype-system-identifier");
			expect(
				collectErrors('<!DOCTYPE html SYSTEM "abc>').map((e) => e.code)
			).toContain("abrupt-doctype-system-identifier");
			expect(
				collectErrors('<!DOCTYPE html SYSTEM "s" garbage>').map((e) => e.code)
			).toContain("unexpected-character-after-doctype-system-identifier");
		});

		it("reports absence-of-digits-in-numeric-character-reference as a warning", () => {
			const errors = collectErrors("a&#x;b");
			expect(errors).toEqual([
				{
					code: "absence-of-digits-in-numeric-character-reference",
					slice: ";",
					severity: "warning"
				}
			]);
		});

		it("reports missing-semicolon-after-character-reference as a warning", () => {
			const errors = collectErrors("a&#65b");
			expect(errors).toEqual([
				{
					code: "missing-semicolon-after-character-reference",
					slice: "b",
					severity: "warning"
				}
			]);
		});

		it("reports unknown-named-character-reference as a warning", () => {
			const errors = collectErrors("a&zzz;b");
			expect(errors).toEqual([
				{
					code: "unknown-named-character-reference",
					slice: ";",
					severity: "warning"
				}
			]);
		});

		it("reports missing-semicolon-after-character-reference for legacy named references", () => {
			// `&amp` matches the legacy bare-form entity; the missing `;` is a
			// parse error reported at the character where the `;` was expected.
			const errors = collectErrors("a&amp b");
			expect(errors).toEqual([
				{
					code: "missing-semicolon-after-character-reference",
					slice: " ",
					severity: "warning"
				}
			]);
		});

		it("does not report missing-semicolon for a named reference with a trailing semicolon", () => {
			expect(collectErrors("a&amp;b")).toEqual([]);
		});

		it("applies the historical attribute rule for legacy named references", () => {
			// In an attribute value, a bare `&amp` followed by `=` (or an ASCII
			// alphanumeric) is left undecoded and reports no error.
			expect(collectErrors('<a href="?x&amp=y">')).toEqual([]);
			expect(collectErrors('<a href="?x&ampY">')).toEqual([]);
			// In text context the same sequence reports the missing semicolon.
			expect(collectErrors("&amp=y").map((e) => e.code)).toEqual([
				"missing-semicolon-after-character-reference"
			]);
		});

		it("reports unexpected-character-in-attribute-name for \", ', and <", () => {
			for (const ch of ['"', "'", "<"]) {
				expect(collectErrors(`<a foo${ch}bar>`)).toEqual([
					{
						code: "unexpected-character-in-attribute-name",
						slice: ch,
						severity: "warning"
					}
				]);
			}
		});

		it("reports unexpected-character-in-unquoted-attribute-value for \", ', <, =, and `", () => {
			for (const ch of ['"', "'", "<", "=", "`"]) {
				expect(collectErrors(`<a foo=x${ch}y>`)).toEqual([
					{
						code: "unexpected-character-in-unquoted-attribute-value",
						slice: ch,
						severity: "warning"
					}
				]);
			}
		});

		it("reports unexpected-null-character across data, tag, attribute, and comment states", () => {
			expect(collectErrors("a\0b")).toEqual([
				{ code: "unexpected-null-character", slice: "\0", severity: "warning" }
			]);
			expect(collectErrors("<di\0v>")).toEqual([
				{ code: "unexpected-null-character", slice: "\0", severity: "warning" }
			]);
			expect(collectErrors('<a b="x\0y">')).toEqual([
				{ code: "unexpected-null-character", slice: "\0", severity: "warning" }
			]);
			expect(collectErrors("<!-- a\0b -->")).toEqual([
				{ code: "unexpected-null-character", slice: "\0", severity: "warning" }
			]);
		});

		it("processes character references in RCDATA but not RAWTEXT", () => {
			// RCDATA (title/textarea) decodes entities, so an unknown reference
			// reports unknown-named-character-reference; RAWTEXT (style) does not.
			expect(
				collectErrors("<title>&unknown;</title>").map((e) => e.code)
			).toEqual(["unknown-named-character-reference"]);
			expect(collectErrors("<style>&unknown;</style>")).toEqual([]);
		});

		it("reports numeric character reference validation errors", () => {
			// Each error covers the whole reference span and is a warning. The
			// scanner flags the error but does not substitute U+FFFD itself.
			expect(collectErrors("a&#0;b")).toEqual([
				{
					code: "null-character-reference",
					slice: "&#0;",
					severity: "warning"
				}
			]);
			expect(collectErrors("a&#x110000;b")).toEqual([
				{
					code: "character-reference-outside-unicode-range",
					slice: "&#x110000;",
					severity: "warning"
				}
			]);
			expect(collectErrors("a&#xD800;b")).toEqual([
				{
					code: "surrogate-character-reference",
					slice: "&#xD800;",
					severity: "warning"
				}
			]);
			expect(collectErrors("a&#xFFFE;b")).toEqual([
				{
					code: "noncharacter-character-reference",
					slice: "&#xFFFE;",
					severity: "warning"
				}
			]);
			// C0 control, CR (an ASCII-whitespace control the spec still flags),
			// and a C1 control all report control-character-reference.
			for (const ref of ["&#1;", "&#13;", "&#x80;"]) {
				expect(collectErrors(`a${ref}b`)).toEqual([
					{
						code: "control-character-reference",
						slice: ref,
						severity: "warning"
					}
				]);
			}
			// A valid code point (U+0041 "A") reports nothing.
			expect(collectErrors("a&#65;b")).toEqual([]);
		});

		it("validates numeric references that end exactly at EOF", () => {
			// The numeric-reference-end processing must still run when the
			// reference is the last thing in the input (terminator consumed,
			// loop exits) — verified against html5lib-tests.
			expect(collectErrors("&#x0001;").map((e) => e.code)).toEqual([
				"control-character-reference"
			]);
			expect(collectErrors("&#0000;").map((e) => e.code)).toEqual([
				"null-character-reference"
			]);
			expect(collectErrors("&#xD800;").map((e) => e.code)).toEqual([
				"surrogate-character-reference"
			]);
			// No `;` before EOF: missing-semicolon then the validation error.
			expect(collectErrors("&#x0").map((e) => e.code)).toEqual([
				"missing-semicolon-after-character-reference",
				"null-character-reference"
			]);
			// No digits before EOF.
			expect(collectErrors("&#").map((e) => e.code)).toEqual([
				"absence-of-digits-in-numeric-character-reference"
			]);
		});

		it("reports end-tag-with-trailing-solidus for a self-closing end tag", () => {
			expect(collectErrors("</br/>")).toEqual([
				{
					code: "end-tag-with-trailing-solidus",
					slice: "</br/>",
					severity: "warning"
				}
			]);
			// A self-closing start tag is not a tokenizer error here.
			expect(collectErrors("<br/>")).toEqual([]);
		});

		it("does not report eof-in-doctype for EOF in a bogus DOCTYPE", () => {
			// `x` after the name switches to bogus DOCTYPE; EOF then emits the
			// token with no eof-in-doctype error (matches the bogus-comment rule).
			expect(collectErrors("<!DOCTYPE a x").map((e) => e.code)).toEqual([
				"invalid-character-sequence-after-doctype-name"
			]);
		});

		it("reports incorrectly-opened-comment for EOF right after `<!`", () => {
			// EOF in markup-declaration-open takes the spec's anything-else path
			// (incorrectly-opened-comment + bogus comment), not eof-in-comment.
			expect(collectErrors("<!")).toEqual([
				{
					code: "incorrectly-opened-comment",
					slice: "<!",
					severity: "warning"
				}
			]);
		});

		it("treats CR as whitespace (input-stream preprocessing)", () => {
			// The spec converts CR to LF before tokenizing; a raw CR must behave
			// as whitespace. `<!DOCTYPE a \r` therefore stays in the after-name
			// state and only reports eof-in-doctype.
			expect(collectErrors("<!DOCTYPE a \r").map((e) => e.code)).toEqual([
				"eof-in-doctype"
			]);
			// CR after a quoted attribute value is whitespace, so no
			// missing-whitespace-between-attributes is reported.
			expect(collectErrors("<a a=''\r>")).toEqual([]);
		});

		it("reports unexpected-null-character for NULL in comment-end-dash", () => {
			// Reaching comment-end-dash then a NULL must reconsume in the comment
			// state, which flags the NULL.
			expect(collectErrors("<!-- a-\0b -->")).toEqual([
				{ code: "unexpected-null-character", slice: "\0", severity: "warning" }
			]);
		});

		it("reports eof-in-tag as an error and emits the partial open tag", () => {
			/** @type {{ code: string, severity: string }[]} */
			const errors = [];
			/** @type {string[]} */
			const opens = [];
			tokenize('<div class="x', 0, {
				openTag: (input, start, end, ns, ne) => {
					opens.push(input.slice(ns, ne));
					return end;
				},
				attribute: (input, ns, ne, vs, ve, qt) => {
					if (vs === -1) return ne;
					if (qt !== QUOTE_NONE) return ve + 1;
					return ve;
				},
				parseError: (input, code, start, end, severity) => {
					errors.push({ code, severity });
				}
			});
			expect(errors).toEqual([{ code: "eof-in-tag", severity: "error" }]);
			expect(opens).toEqual(["div"]);
		});

		it("reports eof-in-tag for a close tag at EOF", () => {
			/** @type {string[]} */
			const codes = [];
			/** @type {string[]} */
			const closes = [];
			tokenize("<a></a", 0, {
				closeTag: (input, start, end, ns, ne) => {
					closes.push(input.slice(ns, ne));
					return end;
				},
				openTag: (input, start, end) => end,
				parseError: (input, code) => {
					codes.push(code);
				}
			});
			expect(codes).toEqual(["eof-in-tag"]);
			expect(closes).toEqual(["a"]);
		});

		it("reports eof-in-tag with correct partial name in content-mode end-tag states", () => {
			// Regression: EOF inside RCDATA/RAWTEXT/SCRIPT_DATA end-tag-name
			// states must reset `tagNameEnd` (it carries stale values from the
			// matching open tag), otherwise `emitCloseTag(len)` slices the
			// wrong range. Verify the partial close-tag name is emitted for
			// each content mode.
			for (const [html, expectedClose] of [
				["<title>x</tit", "tit"],
				["<style>x</sty", "sty"],
				["<script>x</scr", "scr"]
			]) {
				/** @type {string[]} */
				const closes = [];
				tokenize(html, 0, {
					openTag: (input, start, end) => end,
					closeTag: (input, start, end, ns, ne) => {
						closes.push(input.slice(ns, ne));
						return end;
					}
				});
				expect(closes).toEqual([expectedClose]);
			}
		});

		it("reports eof-in-comment as an error", () => {
			const errors = collectErrors("<!-- unclosed");
			expect(errors).toEqual([
				{ code: "eof-in-comment", slice: "", severity: "error" }
			]);
		});

		it("reports eof-in-doctype as an error", () => {
			const errors = collectErrors("<!DOCTYPE html");
			expect(errors).toEqual([
				{ code: "eof-in-doctype", slice: "", severity: "error" }
			]);
		});

		it("reports eof-in-tag inside attribute name and emits attribute with correct range", () => {
			/** @type {string[]} */
			const codes = [];
			/** @type {[string, string][]} */
			const attrs = [];
			tokenize("<div data-x", 0, {
				openTag: (input, start, end) => end,
				attribute: (input, ns, ne, vs, ve) => {
					attrs.push([
						input.slice(ns, ne),
						vs === -1 ? "" : input.slice(vs, ve)
					]);
					return ne;
				},
				parseError: (input, code) => codes.push(code)
			});
			expect(codes).toEqual(["eof-in-tag"]);
			expect(attrs).toEqual([["data-x", ""]]);
		});

		it("reports eof-in-tag when EOF lands inside an attribute-value character reference", () => {
			/** @type {string[]} */
			const codes = [];
			/** @type {string[]} */
			const opens = [];
			// `&amp` mid-attribute-value at EOF: returnState is the attribute
			// value (double-quoted) state, so the EOF unwinds back to a partial
			// open tag and emits eof-in-tag.
			tokenize('<a href="x&amp', 0, {
				openTag: (input, start, end, ns, ne) => {
					opens.push(input.slice(ns, ne));
					return end;
				},
				attribute: (input, ns, ne, vs, ve, qt) => {
					if (vs === -1) return ne;
					if (qt !== QUOTE_NONE) return ve + 1;
					return ve;
				},
				parseError: (input, code) => codes.push(code)
			});
			// `&amp` matches the legacy entity without a trailing `;` (next char
			// is EOF, so the historical attribute rule does not apply), then the
			// unterminated tag reports eof-in-tag.
			expect(codes).toEqual([
				"missing-semicolon-after-character-reference",
				"eof-in-tag"
			]);
			expect(opens).toEqual(["a"]);
		});

		it("does NOT report eof-in-comment for bogus comments at EOF", () => {
			// `<!x` enters bogus comment via the incorrectly-opened-comment path.
			// EOF inside bogus-comment-state should emit the comment cleanly
			// per spec (no `eof-in-comment` error).
			/** @type {string[]} */
			const codes = [];
			/** @type {string[]} */
			const comments = [];
			tokenize("<!x", 0, {
				comment: (input, start, end) => {
					comments.push(input.slice(start, end));
					return end;
				},
				parseError: (input, code) => codes.push(code)
			});
			expect(codes).toEqual(["incorrectly-opened-comment"]);
			expect(comments).toEqual(["<!x"]);
		});

		it("reports eof-in-cdata as an error", () => {
			const errors = collectErrors("<![CDATA[unclosed");
			expect(errors).toEqual([
				{ code: "eof-in-cdata", slice: "", severity: "error" }
			]);
		});

		it("reports eof-in-script-html-comment-like-text as an error", () => {
			const errors = collectErrors("<script><!-- unclosed");
			expect(errors).toEqual([
				{
					code: "eof-in-script-html-comment-like-text",
					slice: "",
					severity: "error"
				}
			]);
		});

		it("reports eof-before-tag-name as a warning for lone `<`", () => {
			const errors = collectErrors("hello<");
			expect(errors).toEqual([
				{ code: "eof-before-tag-name", slice: "", severity: "warning" }
			]);
		});

		it("reports end-tag-with-attributes as a warning", () => {
			const errors = collectErrors("<div></div foo>");
			expect(errors).toEqual([
				{
					code: "end-tag-with-attributes",
					slice: "</div foo>",
					severity: "warning"
				}
			]);
		});

		it("reports end-tag-with-attributes only once per close tag", () => {
			const errors = collectErrors('<div></div a b c="x">');
			expect(
				errors.filter((e) => e.code === "end-tag-with-attributes")
			).toHaveLength(1);
		});

		it("does not report end-tag-with-attributes when the close tag has no attributes", () => {
			expect(collectErrors("<div></div>")).toEqual([]);
		});

		it("does not report any error for well-formed HTML", () => {
			expect(
				collectErrors("<!DOCTYPE html><html><body>hi</body></html>")
			).toEqual([]);
		});
	});

	describe("decodeEntities", () => {
		it("should decode core named entities", () => {
			expect(decodeEntities("&amp;&lt;&gt;&quot;&apos;&nbsp;")).toBe(
				"&<>\"'\u00A0"
			);
		});

		it("should decode legacy named entities without trailing semicolon", () => {
			// `&AMP` and `&copy` are legacy bare-form entities in the WHATWG
			// named character references table.
			expect(decodeEntities("&AMP")).toBe("&");
			expect(decodeEntities("&copy")).toBe("\u00A9");
		});

		it("should decode entities outside the BMP and multi-codepoint entities", () => {
			expect(decodeEntities("&AElig;")).toBe("\u00C6");
			// `&NotEqualTilde;` is a multi-codepoint named reference (\u2242 + combining slash).
			expect(decodeEntities("&NotEqualTilde;")).toBe("\u2242\u0338");
		});

		it("should apply longest-prefix backtrack per WHATWG", () => {
			// `&notpre;` is not in the table, but `&not` is \u2014 the prefix matches
			// and the remainder `pre;` is left as literal text.
			expect(decodeEntities("&notpre;")).toBe("\u00ACpre;");
		});

		it("should decode numeric decimal references", () => {
			expect(decodeEntities("&#65;&#66;&#67;")).toBe("ABC");
		});

		it("should decode numeric references without trailing semicolon", () => {
			expect(decodeEntities("&#65")).toBe("A");
			expect(decodeEntities("&#x41")).toBe("A");
		});

		it("should not let decimal references swallow trailing hex-letter chars", () => {
			// Regression: a decimal numeric reference must consume only [0-9]+.
			// `&#65b` should decode `&#65` → `A` and leave the trailing `b` as
			// literal text (the earlier regex matched `[0-9a-fA-F]+` for both
			// hex and decimal and incorrectly swallowed the `b`).
			expect(decodeEntities("&#65b")).toBe("Ab");
			expect(decodeEntities("&#1f")).toBe("f");
		});

		it("should decode numeric hexadecimal references", () => {
			expect(decodeEntities("&#x41;&#x42;&#x43;")).toBe("ABC");
			expect(decodeEntities("&#X41;&#X42;&#X43;")).toBe("ABC");
		});

		it("should leave unknown or incomplete entities as literals", () => {
			expect(decodeEntities("&zzzunknown;")).toBe("&zzzunknown;");
			expect(decodeEntities("&#;")).toBe("&#;");
			expect(decodeEntities("&#x;")).toBe("&#x;");
			expect(decodeEntities("bare & alone")).toBe("bare & alone");
		});

		it("should not match inherited Object.prototype keys as entities", () => {
			// Regression: with a regular object literal, `HTML_ENTITIES["toString"]`
			// would return `Object.prototype.toString` and the lookup would
			// falsely treat the entity as matched. The generated table now uses
			// a null prototype so these names stay literal.
			expect(decodeEntities("&toString;")).toBe("&toString;");
			expect(decodeEntities("&constructor;")).toBe("&constructor;");
			expect(decodeEntities("&hasOwnProperty;")).toBe("&hasOwnProperty;");
		});

		it("should handle mixed text and entities", () => {
			expect(decodeEntities("foo &amp; bar &#x41; baz")).toBe(
				"foo & bar A baz"
			);
		});

		it("should fast-path strings with no `&`", () => {
			expect(decodeEntities("plain text")).toBe("plain text");
		});

		it("should replace numeric references above U+10FFFF with U+FFFD", () => {
			expect(decodeEntities("&#x110000;")).toBe("�");
			expect(decodeEntities("&#1114112;")).toBe("�");
		});

		it("should replace NULL and surrogate numeric references with U+FFFD", () => {
			expect(decodeEntities("&#0;")).toBe("�");
			expect(decodeEntities("&#x0;")).toBe("�");
			expect(decodeEntities("&#xD800;")).toBe("�");
			expect(decodeEntities("&#xDFFF;")).toBe("�");
			expect(decodeEntities("&#55296;")).toBe("�");
		});

		it("should remap C1 numeric references via the Windows-1252 table", () => {
			// `&#x80;` (Windows-1252 euro sign) per WHATWG remaps to U+20AC.
			expect(decodeEntities("&#x80;")).toBe("€");
			// `&#x99;` remaps to U+2122 (trade mark sign).
			expect(decodeEntities("&#x99;")).toBe("™");
			// `&#x9F;` remaps to U+0178 (Ÿ).
			expect(decodeEntities("&#x9F;")).toBe("Ÿ");
			// C1 control codepoints with no remap entry pass through.
			expect(decodeEntities("&#x81;")).toBe("");
		});

		it("should stay linear-time on long alphanumeric runs after `&`", () => {
			// Regression: longest-prefix backtrack must be capped at the longest
			// WHATWG entity name, otherwise inputs like `&` + thousands of chars
			// trigger O(n²) substring allocations.
			const longRun = "a".repeat(1000);
			expect(decodeEntities(`&${longRun}`)).toBe(`&${longRun}`);
			// `&amp` prefix at the start still decodes; the rest is appended verbatim.
			expect(decodeEntities(`&amp${longRun}`)).toBe(`&${longRun}`);
		});

		it("should apply the consumed-as-part-of-an-attribute rule when asked", () => {
			// In text context, `&amp=foo` decodes to `&=foo`.
			expect(decodeEntities("&amp=foo")).toBe("&=foo");
			// In attribute context, the same input stays literal.
			expect(decodeEntities("&amp=foo", true)).toBe("&amp=foo");
			// `&amp;=foo` (with semicolon) decodes regardless of context.
			expect(decodeEntities("&amp;=foo", true)).toBe("&=foo");
			// Longest-prefix leftover case: `&ampx` → `&amp` matches but leftover
			// `x` is alphanumeric, so in attribute context this stays literal.
			expect(decodeEntities("&ampX", true)).toBe("&ampX");
			// In text context it still decodes the prefix.
			expect(decodeEntities("&ampX")).toBe("&X");
		});
	});

	describe("decodeEntities with map", () => {
		it("should return the input and no map when nothing decodes", () => {
			expect(decodeEntities("plain text", false, true)).toEqual({
				text: "plain text",
				map: undefined
			});
			// Attribute rule keeps `&amp=1` literal — no map either.
			expect(decodeEntities("&amp=1", true, true)).toEqual({
				text: "&amp=1",
				map: undefined
			});
		});

		it("should map decoded boundaries back to raw offsets", () => {
			const { text, map } = decodeEntities("a&amp;b", true, true);
			expect(text).toBe("a&b");
			// Boundaries: `a` 0, decoded `&` starts at raw 1, `b` at raw 6, end 7.
			expect(map).toEqual([0, 1, 6, 7]);
			// A decoded span maps to the covering raw span.
			expect(
				"a&amp;b".slice(
					/** @type {number[]} */ (map)[0],
					/** @type {number[]} */ (map)[3]
				)
			).toBe("a&amp;b");
		});

		it("should map around numeric references and trailing text", () => {
			const { text, map } = decodeEntities("x&#32;yz", true, true);
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
});

/** @typedef {import("../lib/html/syntax").HtmlNodeRef} HtmlNodeRef */
/** @typedef {import("../lib/html/syntax").HtmlAttribute} HtmlAttribute */
/**
 * Materialized plain-object views of the struct-of-arrays AST — the shape
 * `parseHtml` used to return, rebuilt through the accessor `A`.
 * @typedef {object} MatElement
 * @property {typeof NodeType.Element} type
 * @property {string} tagName
 * @property {number} namespace
 * @property {HtmlAttribute[]} attributes
 * @property {MatNode[]} children
 * @property {boolean} selfClosing
 * @property {number} start
 * @property {number} end
 * @property {number} tagEnd
 * @property {number} nameEnd
 * @property {number} contentEnd
 * @property {MatFragment=} templateContent
 */
/** @typedef {{ type: typeof NodeType.Text | typeof NodeType.Comment, data: string, start: number, end: number }} MatText */
/** @typedef {MatText} MatComment */
/** @typedef {{ type: typeof NodeType.Doctype, name: string, publicId: string | null, systemId: string | null, start: number, end: number }} MatDoctype */
/** @typedef {{ type: typeof NodeType.Document, children: MatNode[] }} MatDocument */
/** @typedef {{ type: typeof NodeType.DocumentFragment, children: MatNode[] }} MatFragment */
/** @typedef {MatElement | MatText | MatComment | MatDoctype} MatNode */

// `parseHtml` returns integer refs into reused module-level columns, valid
// only until the next parse; materialize each tree eagerly (reading every
// field through `A`, so this suite exercises the whole accessor surface) to
// keep assertions valid across the multiple parses many tests perform.
/**
 * @param {HtmlNodeRef} ref node ref
 * @returns {MatNode} plain-object node
 */
const materialize = (ref) => {
	const type = A.type(ref);
	switch (type) {
		case NodeType.Element: {
			const tc = A.templateContent(ref);
			return {
				type,
				tagName: A.tagName(ref),
				namespace: A.namespace(ref),
				attributes: A.attributes(ref),
				children: A.children(ref).map(materialize),
				selfClosing: A.selfClosing(ref),
				start: A.start(ref),
				end: A.end(ref),
				tagEnd: A.tagEnd(ref),
				nameEnd: A.nameEnd(ref),
				contentEnd: A.contentEnd(ref),
				templateContent:
					tc !== 0
						? {
								type: NodeType.DocumentFragment,
								children: A.children(tc).map(materialize)
							}
						: undefined
			};
		}
		case NodeType.Doctype:
			return {
				type,
				name: A.doctypeName(ref),
				publicId: A.doctypePublicId(ref),
				systemId: A.doctypeSystemId(ref),
				start: A.start(ref),
				end: A.end(ref)
			};
		default:
			// Text / Comment
			return {
				type: /** @type {typeof NodeType.Text | typeof NodeType.Comment} */ (
					type
				),
				data: A.data(ref),
				start: A.start(ref),
				end: A.end(ref)
			};
	}
};

/**
 * @param {string} src source
 * @param {string=} fragmentContext fragment context
 * @param {import("../lib/html/syntax").HtmlAstSkip=} skip skip options
 * @returns {MatDocument} materialized document
 */
const parseHtml = (src, fragmentContext, skip) => {
	const doc = parseHtmlRefs(src, 0, { fragmentContext, skip });
	return {
		type: NodeType.Document,
		children: A.children(doc).map(materialize)
	};
};

/**
 * @param {MatNode[]} children children
 * @param {string} tagName tag name
 * @returns {MatElement} the element
 */
const child = (children, tagName) =>
	/** @type {MatElement} */ (
		children.find((c) => c.type === NodeType.Element && c.tagName === tagName)
	);

// The tree builder always produces a full document (html > head, body); these
// helpers reach the interesting subtrees.
/**
 * @param {string} src source
 * @returns {MatElement} html element
 */
const html = (src) => child(parseHtml(src).children, "html");
/**
 * @param {string} src source
 * @returns {MatElement[]} body children
 */
const body = (src) =>
	/** @type {MatElement[]} */ (child(html(src).children, "body").children);
/**
 * @param {string} src source
 * @returns {MatElement[]} head children
 */
const head = (src) =>
	/** @type {MatElement[]} */ (child(html(src).children, "head").children);

/**
 * @param {string} src source
 * @param {string} tagName tag name
 * @returns {MatElement} first matching element anywhere
 */
const find = (src, tagName) => {
	/** @type {MatElement | undefined} */
	let found;
	/** @param {MatNode} node node to search */
	const walk = (node) => {
		if (found || node.type !== NodeType.Element) return;
		if (node.tagName === tagName) {
			found = node;
			return;
		}
		for (const c of node.children) walk(c);
	};
	for (const c of parseHtml(src).children) walk(c);
	return /** @type {MatElement} */ (found);
};

describe("parseHtml", () => {
	it("should produce an empty document with html/head/body scaffolding", () => {
		const ast = parseHtml("");
		expect(ast.type).toBe(NodeType.Document);
		const root = child(ast.children, "html");
		expect(root.tagName).toBe("html");
		expect(child(root.children, "head").tagName).toBe("head");
		expect(child(root.children, "body").tagName).toBe("body");
	});

	it("should parse a simple element into the body", () => {
		const nodes = body("<div></div>");
		expect(nodes).toHaveLength(1);
		expect(nodes[0].type).toBe(NodeType.Element);
		expect(nodes[0].tagName).toBe("div");
		expect(nodes[0].children).toEqual([]);
	});

	it("should parse nested elements", () => {
		const div = body("<div><span>hello</span></div>")[0];
		const span = /** @type {MatElement} */ (div.children[0]);
		expect(span.tagName).toBe("span");
		expect(span.children[0].type).toBe(NodeType.Text);
		expect(/** @type {MatText} */ (span.children[0]).data).toBe("hello");
	});

	it("should parse void elements", () => {
		const nodes = body('<img src="test.png"><br>');
		expect(nodes).toHaveLength(2);
		expect(nodes[0].tagName).toBe("img");
		expect(nodes[0].selfClosing).toBe(true);
		expect(nodes[1].tagName).toBe("br");
		expect(nodes[1].selfClosing).toBe(true);
	});

	it("should keep attribute values raw with source offsets", () => {
		const a = body('<a href="test.html" class="link">click</a>')[0];
		expect(a.attributes).toHaveLength(2);
		expect(a.attributes[0].name).toBe("href");
		expect(a.attributes[0].value).toBe("test.html");
		// Raw (undecoded) value preserved; consumers re-resolve from it.
		const raw = body('<a href="a&amp;b">x</a>')[0];
		expect(raw.attributes[0].value).toBe("a&amp;b");
		// Offsets line up with the source.
		const src = '<a href="test.html">x</a>';
		const link = body(src)[0];
		const attr = link.attributes[0];
		expect(src.slice(attr.valueStart, attr.valueEnd)).toBe("test.html");
	});

	it("should parse comments", () => {
		const ast = parseHtml("<!-- hello -->");
		expect(ast.children[0].type).toBe(NodeType.Comment);
		expect(/** @type {MatComment} */ (ast.children[0]).data).toBe(" hello ");
	});

	it("should parse doctype", () => {
		const ast = parseHtml("<!DOCTYPE html><html></html>");
		expect(ast.children[0].type).toBe(NodeType.Doctype);
		expect(/** @type {MatDoctype} */ (ast.children[0]).name).toBe("html");
	});

	it("should handle self-closing tags", () => {
		const nodes = body("<input/>");
		expect(nodes[0].tagName).toBe("input");
		expect(nodes[0].selfClosing).toBe(true);
	});

	it("should auto-close <p> when a block element opens", () => {
		const nodes = body("<p>one<div>two</div>");
		expect(nodes).toHaveLength(2);
		expect(nodes[0].tagName).toBe("p");
		expect(/** @type {MatText} */ (nodes[0].children[0]).data).toBe("one");
		expect(nodes[1].tagName).toBe("div");
	});

	it("should auto-close same-name elements like <li>", () => {
		const ul = body("<ul><li>one<li>two</ul>")[0];
		expect(ul.children).toHaveLength(2);
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (ul.children[0]).children[0]
			).data
		).toBe("one");
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (ul.children[1]).children[0]
			).data
		).toBe("two");
	});

	it("should merge adjacent text nodes", () => {
		// Foster-parenting the table's text next to the leading text exercises
		// the adjacent-text-node merge.
		const nodes = body("Text<table>Misplaced</table>");
		expect(nodes[0].type).toBe(NodeType.Text);
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (nodes[0])).data
		).toBe("TextMisplaced");
		expect(child(nodes, "table").tagName).toBe("table");
	});

	it("should detect SVG namespace and adjust foreign tag names", () => {
		const svg = body("<svg><lineargradient></lineargradient></svg>")[0];
		expect(svg.namespace).toBe(NS_SVG);
		// SVG tag-name case is corrected per the foreign adjustment table.
		expect(/** @type {MatElement} */ (svg.children[0]).tagName).toBe(
			"linearGradient"
		);
		expect(/** @type {MatElement} */ (svg.children[0]).namespace).toBe(NS_SVG);
	});

	it("should not resolve prototype-named SVG tags and attributes through the adjustment tables", () => {
		const svg = body('<svg><constructor toString="x"></constructor></svg>')[0];
		const el = /** @type {MatElement} */ (svg.children[0]);
		expect(el.tagName).toBe("constructor");
		expect(el.attributes[0].name).toBe("tostring");
	});

	it("should detect MathML namespace", () => {
		const math = body("<math><mi>x</mi></math>")[0];
		expect(math.namespace).toBe(NS_MATHML);
		expect(/** @type {MatElement} */ (math.children[0]).namespace).toBe(
			NS_MATHML
		);
	});

	it("should route head and body content to the right place", () => {
		const src =
			'<!DOCTYPE html><html><head><meta charset="utf-8"><title>T</title></head><body><h1>Hi</h1></body></html>';
		expect(child(head(src), "meta").tagName).toBe("meta");
		expect(child(head(src), "title").tagName).toBe("title");
		expect(child(body(src), "h1").tagName).toBe("h1");
	});

	it("should export namespace constants", () => {
		expect(NS_HTML).toBe(0);
		expect(NS_MATHML).toBe(1);
		expect(NS_SVG).toBe(2);
	});

	it("should handle valueless attributes", () => {
		const input = body("<input disabled>")[0];
		expect(input.attributes[0].name).toBe("disabled");
		expect(input.attributes[0].value).toBe("");
	});

	it("should handle all attribute quote styles", () => {
		const input = body("<input a=\"1\" b='2' c=3 disabled>")[0];
		expect(input.attributes.map((attr) => attr.value)).toEqual([
			"1",
			"2",
			"3",
			""
		]);
	});

	it("should construct the table structure with implied tbody/tr", () => {
		const table = body("<table><tr><td>a<td>b</tr></table>")[0];
		const tbody = /** @type {MatElement} */ (table.children[0]);
		expect(tbody.tagName).toBe("tbody");
		const tr = /** @type {MatElement} */ (tbody.children[0]);
		expect(
			tr.children.map((c) => /** @type {MatElement} */ (c).tagName)
		).toEqual(["td", "td"]);
	});

	it("should treat SVG foreignObject/desc as HTML integration points", () => {
		const svg = body(
			"<svg><foreignObject><div>html</div></foreignObject></svg>"
		)[0];
		const fo = /** @type {MatElement} */ (svg.children[0]);
		expect(fo.namespace).toBe(NS_SVG);
		expect(/** @type {MatElement} */ (fo.children[0]).namespace).toBe(NS_HTML);
		const desc = /** @type {MatElement} */ (
			body("<svg><desc><div>x</div></desc></svg>")[0].children[0]
		);
		expect(/** @type {MatElement} */ (desc.children[0]).namespace).toBe(
			NS_HTML
		);
	});

	it("should keep CDATA text in foreign content", () => {
		const svg = body("<svg><![CDATA[foo]]></svg>")[0];
		expect(svg.children[0].type).toBe(NodeType.Text);
		expect(/** @type {MatText} */ (svg.children[0]).data).toBe("foo");
	});

	it("should treat bogus comments as comments", () => {
		// A leading bogus comment is inserted into the document before <html>.
		const ast = parseHtml("<?bogus comment>");
		expect(ast.children[0].type).toBe(NodeType.Comment);
		expect(/** @type {MatComment} */ (ast.children[0]).data).toBe(
			"?bogus comment"
		);
	});

	it("should parse raw-text elements without decoding entities", () => {
		const script = find("<script>var a = 1 < 2 &amp; 3;</script>", "script");
		expect(script.children[0].type).toBe(NodeType.Text);
		expect(/** @type {MatText} */ (script.children[0]).data).toBe(
			"var a = 1 < 2 &amp; 3;"
		);
	});

	it("should set tagEnd, nameEnd and start used by the consumer", () => {
		const src = "<script>x</script>";
		const script = find(src, "script");
		expect(script.start).toBe(0);
		expect(script.tagEnd).toBe(8); // after "<script>"
		expect(src.slice(1, script.nameEnd)).toBe("script");
	});

	it("should update end offsets when an element is closed", () => {
		const src = "<div><span>text</div>";
		const div = body(src)[0];
		const span = /** @type {MatElement} */ (div.children[0]);
		expect(div.end).toBe(src.length);
		expect(span.end).toBe(src.length);
	});

	it("should foster-parent misplaced content out of tables", () => {
		const nodes = body(
			"<table><div>Misplaced</div><tr><td>OK</td></tr></table>"
		);
		expect(nodes[0].tagName).toBe("div");
		expect(/** @type {MatText} */ (nodes[0].children[0]).data).toBe(
			"Misplaced"
		);
		expect(nodes[1].tagName).toBe("table");
	});

	describe("adoption agency algorithm", () => {
		it("should move the furthest block to the common ancestor", () => {
			// `<b>1<p>2</b>3</p>`: per WHATWG the <p> (furthest block) is relocated
			// to the common ancestor (body); the original <b> keeps only "1" and a
			// <b> clone wraps the content that stayed inside <p>.
			const nodes = body("<b>1<p>2</b>3</p>");
			expect(nodes.map((n) => n.tagName)).toEqual(["b", "p"]);
			expect(
				nodes[0].children.map((n) => /** @type {MatText} */ (n).data)
			).toEqual(["1"]);
			const p = nodes[1];
			expect(/** @type {MatElement} */ (p.children[0]).tagName).toBe("b");
			expect(
				/** @type {MatText} */ (
					/** @type {MatElement} */ (p.children[0]).children[0]
				).data
			).toBe("2");
			expect(/** @type {MatText} */ (p.children[1]).data).toBe("3");
		});

		it("should reconstruct active formatting elements", () => {
			const nodes = body("<p>1<b>2</p>3</b>");
			expect(nodes[0].tagName).toBe("p");
			expect(/** @type {MatElement} */ (nodes[0].children[1]).tagName).toBe(
				"b"
			);
			expect(nodes[1].tagName).toBe("b");
			expect(/** @type {MatText} */ (nodes[1].children[0]).data).toBe("3");
		});

		it("should apply Noah's Ark limit of three formatting elements", () => {
			const nodes = body("<b><b><b><b></b></b></b></b>");
			expect(nodes).toHaveLength(1);
		});

		it("should not duplicate an attribute span when a formatting element is cloned", () => {
			// The <a> is reopened around <div> by the algorithm; the clone must not
			// reuse the original's href span, or the parser emits two dependencies.
			const nodes = body("<a href=x.png><div>y</a>");
			/** @type {string[]} */
			const spans = [];
			/** @param {MatNode} node node to collect from */
			const collect = (node) => {
				if (node.type !== NodeType.Element) return;
				for (const attr of node.attributes) {
					if (attr.valueStart !== undefined && attr.valueStart !== -1) {
						spans.push(`${attr.valueStart},${attr.valueEnd}`);
					}
				}
				for (const c of node.children) collect(c);
			};
			for (const node of nodes) collect(node);
			expect(spans).toEqual([...new Set(spans)]);
		});
	});

	it("should auto-close and close <dd>/<dt>", () => {
		const dl = body("<dl><dd>a</dd><dt>b</dt></dl>")[0];
		expect(dl.tagName).toBe("dl");
		expect(
			dl.children.map((c) => /** @type {MatElement} */ (c).tagName)
		).toEqual(["dd", "dt"]);
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (dl.children[0]).children[0]
			).data
		).toBe("a");
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (dl.children[1]).children[0]
			).data
		).toBe("b");
	});

	it("should keep <table> inside <p> in quirks mode (transitional doctype)", () => {
		// A 4.01-Transitional public id (no system id) selects quirks mode, where
		// `<table>` does NOT close an open `<p>`.
		const quirks = body(
			'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><p>x<table></table>'
		);
		expect(quirks).toHaveLength(1);
		expect(quirks[0].tagName).toBe("p");
		expect(child(quirks[0].children, "table")).toBeDefined();

		// No-quirks: `<table>` closes the `<p>` so they are siblings.
		const standard = body("<!DOCTYPE html><p>x<table></table>");
		expect(standard.map((n) => n.tagName)).toEqual(["p", "table"]);
	});

	it("should mirror the selected <option> into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></button><option><span id=x>Y</span>"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		const span = /** @type {MatElement} */ (selectedcontent.children[0]);
		expect(span.tagName).toBe("span");
		expect(/** @type {MatText} */ (span.children[0]).data).toBe("Y");
		// The clone carries the attribute name/value but no source offsets, so
		// the consumer never re-emits a dependency for it.
		expect(span.attributes[0].name).toBe("id");
		expect(span.attributes[0].value).toBe("x");
		expect(span.attributes[0].valueStart).toBe(-1);
	});

	it("clones <template> content when mirroring into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></button><option><template><p>x</p></template>"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		const template = /** @type {MatElement} */ (selectedcontent.children[0]);
		expect(template.tagName).toBe("template");
		// The cloned template keeps its own document-fragment content.
		const fragment = /** @type {MatFragment} */ (template.templateContent);
		expect(fragment.type).toBe(NodeType.DocumentFragment);
		expect(/** @type {MatElement} */ (fragment.children[0]).tagName).toBe("p");
	});

	it("should mirror the last selected <option> into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></button><option>A<option selected>B"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(/** @type {MatText} */ (selectedcontent.children[0]).data).toBe("B");
	});

	it("foster-parents stray text in a table fragment context", () => {
		// Context is a `table`, so there is no `<table>` on the open stack: stray
		// character data is fostered to the fragment root, beside the table rows.
		const root = /** @type {MatElement} */ (
			parseHtml("<tr><td>a</td></tr>x", "table").children[0]
		);
		const texts = root.children
			.filter((c) => c.type === NodeType.Text)
			.map((c) => /** @type {MatText} */ (c).data);
		expect(texts).toContain("x");
		expect(child(root.children, "tbody")).toBeDefined();
	});
});

describe("parseHtml — SourceProcessor", () => {
	const { NodeType, SourceProcessor } = require("../lib/html/syntax");

	it("fires enter / exit visitors in source order", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (path) => log.push(`enter:${path.tagName()}`),
						exit: (path) => log.push(`exit:${path.tagName()}`)
					},
					[NodeType.Text]: (path) => log.push(`text:${path.data()}`)
				})
			)
			.process("<div><span>a</span>b</div>");
		expect(log).toEqual([
			"enter:html",
			"enter:head",
			"exit:head",
			"enter:body",
			"enter:div",
			"enter:span",
			"text:a",
			"exit:span",
			"text:b",
			"exit:div",
			"exit:body",
			"exit:html"
		]);
	});

	it("visits the document root with a null parent", () => {
		/** @type {[number, number | null][]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.Document]: (path) => seen.push([path.type(), path.parent])
			})
			.process("<p>x</p>");
		expect(seen).toEqual([[NodeType.Document, null]]);
	});

	it("fires comment / doctype visitors", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Doctype]: () => log.push("doctype"),
				[NodeType.Comment]: (path) => log.push(`comment:${path.data()}`)
			})
			.process("<!DOCTYPE html><!--c--><p>x</p>");
		expect(log).toEqual(["doctype", "comment:c"]);
	});

	it("path.skipChildren() stops descent into a node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Element]: (path) => {
					log.push(path.tagName());
					if (path.tagName() === "div") path.skipChildren();
				}
			})
			.process("<div><span>a</span></div><p>b</p>");
		expect(log).toEqual(["html", "head", "body", "div", "p"]);
	});

	it("walks <template> content as a document fragment", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.DocumentFragment]: () => log.push("fragment"),
				[NodeType.Element]: (path) => log.push(path.tagName())
			})
			.process("<template><p>x</p></template>");
		expect(log).toEqual(["html", "head", "template", "fragment", "p", "body"]);
	});

	it("use() chains and accumulates visitors per type", () => {
		let a = 0;
		let b = 0;
		const sp = new SourceProcessor()
			.use({ [NodeType.Element]: () => a++ })
			.use({ [NodeType.Element]: () => b++ });
		expect(sp).toBeInstanceOf(SourceProcessor);
		sp.process("<p>x</p>");
		expect(a).toBe(b);
		expect(a).toBeGreaterThan(0);
	});
});

describe("parseHtml — insertion-mode edge cases", () => {
	it("merges foster-parented text runs before a table", () => {
		const nodes = body("<table>x<tr></tr>y</table>");
		// Both stray runs are fostered before the table and merged into one node.
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (nodes[0])).data
		).toBe("xy");
		expect(nodes[1].type).toBe(NodeType.Element);
	});

	it("keeps end tags and comments under foreign rules inside <svg>", () => {
		const svg = find("<svg><circle></circle><!--c--></svg>", "svg");
		expect(/** @type {MatElement} */ (svg.children[0]).tagName).toBe("circle");
		expect(svg.children[1].type).toBe(NodeType.Comment);
	});

	it("ignores stray end tags before head", () => {
		const nodes = body("</div><p>x</p>");
		expect(/** @type {MatElement} */ (nodes[0]).tagName).toBe("p");
	});

	it("handles <noscript> in head with comments, whitespace, and stray tags", () => {
		const noscript = find(
			"<head><noscript><!--c--> <link></div><head></noscript></head>",
			"noscript"
		);
		expect(noscript.children[0].type).toBe(NodeType.Comment);
		expect(
			/** @type {MatElement} */ (
				noscript.children.find((c) => c.type === NodeType.Element)
			).tagName
		).toBe("link");
	});

	it("pops <noscript> in head on non-passthrough content", () => {
		// <span> is not allowed in head-noscript: noscript is popped and the
		// span lands in the body.
		const nodes = body("<head><noscript><span>x</span></noscript></head>");
		expect(/** @type {MatElement} */ (nodes[0]).tagName).toBe("span");
	});

	it("keeps comments between </head> and <body>", () => {
		const root = html("<head></head><!--c--><body>x</body>");
		expect(root.children.some((c) => c.type === NodeType.Comment)).toBe(true);
	});

	it("re-dispatches EOF inside an unterminated <template>", () => {
		const template = find("<template>x", "template");
		expect(template.templateContent).toBeDefined();
	});

	it("keeps comments inside <table>", () => {
		const table = find("<table><!--c--></table>", "table");
		expect(table.children[0].type).toBe(NodeType.Comment);
	});

	it("closes <caption> via </caption>, </table>, and row triggers", () => {
		const t1 = find("<table><caption>a</caption></table>", "table");
		expect(/** @type {MatElement} */ (t1.children[0]).tagName).toBe("caption");
		// A <tr> start while in caption closes the caption first.
		const t2 = find("<table><caption>a<tr><td>b</table>", "table");
		expect(/** @type {MatElement} */ (t2.children[0]).tagName).toBe("caption");
		expect(child(t2.children, "tbody")).toBeDefined();
		// Ignored stray ends inside caption.
		const t3 = find("<table><caption>a</td></tbody>b</table>", "table");
		expect(
			/** @type {MatText} */ (
				/** @type {MatElement} */ (t3.children[0]).children[0]
			).data
		).toBe("ab");
	});

	it("parses <colgroup> with cols, comments, and implicit close", () => {
		const table = find(
			"<table><colgroup><!--c--><col span='2'></col></colgroup><tr><td>x</table>",
			"table"
		);
		const colgroup = child(table.children, "colgroup");
		expect(colgroup.children.some((c) => c.type === NodeType.Comment)).toBe(
			true
		);
		expect(child(colgroup.children, "col")).toBeDefined();
		// Implicit close: a row start while in colgroup pops it.
		expect(child(table.children, "tbody")).toBeDefined();
		// Character data pops colgroup back to table (fostered out).
		const t2 = find("<table><colgroup>x</table>", "table");
		expect(child(t2.children, "colgroup")).toBeDefined();
	});

	it("closes a row via </tbody> and ignores stray cell ends in a row", () => {
		const table = find("<table><tbody><tr><td>a</td></tbody></table>", "table");
		const tbody = child(table.children, "tbody");
		expect(child(child(tbody.children, "tr").children, "td")).toBeDefined();
		// ROW_IGNORED_ENDS: a stray </td> directly in row mode is dropped.
		const t2 = find("<table><tr></td><td>b</td></tr></table>", "table");
		expect(
			child(child(child(t2.children, "tbody").children, "tr").children, "td")
		).toBeDefined();
	});

	it("handles content after </html> (after-after-body)", () => {
		const ast = parseHtml("<p>a</p></html><!--c-->z");
		// Comment after </html> attaches to the document.
		expect(ast.children.some((c) => c.type === NodeType.Comment)).toBe(true);
		// Non-whitespace text re-enters the body.
		const texts = body("<p>a</p></html>z");
		expect(
			/** @type {MatText} */ (/** @type {MatElement} */ (texts[0]).children[0])
				.data
		).toBe("a");
	});

	it("parses nested frameset elements, frames, and noframes", () => {
		const src =
			"<frameset cols='50%,50%'> <!--c--><frame src='a'><frameset><frame></frameset></frameset> <!--d--></html> <!--e--><noframes>n</noframes>";
		const root = html(src);
		const frameset = child(root.children, "frameset");
		expect(frameset).toBeDefined();
		expect(child(frameset.children, "frame")).toBeDefined();
		expect(child(frameset.children, "frameset")).toBeDefined();
		expect(frameset.children.some((c) => c.type === NodeType.Comment)).toBe(
			true
		);
		// afterFrameset comment + </html> → afterAfterFrameset comment/noframes.
		const ast = parseHtml(src);
		expect(ast.children.some((c) => c.type === NodeType.Comment)).toBe(true);
		expect(find(src, "noframes")).toBeDefined();
	});

	it("ignores </frameset> at the root frameset and html start in frameset", () => {
		const src = "<frameset></frameset></frameset><html lang='x'>";
		expect(child(html(src).children, "frameset")).toBeDefined();
	});

	it("mirrors the selected option from an <optgroup> into <selectedcontent>", () => {
		const select = body(
			"<select><button><selectedcontent></selectedcontent></button><optgroup><option selected>B</optgroup></select>"
		)[0];
		const selectedcontent = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(/** @type {MatText} */ (selectedcontent.children[0]).data).toBe("B");
	});
});

describe("parseHtml — stray doctype and <html> re-dispatch", () => {
	it("ignores a mid-document doctype and merges stray <html> attributes", () => {
		// A stray doctype is dropped and a repeated <html> merges new
		// attributes in colgroup / table / noscript / frameset modes.
		const t = find(
			"<table><colgroup><!DOCTYPE html></col><template></template><col></colgroup></table>",
			"table"
		);
		expect(child(child(t.children, "colgroup").children, "col")).toBeDefined();
		expect(find("<table><colgroup>", "colgroup")).toBeDefined();
		expect(
			find("<head><noscript><!DOCTYPE html></noscript>", "noscript")
		).toBeDefined();
		const t2 = find("<table><!DOCTYPE html><tr><td>x</table>", "table");
		expect(child(t2.children, "tbody")).toBeDefined();
	});

	it("handles stray doctype and <html> around frameset content", () => {
		const root = html(
			"<frameset><!DOCTYPE html><html lang='a'><frame></frameset><!DOCTYPE html><html lang='b'></html><!DOCTYPE html><html lang='c'>"
		);
		expect(child(root.children, "frameset")).toBeDefined();
		// The stray <html> start tags merged their attributes into the root.
		expect(root.attributes.some((a) => a.name === "lang")).toBe(true);
	});

	it("merges stray <html> after </html> (after-after-body)", () => {
		const root = html("<p>x</p></html><html lang='z'>");
		expect(root.attributes.some((a) => a.name === "lang")).toBe(true);
	});
});

// The `skip` options are pure output reductions: tree construction (and quirks
// detection) must run identically, so the ELEMENT tree — tags, nesting, offsets
// and attributes — is the same with any skip combination as with none. This
// guards the risky `skip.text` path, which drops text-node insertion.
describe("parseHtml — skip options preserve element structure", () => {
	// A spread of construction edge cases: foster parenting, adoption agency,
	// select/table/ruby scoping, foreign content, raw-text elements, quirks.
	const cases = [
		"<!DOCTYPE html><html><head><title>t</title></head><body>hi</body></html>",
		"<table>foo<td>bar</td></table>",
		"a<table>b</table>c",
		"text<table><tbody><tr>cell<td>real</table>after",
		"<p>a<b>b<i>c</p>d</i>e",
		"<b>1<p>2</b>3",
		"<a>1<a>2<a>3",
		"<select>x<option>y</option>z</select>",
		"<ruby>base<rt>anno</rt></ruby>",
		"<div><table>txt<svg><foreignObject><div>x</div></foreignObject></svg></table></div>",
		"<math><mtext>t<mglyph>g</math>after",
		"<script>var a = 1 < 2 && '</x>';</script><style>.a{color:red}</style>",
		"<pre>\nkeep</pre><textarea>\nx</textarea>",
		"<!-- c1 --><p>x<!-- c2 --></p><!-- c3 -->",
		"<frameset>x<frame></frameset>",
		// Foreign-content CDATA becomes character data (dropped as prose).
		"<svg><![CDATA[cdata text]]><rect/></svg>",
		// No doctype → quirks mode; skip.doctype must not change that.
		"<table><tr><td>quirks</td></tr></table>",
		// Entities/whitespace in prose text (whitespace routing in head/table).
		"  <html>  <head>  </head>  <body> a &amp; b &#60; c </body> </html>",
		// Escapable raw-text bodies + a title in head.
		"<title>page &amp; more</title><textarea>form\ntext</textarea>",
		// Button scope + implied end tags.
		"<button><p>x</button>y",
		// Comment-only document.
		"<!-- only a comment -->",
		// `skip.text` whitespace fast-path fallbacks: whitespace-producing
		// character references, CR normalization, and NUL must still route text
		// exactly (these decide foster-parenting / framesetOk).
		"<table>&#32;&#9;<td>a</td></table>",
		"<div>&#32;&#32;</div>plain  text",
		"a<table>\r\n  <tr><td>b\0c</td></tr></table>d",
		"<pre>\r\nkeep</pre>"
	];

	/**
	 * @param {MatDocument} doc document
	 * @returns {string} a signature of the element tree (tags, nesting, offsets, attrs)
	 */
	const elementSignature = (doc) => {
		/** @type {string[]} */
		const out = [];
		/**
		 * @param {MatNode | MatDocument | MatFragment} node node
		 * @param {number} depth depth
		 */
		const walk = (node, depth) => {
			if (node.type === NodeType.Element) {
				const attrs = node.attributes
					.map(
						(a) =>
							`${a.name}(${a.nameStart},${a.nameEnd},${a.valueStart},${a.valueEnd})`
					)
					.join(",");
				out.push(
					`${depth}:${node.tagName}@${node.namespace}[${node.start},${node.end},${node.tagEnd},${node.nameEnd}]{${attrs}}`
				);
				if (node.templateContent) {
					for (const c of node.templateContent.children) walk(c, depth + 1);
				}
			}
			if ("children" in node) {
				for (const c of node.children) walk(c, depth + 1);
			}
		};
		walk(doc, 0);
		return out.join("\n");
	};

	// Every non-empty subset of the skip flags (incl. { text, doctype }, the
	// combination HtmlParser uses).
	const skipCombos = [
		{ text: true },
		{ comments: true },
		{ doctype: true },
		{ text: true, comments: true },
		{ text: true, doctype: true },
		{ comments: true, doctype: true },
		{ text: true, comments: true, doctype: true }
	];

	it.each(cases)("keeps the element tree stable under skip (%s)", (src) => {
		const baseline = elementSignature(parseHtml(src));
		for (const skip of skipCombos) {
			expect(elementSignature(parseHtml(src, undefined, skip))).toBe(baseline);
		}
	});

	it("skip.text drops every text node; raw-text bodies stay readable via contentEnd", () => {
		const src = "<p>prose</p><script>var x=1;</script>";
		const doc = parseHtml(src, undefined, { text: true });
		/** @type {MatText[]} */
		const texts = [];
		/** @type {MatElement | undefined} */
		let script;
		/** @param {MatNode} n node */
		const walk = (n) => {
			if (n.type === NodeType.Text) texts.push(n);
			if (n.type === NodeType.Element) {
				if (n.tagName === "script") script = n;
				for (const c of n.children) walk(c);
			}
		};
		for (const c of doc.children) walk(c);
		// No text nodes at all — not even the <script> body.
		expect(texts).toHaveLength(0);
		// The body is read by offset from the element's [tagEnd, contentEnd].
		expect(
			src.slice(
				/** @type {MatElement} */ (script).tagEnd,
				/** @type {MatElement} */ (script).contentEnd
			)
		).toBe("var x=1;");
	});

	it("skip.comments drops comment nodes; skip.doctype drops the doctype node", () => {
		const src = "<!DOCTYPE html><!-- c --><p></p>";
		const count = (
			/** @type {MatDocument} */ doc,
			/** @type {number} */ type
		) => {
			let n = 0;
			/** @param {MatNode} node node */
			const walk = (node) => {
				if (node.type === type) n++;
				if ("children" in node) for (const c of node.children) walk(c);
			};
			for (const c of doc.children) walk(c);
			return n;
		};
		expect(
			count(parseHtml(src, undefined, { comments: true }), NodeType.Comment)
		).toBe(0);
		expect(
			count(parseHtml(src, undefined, { doctype: true }), NodeType.Doctype)
		).toBe(0);
		// Baseline still has both.
		expect(count(parseHtml(src), NodeType.Comment)).toBe(1);
		expect(count(parseHtml(src), NodeType.Doctype)).toBe(1);
	});

	it("skip.text records every raw-text element body span on contentEnd", () => {
		// script/style (raw text) + textarea/title (escapable raw text): each body
		// is the element's raw value, recorded as [tagEnd, contentEnd] — no Text node.
		const src =
			"<title>ti</title><style>.s{}</style></head><body>prose<script>sc</script><textarea>ta</textarea>";
		const doc = parseHtml(src, undefined, { text: true });
		/** @type {Record<string, string>} */
		const bodies = {};
		/** @param {MatNode} n node */
		const walk = (n) => {
			// No Text nodes are emitted under skip.text.
			expect(n.type).not.toBe(NodeType.Text);
			if (n.type === NodeType.Element) {
				if (n.contentEnd > n.tagEnd) {
					bodies[n.tagName] = src.slice(n.tagEnd, n.contentEnd);
				}
				for (const c of n.children) walk(c);
			}
		};
		for (const c of doc.children) walk(c);
		expect(bodies).toEqual({
			title: "ti",
			style: ".s{}",
			script: "sc",
			textarea: "ta"
		});
	});

	it("skip.text records contentEnd for foreign-content <style>/<script>", () => {
		// SVG <style>/<script> stay in the SVG namespace and their bodies are plain
		// text; HtmlParser extracts them regardless of namespace, so contentEnd must
		// be recorded here too.
		const src = "<svg><style>.a{}</style><script>x()</script></svg>";
		const doc = parseHtml(src, undefined, { text: true });
		/** @type {Record<string, string>} */
		const bodies = {};
		/** @param {MatNode} n node */
		const walk = (n) => {
			if (n.type === NodeType.Element) {
				if (n.contentEnd > n.tagEnd) {
					bodies[n.tagName] = src.slice(n.tagEnd, n.contentEnd);
				}
				for (const c of n.children) walk(c);
			}
		};
		for (const c of doc.children) walk(c);
		expect(bodies).toEqual({ style: ".a{}", script: "x()" });
	});

	it("skip options preserve element structure under fragment parsing", () => {
		// Fragment contexts drive a different initial insertion mode; skips must
		// still leave the element tree (and offsets) identical.
		/** @type {[string, string][]} */
		const fragments = [
			["<td>a</td><tr><td>b", "table"],
			["<li>x<li>y", "ul"],
			["text<b>bold</b>", "div"],
			["<rect/>text", "svg"]
		];
		for (const [src, ctx] of fragments) {
			const base = elementSignature(parseHtml(src, ctx));
			for (const skip of skipCombos) {
				expect(elementSignature(parseHtml(src, ctx, skip))).toBe(base);
			}
		}
	});
});

describe("parseHtml — tree-construction edge cases (SoA columns)", () => {
	/**
	 * @param {string} src source
	 * @param {import("../lib/html/syntax").HtmlAstSkip=} skip skip options
	 * @returns {MatNode[]} body children
	 */
	const bodyOf = (src, skip) =>
		child(
			child(parseHtml(src, undefined, skip).children, "html").children,
			"body"
		).children;

	it("grows the node and attribute columns past their initial capacity", () => {
		let src = "";
		for (let i = 0; i < 5000; i++) src += `<i data-n="${i}"></i>`;
		const nodes = body(src);
		expect(nodes).toHaveLength(5000);
		expect(nodes[4999].attributes[0].value).toBe("4999");
	});

	it("re-shrinks the columns after a pathologically large document", () => {
		// > 64 Ki nodes and attributes grow the columns past the shrink
		// threshold; the release after the parse re-shrinks them and the next
		// parse must work from the re-grown baseline
		let src = "";
		for (let i = 0; i < 70000; i++) src += `<i data-n="${i}"></i>`;
		const nodes = body(src);
		expect(nodes).toHaveLength(70000);
		expect(nodes[69999].attributes[0].value).toBe("69999");
		const small = body('<b class="c">x</b>');
		expect(small).toHaveLength(1);
		expect(small[0].attributes[0].value).toBe("c");
	});

	it("merges texts left adjacent by a skipped comment", () => {
		const nodes = bodyOf("a<!--c-->b", { comments: true });
		expect(nodes).toEqual([
			expect.objectContaining({ type: NodeType.Text, data: "ab" })
		]);
	});

	it("foster-parents text inside <template> containing a table", () => {
		const template = head("<template><table>x</table></template>")[0];
		const content = /** @type {MatFragment} */ (template.templateContent);
		expect(content.children.map((c) => c.type)).toEqual([
			NodeType.Text,
			NodeType.Element
		]);
		expect(/** @type {MatText} */ (content.children[0]).data).toBe("x");
	});

	it("splits leading whitespace out of a <colgroup>", () => {
		const table = child(bodyOf("<table><colgroup> x<col>"), "table");
		// "x" pops the colgroup (fostered before the table); <col> reopens one.
		const colgroups = table.children.filter(
			(c) => c.type === NodeType.Element && c.tagName === "colgroup"
		);
		expect(colgroups).toHaveLength(2);
		expect(
			child(/** @type {MatElement} */ (colgroups[1]).children, "col")
		).toBeDefined();
	});

	it("closes a <colgroup> on its end tag and on anything-else", () => {
		const t1 = child(
			bodyOf("<table><colgroup><col></colgroup><tr><td>x"),
			"table"
		);
		expect(child(t1.children, "colgroup")).toBeDefined();
		expect(child(t1.children, "tbody")).toBeDefined();
		const t2 = child(bodyOf("<table><colgroup><tbody><tr><td>x"), "table");
		expect(child(t2.children, "tbody")).toBeDefined();
	});

	it("moves an <hr> out of option/optgroup context in <select>", () => {
		const select = child(
			bodyOf("<select><option>a<optgroup><option>b<hr><option>c"),
			"select"
		);
		const tags = select.children
			.filter((c) => c.type === NodeType.Element)
			.map((c) => /** @type {MatElement} */ (c).tagName);
		expect(tags).toContain("hr");
	});

	it("keeps <selectedcontent> content when the select has no options", () => {
		const select = child(
			bodyOf(
				"<select><button><selectedcontent>x</selectedcontent></button></select>"
			),
			"select"
		);
		const sc = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(sc.children).toEqual([
			expect.objectContaining({ type: NodeType.Text, data: "x" })
		]);
	});

	it("mirrors the last selected option found inside an <optgroup>", () => {
		const select = child(
			bodyOf(
				"<select><button><selectedcontent></selectedcontent></button><optgroup> <option>A<option selected>B</optgroup></select>"
			),
			"select"
		);
		const sc = child(
			child(select.children, "button").children,
			"selectedcontent"
		);
		expect(/** @type {MatText} */ (sc.children[0]).data).toBe("B");
	});

	it("applies the Noah's Ark clause to identical formatting elements", () => {
		// Four identical <b class="x"> in the active formatting list: only three
		// survive, so the reconstruction in the second <p> nests three <b>.
		const src =
			'<p>1<b class="x"><b class="x"><b class="x"><b class="x">2</p><p>3';
		const paragraphs = bodyOf(src).filter(
			(c) => c.type === NodeType.Element && c.tagName === "p"
		);
		/**
		 * @param {MatElement} el element
		 * @returns {number} depth of nested <b>
		 */
		const bDepth = (el) => {
			let depth = 0;
			for (let b = child(el.children, "b"); b; b = child(b.children, "b")) {
				depth++;
			}
			return depth;
		};
		expect(bDepth(/** @type {MatElement} */ (paragraphs[0]))).toBe(4);
		expect(bDepth(/** @type {MatElement} */ (paragraphs[1]))).toBe(3);
	});

	it("clones attributes when the adoption agency splits a formatting element", () => {
		const p = find('<b class="x">1<p>2</b>3', "p");
		const clone = child(p.children, "b");
		expect(clone.attributes).toEqual([
			expect.objectContaining({ name: "class", value: "x" })
		]);
	});

	it("treats <annotation-xml encoding=text/html> as an integration point", () => {
		const ax = find(
			'<math><annotation-xml encoding="text/html"><div>x</div></annotation-xml></math>',
			"annotation-xml"
		);
		const div = child(ax.children, "div");
		expect(div.namespace).toBe(NS_HTML);
	});

	it("adjusts SVG and MathML attribute names", () => {
		const svg = find('<svg viewbox="0 0 1 1" xlink:href="#a"/>', "svg");
		const byName = new Map(svg.attributes.map((a) => [a.name, a]));
		expect(byName.has("viewBox")).toBe(true);
		const xlink = /** @type {HtmlAttribute} */ (byName.get("xlink:href"));
		expect(xlink.serializedName).toBe("xlink href");
		const math = find('<math definitionurl="u">', "math");
		expect(math.attributes[0].name).toBe("definitionURL");
	});

	it("breaks a <font> with a color attribute out of foreign content", () => {
		const nodes = bodyOf('<svg><font color="red">x');
		const font = child(nodes, "font");
		expect(font.namespace).toBe(NS_HTML);
		// Without a breakout attribute the font stays inside the svg.
		const svg = child(bodyOf("<svg><font other=1>x"), "svg");
		expect(child(svg.children, "font").namespace).toBe(NS_SVG);
	});

	it("merges attributes of a repeated <body> tag", () => {
		const doc = parseHtml('<body class="a"><body id="b" class="c">x');
		const bodyEl = child(child(doc.children, "html").children, "body");
		const byName = new Map(bodyEl.attributes.map((a) => [a.name, a.value]));
		expect(byName.get("class")).toBe("a");
		expect(byName.get("id")).toBe("b");
	});

	it("replaces an empty <body> with a <frameset>", () => {
		// An implied body (opened by <div>) leaves frameset-ok set, so the
		// <frameset> detaches it; an explicit <body> tag would clear the flag.
		const doc = parseHtml(
			'<div><frameset rows="1"> <frameset cols="2"><frame></frameset></frameset>'
		);
		const htmlEl = child(doc.children, "html");
		expect(child(htmlEl.children, "body")).toBeUndefined();
		const outer = child(htmlEl.children, "frameset");
		const inner = child(outer.children, "frameset");
		expect(child(inner.children, "frame")).toBeDefined();
	});

	it("closes an open <dd> when a <dt> starts", () => {
		const dl = child(bodyOf("<dl><dd>a<dt>b</dl>"), "dl");
		const items = dl.children
			.filter((c) => c.type === NodeType.Element)
			.map((c) => /** @type {MatElement} */ (c).tagName);
		expect(items).toEqual(["dd", "dt"]);
	});

	it("closes an open <a> when a new <a> starts", () => {
		const nodes = bodyOf('<a href="1">x<a href="2">y');
		const anchors = nodes.filter(
			(c) => c.type === NodeType.Element && c.tagName === "a"
		);
		expect(anchors).toHaveLength(2);
	});

	it("closes an open <button> when a new <button> starts", () => {
		const nodes = bodyOf("<button>a<button>b");
		const buttons = nodes.filter(
			(c) => c.type === NodeType.Element && c.tagName === "button"
		);
		expect(buttons).toHaveLength(2);
	});

	it("closes an open heading when a new heading starts", () => {
		const tags = bodyOf("<h1>a<h2>b")
			.filter((c) => c.type === NodeType.Element)
			.map((c) => /** @type {MatElement} */ (c).tagName);
		expect(tags).toEqual(["h1", "h2"]);
	});

	it("</form> closes the form even with open descendants", () => {
		const form = child(bodyOf("<form><div>x</form>y<input>"), "form");
		// The stray input after </form> lands in the div (still open), not the form.
		expect(child(child(form.children, "div").children, "input")).toBeDefined();
	});

	it("keeps <input type=hidden> inside a table", () => {
		const table = child(
			bodyOf('<table><input type="hidden"><input type="text"></table>'),
			"table"
		);
		const hidden = child(table.children, "input");
		expect(hidden.attributes[0].value).toBe("hidden");
	});

	it("attaches comments after </body> to the <html> element", () => {
		const htmlEl = child(parseHtml("x</body><!--c-->").children, "html");
		expect(htmlEl.children.map((c) => c.type)).toContain(NodeType.Comment);
	});

	it("parses text in a foreign fragment context", () => {
		const doc = parseHtmlRefs("x<div>y", 0, { fragmentContext: "svg" });
		const root = A.firstChild(doc);
		expect(A.type(A.firstChild(root))).toBe(NodeType.Text);
	});

	it("runs the adoption agency in a table-row fragment context", () => {
		const doc = parseHtml("<b>x<tr>y</b>z", "tr");
		const root = child(doc.children, "html");
		expect(
			/** @type {MatText} */ (child(root.children, "b").children[0]).data
		).toBe("xy");
	});
});

describe("parseHtml — path accessor completeness", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	it("exposes node, parent links and attribute spans on the path", () => {
		const SRC = '<!DOCTYPE html PUBLIC "p" "s"><div id="d" checked>x</div>';
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Doctype]: (path) => {
						const n = path.node;
						log.push(
							`doctype:${path.doctypePublicId(n)}/${path.doctypeSystemId(n)}`
						);
					},
					[NodeType.Element]: (path) => {
						if (path.tagName() !== "div") return;
						log.push(`node:${path.node !== null}`);
						log.push(
							`parentTag:${path.tagName(/** @type {number} */ (path.parent))}`
						);
						log.push(`parentOf:${path.parentOf() === path.parent}`);
						log.push(`attrs:${path.attributeCount()}`);
						const id = path.findAttribute("id");
						log.push(`id:${path.attributeName(id)}=${path.attributeValue(id)}`);
						log.push(
							`idName:${SRC.slice(
								path.attributeNameStart(id),
								path.attributeNameEnd(id)
							)}`
						);
						log.push(
							`idValue:${SRC.slice(
								path.attributeValueStart(id),
								path.attributeValueEnd(id)
							)}`
						);
						const checked = path.attributeAt(1);
						log.push(`checkedValueStart:${path.attributeValueStart(checked)}`);
						log.push(`firstChildType:${path.type(path.firstChild())}`);
						log.push(`nextSibling:${path.nextSibling()}`);
					}
				})
			)
			.process(SRC);
		expect(log).toEqual([
			"doctype:p/s",
			"node:true",
			"parentTag:body",
			"parentOf:true",
			"attrs:2",
			"id:id=d",
			"idName:id",
			"idValue:d",
			"checkedValueStart:-1",
			`firstChildType:${NodeType.Text}`,
			"nextSibling:0"
		]);
	});
});
