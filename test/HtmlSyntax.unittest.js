"use strict";

// cspell:ignore apos notpre Elig reconsumes xyzabc zzzunknown codepoint DFFF ampx noncharacter FFFE
// cspell:ignore selectedcontent mtext mglyph colgroups viewbox definitionurl
// cspell:ignore contenteditable enterkeyhint formenctype formmethod formtarget
// cspell:ignore inputmode writingsuggestions
// cspell:ignore scripty
// cspell:ignore DOCTYPEÐ DOCTYPEİ Silmaril basefont bgsound framesets isindex
// cspell:ignore malignmark menuitem noembed noframes optgroup reparent spacer

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
	parseCssUrls,
	parseHtml: parseHtmlRefs,
	parseMsapplicationTask,
	parseSrc,
	parseSrcset,
	tokenize
} = require("../lib/html/syntax");
const serializeHtmlTree = require("./helpers/serializeHtmlTree");

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
		// `<![CDATA[` only opens a CDATA section when there is an adjusted current
		// node outside the HTML namespace (§13.2.5.42). Without an `isForeign`
		// callback there is none, so this is a bogus comment ending at the first
		// `>` — as in a browser, which leaves the trailing `]]>` as text.
		expect(results).toEqual([
			["open", "div"],
			["comment", "<![CDATA[<img src='x'>"],
			["close", "div"]
		]);
	});

	it("should handle CDATA sections in foreign content", () => {
		/** @type {unknown[]} */
		const results = [];
		tokenize("<div><![CDATA[<img src='x'>]]></div>", 0, {
			isForeign: () => true,
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
		// In foreign content the section runs to `]]>` and its content is not tags.
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
		it("eND_TAG_OPEN: `</>` is missing-end-tag-name and emits nothing", () => {
			// Per spec this is a parse error and no token is emitted, so it is
			// dropped rather than left in the text span: a browser renders nothing
			// for it, and keeping it turns into visible text once re-escaped.
			expect(walk("a</>b")).toEqual([
				["text", "a"],
				["text", "b"]
			]);
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

		it("reports an unclosed CDATA outside foreign content as a bogus comment", () => {
			// No adjusted current node, so `<![CDATA[` is not a CDATA section but an
			// incorrectly-opened comment (§13.2.5.42); `eof-in-cdata` is unreachable
			// from here and is covered by the foreign-content path.
			const errors = collectErrors("<![CDATA[unclosed");
			// The bogus comment state emits its token at EOF without a further
			// parse error, so this is the only one.
			expect(errors).toEqual([
				{ code: "incorrectly-opened-comment", slice: "<!", severity: "warning" }
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
/** @typedef {{ type: typeof NodeType.ProcessingInstruction, target: string, data: string, start: number, end: number }} MatProcessingInstruction */
/** @typedef {{ type: typeof NodeType.Doctype, name: string, publicId: string | null, systemId: string | null, start: number, end: number }} MatDoctype */
/** @typedef {{ type: typeof NodeType.Document, children: MatNode[] }} MatDocument */
/** @typedef {{ type: typeof NodeType.DocumentFragment, children: MatNode[] }} MatFragment */
/** @typedef {MatElement | MatText | MatComment | MatDoctype | MatProcessingInstruction} MatNode */

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
		case NodeType.ProcessingInstruction:
			return {
				type,
				target: A.piTarget(ref),
				data: A.data(ref),
				start: A.start(ref),
				end: A.end(ref)
			};
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

	it("should replace NULL with U+FFFD in raw text", () => {
		const script = find("<script>a\u0000b</script>", "script");
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (script.children[0])).data
		).toBe("a\uFFFDb");
	});

	it("should drop NULL from ordinary text", () => {
		const nodes = body("a\u0000b");
		expect(
			/** @type {MatText} */ (/** @type {unknown} */ (nodes[0])).data
		).toBe("ab");
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
		// `1bogus` is no processing instruction target, so the `<?` stays bogus.
		const ast = parseHtml("<?1bogus comment>");
		expect(ast.children[0].type).toBe(NodeType.Comment);
		expect(/** @type {MatComment} */ (ast.children[0]).data).toBe(
			"?1bogus comment"
		);
	});

	// WPT owns the tree-construction corpus for these
	// (`html/syntax/parsing/resources/processing-instructions.dat`), and it is
	// not carried here, so its cases are mirrored below.
	it("should parse a bogus comment with a valid target as a processing instruction", () => {
		/**
		 * @param {string} source HTML
		 * @returns {MatProcessingInstruction} the leading processing instruction
		 */
		const pi = (source) => {
			const node = parseHtml(source).children[0];
			expect(node.type).toBe(NodeType.ProcessingInstruction);
			return /** @type {MatProcessingInstruction} */ (node);
		};
		expect(pi("<?target data?>")).toMatchObject({
			target: "target",
			data: "data"
		});
		// `>` closes one as well, and `_`, digits and `-` are target characters.
		expect(pi("<?_t-1 data>")).toMatchObject({ target: "_t-1", data: "data" });
		// A `?` is data unless the `>` follows it, and the target may end on one.
		expect(pi("<?t a?b?>")).toMatchObject({ target: "t", data: "a?b" });
		expect(pi("<?t ? ?>")).toMatchObject({ target: "t", data: "? " });
		expect(pi("<?t?>")).toMatchObject({ target: "t", data: "" });
		expect(pi("<?t \u0000?>")).toMatchObject({ target: "t", data: "\uFFFD" });
	});

	it("should insert a processing instruction where a comment would go", () => {
		const head = /** @type {MatElement} */ (
			/** @type {MatElement} */ (parseHtml("<head><?t 1?>").children[0])
				.children[0]
		);
		expect(head.children[0].type).toBe(NodeType.ProcessingInstruction);
		const body = /** @type {MatElement} */ (
			/** @type {MatElement} */ (parseHtml("<body><?t 1?><span>").children[0])
				.children[1]
		);
		expect(body.children[0].type).toBe(NodeType.ProcessingInstruction);
		expect(body.children[1].type).toBe(NodeType.Element);
	});

	it("should keep a reserved or malformed target a bogus comment", () => {
		for (const source of [
			"<?xml version?>",
			"<?XML-stylesheet href?>",
			"<?1st?>",
			"<?t$x?>",
			"<?>"
		]) {
			expect(parseHtml(source).children[0].type).toBe(NodeType.Comment);
		}
		// Reserved targets are judged before EOF, so this one stays a comment.
		expect(parseHtml("<?xml version").children[0].type).toBe(NodeType.Comment);
	});

	it("should drop a processing instruction cut short by EOF", () => {
		// Every state EOF can land in: open, target, after target, data.
		for (const source of [
			"<body>x<?",
			"<body>x<?t",
			"<body>x<?t ",
			"<body>x<?t data"
		]) {
			const body = /** @type {MatElement} */ (
				/** @type {MatElement} */ (parseHtml(source).children[0]).children[1]
			);
			expect(body.children).toHaveLength(1);
			expect(body.children[0].type).toBe(NodeType.Text);
		}
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

		// Noah's Ark only counts entries whose attributes match, so the depth the
		// second <p> reconstructs to reports whether two <b>s compared equal.
		/**
		 * @param {string} src source
		 * @returns {number} nested `b` depth of the last body child
		 */
		const reconstructedDepth = (src) => {
			const nodes = body(src);
			let node = nodes[nodes.length - 1];
			let depth = 0;
			for (;;) {
				const next = /** @type {MatElement} */ (node.children[0]);
				if (!next || next.type !== NodeType.Element || next.tagName !== "b") {
					break;
				}
				depth++;
				node = next;
			}
			return depth;
		};

		it("should count equal attributes toward Noah's Ark", () => {
			expect(
				reconstructedDepth(
					"<p><b class=x><b class=x><b class=x><b class=x>1</p><p>2"
				)
			).toBe(3);
		});

		it("should not count differing attribute values toward Noah's Ark", () => {
			expect(
				reconstructedDepth(
					"<p><b class=x><b class=y><b class=z><b class=w>1</p><p>2"
				)
			).toBe(4);
		});

		it("should not count attribute values of differing length toward Noah's Ark", () => {
			expect(
				reconstructedDepth(
					"<p><b class=x><b class=xx><b class=x><b class=x>1</p><p>2"
				)
			).toBe(4);
		});

		it("should count equal valueless attributes toward Noah's Ark", () => {
			// A valueless attribute stores its value rather than a source range, so
			// this takes the resolved-value comparison instead of the range one.
			expect(
				reconstructedDepth(
					"<p><b hidden><b hidden><b hidden><b hidden>1</p><p>2"
				)
			).toBe(3);
		});

		it("should close an open <a> when another start tag opens", () => {
			// The "in body" <a> rule runs the algorithm for the open <a> and drops it
			// from both the formatting list and the stack, so the two are siblings.
			const nodes = body("<a href=1>1<a href=2>2");
			expect(nodes.map((n) => n.tagName)).toEqual(["a", "a"]);
			expect(nodes[1].children).toHaveLength(1);
		});

		it("should drop an open <a> the algorithm could not reach", () => {
			// The <table> is a scope boundary, so the algorithm leaves the outer <a>
			// in the formatting list and the <a> rule has to remove it itself.
			const nodes = body("<a href=1><table><a href=2>");
			expect(nodes.map((n) => n.tagName)).toEqual(["a"]);
			expect(
				/** @type {MatElement[]} */ (nodes[0].children).map((n) => n.tagName)
			).toEqual(["a", "table"]);
		});

		it("should drop formatting elements past the inner-loop limit", () => {
			// Five formatting elements between <b> and the furthest block take the
			// algorithm's inner loop past three, which drops the deepest entries
			// from the formatting list rather than reopening them inside <p>.
			const nodes = body("<b><i><u><s><em><p>x</b>y");
			expect(nodes.map((n) => n.tagName)).toEqual(["b", "u"]);
			const p = find("<b><i><u><s><em><p>x</b>y", "p");
			expect(/** @type {MatElement} */ (p.children[0]).tagName).toBe("b");
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
			.process("<p>x");
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
		sp.process("<p>x");
		expect(a).toBe(b);
		expect(a).toBeGreaterThan(0);
	});
});

describe("SourceProcessor — collapseWhitespace", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization with text whitespace collapsed
	 */
	const collapse = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			collapseWhitespace: true
		}).code;

	it("collapses each run of whitespace to one space, never removing it", () => {
		expect(collapse("<p>a   \t\n b</p>")).toBe("<p>a b");
	});

	it("prints a lone tab as the shorter single space", () => {
		expect(collapse("<p>a\tb</p>")).toBe("<p>a b");
	});

	it("collapses a trailing run", () => {
		expect(collapse("<p>a  b  </p>")).toBe("<p>a b ");
	});

	it("keeps already-collapsed text on the source passthrough", () => {
		expect(collapse("<p>a b</p>")).toBe("<p>a b");
	});

	it("keeps whitespace verbatim under `pre`, at any depth", () => {
		expect(collapse("<pre>a   b</pre>")).toBe("<pre>a   b</pre>");
		expect(collapse("<pre><span>a   b</span></pre>")).toBe(
			"<pre><span>a   b</span></pre>"
		);
	});

	it("keeps text carrying a `<` on the passthrough path", () => {
		expect(collapse("<p><%=   x   %></p>")).toBe("<p><%=   x   %>");
	});
});

// The two conditions that decline a fold cannot be reached through a build:
// webpack's CSS pipeline resolves an `@import` away long before the HTML
// minifier sees the sheet, and the minifier only refuses text that overflows
// its own parser. The rest of the transform is covered by the
// `configCases/html/minimize-merge-styles` case.
describe("SourceProcessor — merging adjacent <style>", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify", mergeStyles: true })
			.code;

	it("folds a run into one element", () => {
		expect(
			minify("<style>a{color:red}</style><style>b{color:#00f}</style>")
		).toBe("<style>a{color:red}b{color:#00f}</style>");
	});

	it("keeps every element, minified, unless asked to fold", () => {
		const html =
			"<style>a {color: red}</style><style>b {color: #0000ff}</style>";
		expect(new SourceProcessor().process(html, { mode: "minify" }).code).toBe(
			"<style>a{color:red}</style><style>b{color:#00f}</style>"
		);
	});

	it("declines a sheet whose `@import` would stop applying", () => {
		// `@import` is only honored at the top of a sheet, so appending this one
		// to the sheet before it silently drops the import.
		const html =
			"<style>a{color:red}</style><style>@import url(x.css);b{color:#00f}</style>";
		expect(minify(html)).toBe(html);
	});

	it("still absorbs into a sheet whose own `@import` leads", () => {
		expect(
			minify(
				"<style>@import url(x.css);a{color:red}</style><style>b{color:#00f}</style>"
			)
		).toBe("<style>@import url(x.css);a{color:red}b{color:#00f}</style>");
	});

	it("declines a sheet the CSS minifier could not read", () => {
		// Deep enough to overflow the CSS parser's stack. Text it never parsed may
		// be unterminated, and appending to that makes the next sheet part of it.
		const unreadable = "a{".repeat(20000);
		const head = minify(
			`<style>${unreadable}</style><style>b{color:#00f}</style>`
		);
		expect(head).toContain("</style><style>b{color:#00f}</style>");
		const tail = minify(
			`<style>a{color:red}</style><style>${unreadable}</style>`
		);
		expect(tail).toContain("<style>a{color:red}</style><style>a{a{");
	});
});

describe("SourceProcessor — collapseWhitespace modes", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {boolean | "conservative" | "smart" | "all"} mode the mode
	 * @returns {string} the minified serialization
	 */
	const collapse = (html, mode) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			collapseWhitespace: mode
		}).code;

	const PAGE = "<body><div>  a   b  </div>\n  <div> c </div><span> d </span>";

	it("reads `true` as `conservative`, which never removes whitespace", () => {
		expect(collapse(PAGE, true)).toBe(collapse(PAGE, "conservative"));
		expect(collapse(PAGE, "conservative")).toBe(
			"<body><div> a b </div> <div> c </div><span> d </span></body>"
		);
	});

	it("drops what sits against a block edge in `smart`", () => {
		// Inside and after a `<div>` no line box reaches the whitespace; the
		// `<span>`'s own spaces render, so they stay.
		expect(collapse(PAGE, "smart")).toBe(
			"<body><div>a b</div><div>c</div><span> d </span></body>"
		);
	});

	it("drops every text node's edges in `all`", () => {
		expect(collapse(PAGE, "all")).toBe(
			"<body><div>a b</div><div>c</div><span>d</span></body>"
		);
	});

	it("leaves whitespace verbatim where it renders, in every mode", () => {
		for (const mode of /** @type {(boolean | "conservative" | "smart" | "all")[]} */ ([
			true,
			"conservative",
			"smart",
			"all"
		])) {
			expect(collapse("<pre>  a   b  </pre>", mode)).toBe(
				"<pre>  a   b  </pre>"
			);
		}
	});
});

describe("SourceProcessor — preserveComments", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {(string | RegExp)[]=} preserveComments patterns to keep
	 * @returns {string} the minified serialization
	 */
	const minify = (html, preserveComments) =>
		new SourceProcessor().process(html, { mode: "minify", preserveComments })
			.code;

	it("keeps a comment a pattern names, and drops the rest", () => {
		const html = "<div><!-- @license MIT --><!-- chatter --></div>";
		expect(minify(html)).toBe("<div></div>");
		expect(minify(html, ["@license"])).toBe("<div><!-- @license MIT --></div>");
		expect(minify(html, [/^\s*@license/])).toBe(
			"<div><!-- @license MIT --></div>"
		);
	});

	it("still keeps what minifying always keeps", () => {
		expect(
			minify("<div><!--[if IE]>a<![endif]--></div>", ["nothing"])
		).toContain("[if IE]");
	});
});

describe("SourceProcessor — enumerated attribute values", () => {
	const { SourceProcessor } = require("../lib/html/syntax");
	const { ENUMERATED_KEYWORDS } = require("../lib/html/data");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	// Written out rather than read off the table: generating the expectation from
	// the thing under test would pass just as happily with an entry deleted.
	const EXPECTED = [
		"* autocapitalize",
		"* contenteditable",
		"* dir",
		"* draggable",
		"* enterkeyhint",
		"* hidden",
		"* inputmode",
		"* popover",
		"* referrerpolicy",
		"* spellcheck",
		"* translate",
		"* writingsuggestions",
		"audio crossorigin",
		"audio preload",
		"button formenctype",
		"button formmethod",
		"button type",
		"form autocomplete",
		"form enctype",
		"form method",
		"iframe loading",
		"img crossorigin",
		"img decoding",
		"img fetchpriority",
		"img loading",
		"input formenctype",
		"input formmethod",
		"input type",
		"link crossorigin",
		"link fetchpriority",
		"script crossorigin",
		"script fetchpriority",
		"td scope",
		"th scope",
		"track kind",
		"video crossorigin",
		"video preload"
	];

	it("enumerates exactly the attributes it claims to", () => {
		/** @type {string[]} */
		const actual = [];
		for (const element of Object.keys(ENUMERATED_KEYWORDS)) {
			for (const attribute of Object.keys(ENUMERATED_KEYWORDS[element])) {
				actual.push(`${element} ${attribute}`);
			}
		}
		expect(actual.sort()).toEqual(EXPECTED);
	});

	it("folds every keyword of every entry, and nothing else", () => {
		for (const [element, attributes] of Object.entries(ENUMERATED_KEYWORDS)) {
			// A global entry is exercised on a `<div>`, which owns none of its own.
			const tag = element === "*" ? "div" : element;
			// A cell outside a table is dropped by tree construction, so it needs
			// somewhere to live before its attributes can be read back.
			const open = tag === "td" || tag === "th" ? "<table><tr>" : "";
			for (const [attribute, keywords] of Object.entries(attributes)) {
				for (const keyword of keywords) {
					const shouted = keyword.toUpperCase();
					// Skip a keyword with no letters to shout — folding is a no-op.
					if (shouted === keyword) continue;
					const out = minify(`${open}<${tag} ${attribute}="${shouted}">`);
					expect(`${element} ${attribute}=${shouted} -> ${out}`).toBe(
						`${element} ${attribute}=${shouted} -> ${minify(
							`${open}<${tag} ${attribute}="${keyword}">`
						)}`
					);
				}
				// A value the spec does not enumerate keeps its case exactly.
				expect(minify(`${open}<${tag} ${attribute}="ZzCustomZz">`)).toContain(
					"ZzCustomZz"
				);
			}
		}
	});

	it("leaves a case-sensitive value alone", () => {
		// `<ol type>` is two keywords that differ only in case, so it is not in
		// the table at all; `id` / `class` are not enumerated.
		expect(minify('<ol type="A"><li>x</ol>')).toContain("type=A");
		expect(minify('<div id="MyId" class="MyClass">')).toContain(
			"id=MyId class=MyClass"
		);
	});

	it("leaves a keyword the engine reflects verbatim alone", () => {
		// `target` / `formtarget`, `<area shape>` and `<textarea wrap>` are
		// enumerated, but their IDL members reflect what was written rather than
		// the canonical keyword, so a script reading one back would see the fold.
		expect(minify('<a target="_TOP" href=x>l</a>')).toContain("target=_TOP");
		expect(minify('<form target="_BLANK">')).toContain("target=_BLANK");
		expect(minify('<button formtarget="_SELF">b</button>')).toContain(
			"formtarget=_SELF"
		);
		expect(minify('<map><area shape="RECT"></map>')).toContain("shape=RECT");
		expect(minify('<textarea wrap="SOFT"></textarea>')).toContain("wrap=SOFT");
	});
});

describe("SourceProcessor — optional end tags read the output", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {object=} options extra print options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, { mode: "minify", ...options }).code;

	const LIST = "<ul>\n<li><p>a</p>\n</li>\n<li><p>b</p>\n</li>\n</ul>";

	it("reads past whitespace the collapse tier deletes", () => {
		// The `\n` after each `</p>` is content in the tree and nothing in the
		// output, so the tag it was keeping alive goes with it.
		expect(minify(LIST, { collapseWhitespace: "smart" })).toBe(
			"<ul><li><p>a<li><p>b</ul>"
		);
		expect(minify(LIST, { collapseWhitespace: "all" })).toBe(
			"<ul><li><p>a<li><p>b</ul>"
		);
	});

	it("keeps the tag when that whitespace is printed", () => {
		// `"conservative"` prints one space, and off prints it verbatim; either
		// way something stands between the tag and the parent's end.
		expect(minify(LIST, { collapseWhitespace: "conservative" })).toBe(
			"<ul> <li><p>a</p> </li> <li><p>b</p> </li> </ul>"
		);
		expect(minify(LIST)).toBe(LIST);
	});

	it("keeps the tag when an ancestor renders the whitespace verbatim", () => {
		// The `\n` still prints, so the `</li>` in front of it stays; only the
		// last one goes, on the rule that its parent's end follows it.
		expect(
			minify("<pre><ul><li>a</li>\n<li>b</li></ul></pre>", {
				collapseWhitespace: "all"
			})
		).toBe("<pre><ul><li>a</li>\n<li>b</ul></pre>");
	});

	it("reads past a comment minifying drops", () => {
		expect(minify("<ul><li>a</li><!--c--><li>b</li></ul>")).toBe(
			"<ul><li>a<li>b</ul>"
		);
	});

	it("keeps the tag for a comment minifying keeps", () => {
		expect(
			minify("<ul><li>a</li><!--keep--><li>b</li></ul>", {
				preserveComments: ["keep"]
			})
		).toBe("<ul><li>a</li><!--keep--><li>b</ul>");
	});

	it("still keeps a tag before printed text", () => {
		expect(minify("<ul><li>a</li>tail</ul>")).toBe("<ul><li>a</li>tail</ul>");
	});

	it("scans both ways past whitespace the tier drops", () => {
		// Skipping it forward but not back drops `</thead>` and the implied
		// `<tbody>` together, and the rows re-parse into the head.
		const table = "<table><thead><tr><th>h</thead>\n<tbody><tr><td>d</table>";
		expect(minify(table, { collapseWhitespace: "all" })).toBe(
			"<table><thead><tr><th>h<tbody><tr><td>d</table>"
		);
		expect(minify(table)).toBe(
			"<table><thead><tr><th>h</thead>\n<tr><td>d</table>"
		);
	});
});

describe("SourceProcessor — an empty value is the bare name", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	it("prints any empty value as the name alone", () => {
		expect(minify('<div title="" lang="" data-x=\'\'>x</div>')).toBe(
			"<div title lang data-x>x</div>"
		);
		expect(minify('<iframe sandbox=""></iframe>')).toBe(
			"<iframe sandbox></iframe>"
		);
	});

	it("does it in foreign content too", () => {
		// The tokenizer's after-attribute-name state reads the `/` as the tag's,
		// not as part of the name, so a self-closing tag needs nothing extra.
		expect(minify('<svg><rect x=""/></svg>')).toBe("<svg><rect x/></svg>");
		expect(minify('<math><mi x=""></mi></math>')).toBe(
			"<math><mi x></mi></math>"
		);
	});

	it("leaves a value a reference only decodes to empty", () => {
		// Read raw: what a reference decodes to is not the printer's business.
		expect(minify('<div title="&#x20;">x</div>')).toContain("title=&#x20;");
	});
});

describe("SourceProcessor — removeEmptyElements reads the output", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {object=} options extra print options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			removeEmptyElements: true,
			...options
		}).code;

	it("drops a run of nested empties together", () => {
		expect(minify("<div><div><div></div></div></div>")).toBe("");
		expect(minify("<div><span></span></div><p><em></em></p>")).toBe("");
	});

	it("drops one left empty by a comment going", () => {
		expect(minify("<div><!--c--></div>")).toBe("");
	});

	it("keeps one whose child still prints", () => {
		expect(minify("<div><canvas></canvas></div>")).toBe(
			"<div><canvas></canvas></div>"
		);
		expect(minify("<div><span>x</span></div>")).toBe(
			"<div><span>x</span></div>"
		);
	});

	it("follows the collapse tier for a whitespace child", () => {
		expect(minify("<div> </div>")).toBe("<div> </div>");
		expect(minify("<div> </div>", { collapseWhitespace: "all" })).toBe("");
	});

	it("keeps one whose whitespace is data rather than layout", () => {
		// A literal-text body is written as it is meant to be read, so whitespace
		// there leaves the element non-empty at every tier.
		for (const name of ["style", "script", "iframe", "noframes"]) {
			const html = `<div><${name}> </${name}></div>`;
			expect(minify(html, { collapseWhitespace: "all" })).toBe(html);
		}
		expect(
			minify("<div><pre>  </pre></div>", { collapseWhitespace: "all" })
		).toBe("<div><pre>  </pre></div>");
	});

	it("keeps foreign content, whose whitespace it cannot read", () => {
		expect(minify("<div><svg> </svg></div>")).toBe("<div><svg> </svg></div>");
	});

	it("drops a head holding nothing but whitespace", () => {
		// Nothing renders what sits directly in `<head>`, whatever the tier says.
		expect(minify("<head> </head><body>x")).toBe("<body>x</body>");
	});
});

describe("SourceProcessor — removeImpliedTags", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	const PAGE =
		"<!doctype html><html><head><title>t</title></head><body><ul><li>a</li></ul></body></html>";

	/**
	 * @param {(boolean | "smart" | "all")=} removeImpliedTags the mode
	 * @returns {string} the minified serialization
	 */
	const minify = (removeImpliedTags) =>
		new SourceProcessor().process(PAGE, { mode: "minify", removeImpliedTags })
			.code;

	it("leaves out only the <html> start tag by default", () => {
		// `</html>` stays with it: a reader checking the page downloaded whole
		// looks for one, and only the start tag is what nothing matches on.
		expect(minify()).toBe(
			"<!doctype html><head><title>t</title></head><body><ul><li>a</ul></body></html>"
		);
		expect(minify("smart")).toBe(minify());
	});

	it("leaves out all six when asked", () => {
		expect(minify(true)).toBe("<!doctype html><title>t</title><ul><li>a</ul>");
		expect(minify("all")).toBe(minify(true));
	});

	it("keeps all three when off, and the other optional tags still go", () => {
		// Every optional tag but these three is dropped whatever the option says:
		// nothing can observe that, and only these three are what a consumer
		// reading the page with a regexp looks for.
		expect(minify(false)).toBe(
			"<!doctype html><html><head><title>t</title></head><body><ul><li>a</ul></body></html>"
		);
	});

	it("keeps a <html> that carries an attribute", () => {
		expect(
			new SourceProcessor().process("<html lang=en><body>x", { mode: "minify" })
				.code
		).toBe("<html lang=en><body>x</body></html>");
	});

	it("invents no </html> for a source that spelled no <html>", () => {
		expect(new SourceProcessor().process("<p>a", { mode: "minify" }).code).toBe(
			"<p>a"
		);
	});

	/**
	 * @param {string} html markup
	 * @returns {string} the minified serialization, every optional tag dropped
	 */
	const minifyAll = (html) =>
		new SourceProcessor().process(html, {
			mode: "minify",
			removeImpliedTags: "all"
		}).code;

	it("keeps the tag whitespace behind it would re-parse into", () => {
		// A space opening the body lands in the head without `<body>`, and one
		// behind `</head>` in the body without it.
		expect(
			minifyAll("<html><head><title>t</title></head><body> text</body></html>")
		).toBe("<title>t</title><body> text");
		expect(
			minifyAll("<html><head><title>t</title></head> <body>x</body></html>")
		).toBe("<title>t</title></head>x");
	});

	it("looks past a comment it is about to drop", () => {
		expect(
			minifyAll("<html><head><title>t</title></head><!--c--><body>x</body>")
		).toBe("<title>t</title>x");
		// One it keeps stays behind the tag, so the tag stays too.
		expect(
			minifyAll("<html><head><title>t</title></head><!--[if IE]>i<![endif]-->x")
		).toBe("<title>t</title></head><!--[if IE]>i<![endif]-->x");
	});
});

describe("SourceProcessor — token list values", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @returns {string} the minified serialization
	 */
	const minify = (html) =>
		new SourceProcessor().process(html, { mode: "minify" }).code;

	it("collapses the separators of every list", () => {
		expect(minify('<div class="a \n b">x</div>')).toContain('class="a b"');
		expect(minify('<a href=x ping="/p1 \n /p2">l</a>')).toContain(
			'ping="/p1 /p2"'
		);
	});

	it("drops a repeated token only where the DOM folds it away", () => {
		// `class` / `rel` reflect a `DOMTokenList`, which is an ordered set.
		expect(minify('<div class="a b a">x</div>')).toContain('class="a b"');
		expect(minify('<link rel="preload preload" href=x>')).toContain(
			"rel=preload"
		);
		// `ping` is read back as written and sends one request per token; the
		// other two reflect no token list either.
		expect(minify('<a href=x ping="/p /p">l</a>')).toContain('ping="/p /p"');
		expect(minify('<table><tr><td headers="h h">c</table>')).toContain(
			'headers="h h"'
		);
		expect(minify('<div accesskey="k k">x</div>')).toContain('accesskey="k k"');
	});
});

describe("SourceProcessor — sortAttributes / sortTokenLists", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} html input markup
	 * @param {object=} options extra print options
	 * @returns {string} the minified serialization
	 */
	const minify = (html, options) =>
		new SourceProcessor().process(html, { mode: "minify", ...options }).code;

	// `serializeHtmlTree` sorts attributes, so attribute order cannot hide in it;
	// `class` is a set the option reorders on purpose, so sort it here too.
	/**
	 * @param {string} html markup
	 * @returns {string} its DOM, spelled so neither order can show through
	 */
	const canonical = (html) =>
		serializeHtmlTree(parseHtmlRefs(html)).replace(
			/^(\|\s*class=")([^"]*)(")$/gm,
			(_m, open, value, close) =>
				open + value.split(" ").sort().join(" ") + close
		);

	// Attribute and class order vary per element: that is the repetition the
	// options exist to create.
	const PAGE = `<!doctype html><html lang=en><head><meta charset=utf-8><title>t</title></head><body>${[
		'<div class="c b a" data-z="1" id="n1" hidden>',
		'<div id="n2" hidden class="a c b" data-z="1">',
		'<div data-z="1" class="b c a" hidden id="n3">'
	].join(
		"<span class=x>t</span></div>"
	)}<span class=x>t</span></div><svg viewBox="0 0 1 1"><rect zz="1" aa="2"/></svg><table><tr><td colspan=2>c</table><a href="/x" ping="/p1 /p2">l</a></body></html>`;

	it("sorts an element's attributes by name", () => {
		expect(
			minify('<div zz="1" aa="2" mm="3">x</div>', { sortAttributes: true })
		).toBe("<div aa=2 mm=3 zz=1>x</div>");
	});

	it("sorts a class list, and only `class`", () => {
		expect(
			minify('<div class="zz aa mm">x</div>', { sortTokenLists: true })
		).toBe('<div class="aa mm zz">x</div>');
		// `ping` is the order the requests go out in.
		expect(minify('<a ping="/z /a">l</a>', { sortTokenLists: true })).toBe(
			'<a ping="/z /a">l</a>'
		);
	});

	it("leaves foreign content alone, where a name is not case-folded", () => {
		expect(
			minify('<svg><rect zz="1" aa="2"/></svg>', { sortAttributes: true })
		).toContain("zz=1 aa=2");
	});

	it("keeps the DOM identical, whichever is on", () => {
		const expected = canonical(minify(PAGE));
		// A check against an empty serialization would pass no matter what.
		expect(expected.split("\n").length).toBeGreaterThan(20);
		for (const options of [
			{ sortAttributes: true },
			{ sortTokenLists: true },
			{ sortAttributes: true, sortTokenLists: true }
		]) {
			expect(canonical(minify(PAGE, options))).toBe(expected);
		}
	});

	it("reorders rather than rewrites: the byte count is unchanged", () => {
		const base = minify(PAGE);
		for (const options of [
			{ sortAttributes: true },
			{ sortTokenLists: true },
			{ sortAttributes: true, sortTokenLists: true }
		]) {
			expect(minify(PAGE, options)).toHaveLength(base.length);
		}
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

describe("SourceProcessor — streamed walk recycling", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	// Every case here is sized past the streaming threshold (49152 nodes) so the
	// walk actually enters an open element, flushes under it and recycles node
	// ids — the paths a document walked in one pass at EOF never reaches. The
	// repeat counts are per-shape because the threshold counts nodes, not
	// repetitions: two/three-node shapes need `BIG`, a five-node row needs fewer.
	const BIG = 40000;
	const BIG_ROWS = 15000;

	/**
	 * @param {string} inner repeated markup
	 * @param {number=} times repetitions (default `BIG`)
	 * @returns {string} a document past the streaming threshold
	 */
	const bigBody = (inner, times = BIG) =>
		`<!DOCTYPE html><html><body>${inner.repeat(times)}</body></html>`;

	/**
	 * @param {string} src source
	 * @param {import("../lib/html/syntax").HtmlProcessOptions=} options options
	 * @returns {string[]} `+tag` / `-tag` in visit order
	 */
	const walk = (src, options) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (path) => log.push(`+${path.tagName()}`),
						exit: (path) => log.push(`-${path.tagName()}`)
					}
				})
			)
			.process(src, options);
		return log;
	};

	it("visits every element once across flush batches", () => {
		const log = walk(bigBody("<p><b>x</b></p>"));
		expect(log.filter((l) => l === "+p")).toHaveLength(BIG);
		expect(log.filter((l) => l === "+b")).toHaveLength(BIG);
		// enter/exit stay balanced, so nothing was visited twice or dropped
		expect(log.filter((l) => l.startsWith("+"))).toHaveLength(
			log.filter((l) => l.startsWith("-")).length
		);
	});

	it("keeps parents around their children across a recycle", () => {
		const log = walk(bigBody("<p><b>x</b></p>"));
		const body = log.slice(log.indexOf("+body") + 1, log.lastIndexOf("-body"));
		for (let i = 0; i < body.length; i += 4) {
			expect(body.slice(i, i + 4)).toEqual(["+p", "+b", "-b", "-p"]);
		}
	});

	it("honours skipChildren() on a streamed element", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Element]: {
						enter: (path) => {
							log.push(`+${path.tagName()}`);
							// `div` stays open while its subtree streams, so its skipped
							// descendants are the ones the walk tracks without entering
							if (path.tagName() === "div") path.skipChildren();
						},
						exit: (path) => log.push(`-${path.tagName()}`)
					}
				})
			)
			.process(
				`<!DOCTYPE html><html><body><div>${"<p><b>x</b></p>".repeat(
					BIG
				)}</div></body></html>`
			);
		// the skipped element itself still exits; nothing below it is visited
		expect(log.filter((l) => l === "+div")).toHaveLength(1);
		expect(log.filter((l) => l === "-div")).toHaveLength(1);
		expect(log.filter((l) => l.endsWith("p") || l.endsWith("b"))).toHaveLength(
			0
		);
		// every exit pairs with an enter
		const open = [];
		for (const entry of log) {
			if (entry.startsWith("+")) open.push(entry.slice(1));
			else expect(open.pop()).toBe(entry.slice(1));
		}
		expect(open).toHaveLength(0);
	});

	it("merges adjacent text across a flush boundary", () => {
		/** @type {string[]} */
		const text = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Text]: (path) => text.push(path.data())
				})
			)
			// entity references split the tokenizer's text runs; the walk must not
			// also split the node, so one text child stays one visit. The leading
			// paragraphs are what push the parse past the streaming threshold, so
			// the entity run at the tail is reached with the walk already streaming.
			.process(
				`<!DOCTYPE html><html><body>${"<p>x</p>".repeat(
					BIG
				)}<p id="tail">${"a&amp;b".repeat(2000)}</p></body></html>`
			);
		expect(text).toHaveLength(BIG + 1);
		expect(text[text.length - 1]).toHaveLength(2000 * 3);
	});

	it("streams a document whose form element leaves the open stack", () => {
		const log = walk(bigBody("<form><p>x</p></form>"));
		expect(log.filter((l) => l === "+form")).toHaveLength(BIG);
		expect(log.filter((l) => l === "-form")).toHaveLength(BIG);
	});

	it("does not re-visit an element the form end tag left open", () => {
		// `</form>` removes the form from the *middle* of the open stack while the
		// `div` inside it stays open, so nothing has finished. Reconciling against
		// the open stack there closes and re-enters the live `div` — visits stay
		// balanced, so only the visit count catches it.
		const log = walk(
			`<!DOCTYPE html><html><body><form>${"<p>x</p>".repeat(
				BIG
			)}<div></form><p>y</p></div></body></html>`
		);
		expect(log.filter((l) => l === "+div")).toHaveLength(1);
		expect(log.filter((l) => l === "-div")).toHaveLength(1);
		// the div nests inside the form in the tree, so it closes first
		const divExit = log.lastIndexOf("-div");
		expect(log.indexOf("-form")).toBeGreaterThan(divExit);
	});

	it("visits a form subtree the walk never entered before `</form>`", () => {
		// Same mid-stack removal, but the bulk sits *before* the form, so the walk
		// is streaming yet has never entered the form when `</form>` takes it off
		// the stack. Keying the halt on "was it entered" loses the whole subtree.
		const log = walk(
			`<!DOCTYPE html><html><body>${"<p>x</p>".repeat(
				BIG
			)}<form><div></form><p>y</p></div></body></html>`
		);
		expect(log.slice(log.indexOf("+form"))).toEqual([
			"+form",
			"+div",
			"+p",
			"-p",
			"-div",
			"-form",
			"-body",
			"-html"
		]);
	});

	it("streams tables, where flushing is held back", () => {
		const log = walk(bigBody("<table><tr><td>a</td></tr></table>", BIG_ROWS));
		expect(log.filter((l) => l === "+table")).toHaveLength(BIG_ROWS);
		expect(log.filter((l) => l === "+td")).toHaveLength(BIG_ROWS);
	});

	it.each([
		[
			"below the threshold",
			"<!DOCTYPE html><html><body><p>a</p></body></html>"
		],
		["past the threshold", bigBody("<p><b>x</b></p>")]
	])("honours skipChildren() on the root, %s", (_label, src) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Document]: {
						enter: (path) => {
							log.push("+doc");
							path.skipChildren();
						},
						exit: () => log.push("-doc")
					},
					[NodeType.Element]: {
						enter: (path) => log.push(`+${path.tagName()}`),
						exit: (path) => log.push(`-${path.tagName()}`)
					}
				})
			)
			.process(src);
		// the root still closes; nothing beneath it is visited at all
		expect(log).toEqual(["+doc", "-doc"]);
	});
});

describe("SourceProcessor — streamed walk offsets", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	// `HtmlParser` builds its head-injection anchors during the walk, and what it
	// reads decides what has to be final: `tagEnd()` for the still-open `<html>`
	// / `<head>` (assigned when the element is inserted) and `end()` only for the
	// head's completed children. The streamed walk reports a provisional `end` on
	// an element it has entered but not closed, so those two reads are the
	// contract — assert them directly, at both walk sizes.
	it("reports final end offsets for head elements", () => {
		const SRC = [
			"<!DOCTYPE html><html><head><title>t</title>",
			'<script src="a.js"></script>',
			"<style>.a{color:red}</style>",
			'<link rel="stylesheet" href="a.css">',
			"</head><body><p>x</p></body></html>"
		].join("");
		/** @type {[string, number, number][]} */
		const seen = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/html/syntax").VisitorMap} */ ({
					[NodeType.Element]: (path) => {
						seen.push([path.tagName(), path.start(), path.end()]);
					}
				})
			)
			.process(SRC);
		// A final `end` spans the element's own end tag; a provisional one would
		// stop at the start tag's `>`.
		const spans = new Map(
			seen.map(([name, start, end]) => [name, SRC.slice(start, end)])
		);
		expect(spans.get("title")).toBe("<title>t</title>");
		expect(spans.get("script")).toBe('<script src="a.js"></script>');
		expect(spans.get("style")).toBe("<style>.a{color:red}</style>");
		expect(spans.get("link")).toBe('<link rel="stylesheet" href="a.css">');
		expect(seen.map((s) => s[0])).toEqual([
			"html",
			"head",
			"title",
			"script",
			"style",
			"link",
			"body",
			"p"
		]);
	});

	it("reports a provisional end at enter and a final one at exit", () => {
		// What the streamed walk does that the single pass at EOF cannot: enter an
		// element before it closes. Its `end` is then provisional until `exit`.
		// Below `_STREAM_MIN_NODES` the same markup is walked once at EOF, so the
		// two reads agree — the contrast is what pins the streamed path.
		/**
		 * @param {number} rows how many children to wrap
		 * @returns {[number, number]} the outer element's `end` at enter and at exit
		 */
		const ends = (rows) => {
			const source = `<div id=outer>${"<p><b>x</b></p>".repeat(rows)}</div>`;
			let atEnter = -1;
			let atExit = -1;
			new SourceProcessor()
				.use(
					/** @type {import("../lib/html/syntax").VisitorMap} */ ({
						[NodeType.Element]: {
							enter: (path) => {
								if (path.tagName() === "div" && atEnter === -1) {
									atEnter = path.end();
								}
							},
							exit: (path) => {
								if (path.tagName() === "div" && atExit === -1) {
									atExit = path.end();
								}
							}
						}
					})
				)
				.process(source);
			return [atEnter, atExit];
		};

		const [smallEnter, smallExit] = ends(10);
		expect(smallEnter).toBe(smallExit);

		const [bigEnter, bigExit] = ends(40000);
		// Provisional: the start tag only, because `</div>` has not been seen yet.
		expect(bigEnter).toBe("<div id=outer>".length);
		// Final: the whole element, once the walk leaves it.
		expect(bigExit).toBe(
			`<div id=outer>${"<p><b>x</b></p>".repeat(40000)}</div>`.length
		);
	});

	it("refuses a nested parse rather than taking the walk's state over", () => {
		// One parse at a time: the walk's state is module-scoped, so a visitor that
		// started another would take this one's over and release its columns.
		expect(() =>
			new SourceProcessor()
				.use(
					/** @type {import("../lib/html/syntax").VisitorMap} */ ({
						[NodeType.Element]: () => {
							new SourceProcessor().process("<b>nested</b>");
						}
					})
				)
				.process("<p>x</p>")
		).toThrow(/already running/);
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

describe("parseSrcset", () => {
	it("should return a single candidate with byte offsets", () => {
		expect(parseSrcset("a.png")).toEqual([["a.png", 0, 5]]);
	});

	it("should accept width, density and height descriptors", () => {
		expect(parseSrcset("a.png 480w")).toEqual([["a.png", 0, 5]]);
		expect(parseSrcset("a.png 2x")).toEqual([["a.png", 0, 5]]);
		expect(parseSrcset("a.png 480w 2h")).toEqual([["a.png", 0, 5]]);
	});

	it("should parse several comma-separated candidates", () => {
		expect(parseSrcset("a.png 480w, b.png 800w")).toEqual([
			["a.png", 0, 5],
			["b.png", 12, 17]
		]);
	});

	it("should accept a url that ends in a trailing comma", () => {
		expect(parseSrcset("a.png,")).toEqual([["a.png", 0, 5]]);
	});

	it("should throw on a zero width descriptor", () => {
		expect(() => parseSrcset("a.png 0w")).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on a negative density descriptor", () => {
		expect(() => parseSrcset("a.png -1x")).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on conflicting descriptors", () => {
		expect(() => parseSrcset("a.png 480w 2x")).toThrow(
			/Invalid srcset descriptor/
		);
	});

	it("should throw on an unrecognized descriptor", () => {
		expect(() => parseSrcset("a.png foo")).toThrow(/Invalid srcset descriptor/);
	});

	it("should throw on duplicate or conflicting typed descriptors", () => {
		expect(() => parseSrcset("a.png 1w 2w")).toThrow(/Invalid srcset/);
		expect(() => parseSrcset("a.png 0h")).toThrow(/Invalid srcset/);
		expect(() => parseSrcset("a.png 2x 1h")).toThrow(/Invalid srcset/);
	});

	it("should traverse the in-parens descriptor state", () => {
		expect(() => parseSrcset("a.png (min-width:1px)x")).toThrow(
			/Invalid srcset descriptor/
		);
		// a parenthesized descriptor that runs to EOF
		expect(() => parseSrcset("a.png (foo")).toThrow(/Invalid srcset/);
	});

	it("should handle whitespace between a descriptor and EOF", () => {
		expect(parseSrcset("a.png 1w ")).toEqual([["a.png", 0, 5]]);
		// a second descriptor after the inter-descriptor whitespace
		expect(() => parseSrcset("a.png 1w x2")).toThrow(/Invalid srcset/);
	});

	it("should throw when there are no image candidate strings", () => {
		expect(() => parseSrcset("   ")).toThrow(
			/Must contain one or more image candidate strings/
		);
	});
});

describe("parseSrc", () => {
	const NBSP = String.fromCharCode(0xa0);
	const DEL = String.fromCharCode(0x7f);

	it("should trim ASCII whitespace and keep offsets", () => {
		expect(parseSrc("  a.png  ")).toEqual([["a.png", 2, 7]]);
	});

	it("should trim a surrounding U+00A0 no-break space", () => {
		expect(parseSrc(`${NBSP}a.png${NBSP}`)).toEqual([["a.png", 1, 6]]);
	});

	it("should strip ignorable control characters from the value", () => {
		expect(parseSrc(`a${DEL}.png`)).toEqual([["a.png", 0, 6]]);
	});

	it("should throw on empty and whitespace-only input", () => {
		expect(() => parseSrc("")).toThrow(/Must be non-empty/);
		expect(() => parseSrc("   ")).toThrow(/Must be non-empty/);
	});

	it("should throw when only ignorable characters remain", () => {
		expect(() => parseSrc(DEL)).toThrow(/Must be non-empty/);
	});
});

describe("parseMsapplicationTask", () => {
	it("should extract the icon-uri value with offsets", () => {
		expect(
			parseMsapplicationTask("name=n;action-uri=http://x;icon-uri=icon.png")
		).toEqual([["icon.png", 36, 44]]);
	});

	it("should return nothing when there is no icon-uri", () => {
		expect(parseMsapplicationTask("name=n;action-uri=http://x")).toEqual([]);
	});

	it("should return nothing for an empty icon-uri value", () => {
		expect(parseMsapplicationTask("icon-uri=   ")).toEqual([]);
	});

	it("should trim whitespace around the icon-uri value", () => {
		expect(parseMsapplicationTask("name=n;icon-uri= icon.png ;x=y")).toEqual([
			["icon.png", 17, 25]
		]);
	});
});

describe("parseCssUrls", () => {
	it("should extract an unquoted url() reference from a presentation attribute", () => {
		expect(parseCssUrls("fill:url(a.png)")).toEqual([["a.png", 9, 14]]);
	});

	it("should extract a quoted url() reference", () => {
		expect(parseCssUrls('fill:url("a.png")')).toEqual([["a.png", 10, 15]]);
		expect(parseCssUrls("fill:url('a.png')")).toEqual([["a.png", 10, 15]]);
	});

	it("should return nothing when the value carries no url()", () => {
		expect(parseCssUrls("fill:red")).toEqual([]);
	});
});

// Fused state transitions: the tokenizer executes 100%-predictable follow-up
// arcs inline (tag-open alpha scan, end-tag peek, fused `<` after text runs,
// quoted-value scan after the opening quote, end-tag-name alpha runs,
// attribute-name scan from before-attribute-name) — each case drives one fused
// branch and its EOF edge, expecting the exact spec token/error stream.
describe("tokenize — fused state transitions", () => {
	/**
	 * @param {string} html input
	 * @returns {[string, ...EXPECTED_ANY[]][]} token + parse-error stream
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
			},
			parseError: (input, code, start, end, severity) => {
				out.push(["error", code, start, end, severity]);
			}
		});
		return out;
	};

	it("open-tag alpha scan to EOF", () => {
		expect(walk("<a")).toEqual([
			["error", "eof-in-tag", 2, 2, "error"],
			["open", "a", false]
		]);
	});

	it("open-tag multi-char name to EOF", () => {
		expect(walk("<abc")).toEqual([
			["error", "eof-in-tag", 4, 4, "error"],
			["open", "abc", false]
		]);
	});

	it("open-tag closed", () => {
		expect(walk("<a>")).toEqual([["open", "a", false]]);
	});

	it("end-tag alpha scan to EOF", () => {
		expect(walk("</x")).toEqual([
			["error", "eof-in-tag", 3, 3, "error"],
			["close", "x"]
		]);
	});

	it("bare end-tag open at EOF", () => {
		expect(walk("</")).toEqual([
			["error", "eof-before-tag-name", 2, 2, "warning"],
			["text", "</"]
		]);
	});

	it("text then bare end-tag open at EOF", () => {
		expect(walk("a</")).toEqual([
			["error", "eof-before-tag-name", 3, 3, "warning"],
			["text", "a</"]
		]);
	});

	it("missing end tag name", () => {
		expect(walk("</>")).toEqual([
			["error", "missing-end-tag-name", 2, 3, "warning"]
		]);
	});

	it("end-tag open non-alpha -> bogus comment", () => {
		expect(walk("</ x>")).toEqual([
			["error", "invalid-first-character-of-tag-name", 2, 3, "warning"],
			["comment", "</ x>"]
		]);
	});

	it("text ends exactly at tag", () => {
		expect(walk("ab<i>c")).toEqual([
			["text", "ab"],
			["open", "i", false],
			["text", "c"]
		]);
	});

	it("text with no further `<`", () => {
		expect(walk("ab")).toEqual([["text", "ab"]]);
	});

	it("entity then fused tag", () => {
		expect(walk("a&amp;b<i>")).toEqual([
			["text", "a&amp;b"],
			["open", "i", false]
		]);
	});

	it("empty double-quoted value", () => {
		expect(walk('<a b="">')).toEqual([
			["attr", "b", "", 1],
			["open", "a", false]
		]);
	});

	it("unterminated double-quoted value", () => {
		expect(walk('<a b="')).toEqual([
			["error", "eof-in-tag", 6, 6, "error"],
			["attr", "b", "", 1],
			["open", "a", false]
		]);
	});

	it("empty single-quoted value", () => {
		expect(walk("<a b=''>")).toEqual([
			["attr", "b", "", 2],
			["open", "a", false]
		]);
	});

	it("unterminated single-quoted value", () => {
		expect(walk("<a b='")).toEqual([
			["error", "eof-in-tag", 6, 6, "error"],
			["attr", "b", "", 2],
			["open", "a", false]
		]);
	});

	it("plain double-quoted value", () => {
		expect(walk('<a b="v">')).toEqual([
			["attr", "b", "v", 1],
			["open", "a", false]
		]);
	});

	it("plain single-quoted value", () => {
		expect(walk("<a b='v'>")).toEqual([
			["attr", "b", "v", 2],
			["open", "a", false]
		]);
	});

	it("entity in double-quoted value", () => {
		expect(walk('<a b="&amp;">')).toEqual([
			["attr", "b", "&amp;", 1],
			["open", "a", false]
		]);
	});

	it("entity in single-quoted value", () => {
		expect(walk("<a b='&amp;'>")).toEqual([
			["attr", "b", "&amp;", 2],
			["open", "a", false]
		]);
	});

	it("script end-tag name truncated", () => {
		expect(walk("<script>x</scr")).toEqual([
			["open", "script", false],
			["error", "eof-in-tag", 14, 14, "error"],
			["text", "x"],
			["close", "scr"]
		]);
	});

	it("rcdata end-tag name truncated", () => {
		expect(walk("<title>x</tit")).toEqual([
			["open", "title", false],
			["error", "eof-in-tag", 13, 13, "error"],
			["text", "x"],
			["close", "tit"]
		]);
	});

	it("rawtext end-tag name truncated", () => {
		expect(walk("<style>x</sty")).toEqual([
			["open", "style", false],
			["error", "eof-in-tag", 13, 13, "error"],
			["text", "x"],
			["close", "sty"]
		]);
	});

	it("script-escaped end-tag name truncated", () => {
		expect(walk("<script><!--x</scr")).toEqual([
			["open", "script", false],
			["error", "eof-in-tag", 18, 18, "error"],
			["text", "<!--x"],
			["close", "scr"]
		]);
	});

	it("script end-tag name overlong", () => {
		expect(walk("<script>x</scripty>y</script>")).toEqual([
			["open", "script", false],
			["text", "x</scripty>y"],
			["close", "script"]
		]);
	});

	it("rcdata fused `<`", () => {
		expect(walk("<title>a<b</title>")).toEqual([
			["open", "title", false],
			["text", "a<b"],
			["close", "title"]
		]);
	});

	it("rawtext fused `<`", () => {
		expect(walk("<style>a<b</style>")).toEqual([
			["open", "style", false],
			["text", "a<b"],
			["close", "style"]
		]);
	});

	it("script fused `<`", () => {
		expect(walk("<script>a<b</script>")).toEqual([
			["open", "script", false],
			["text", "a<b"],
			["close", "script"]
		]);
	});

	it("nUL as attribute-name first char", () => {
		expect(walk("<a \u0000x>")).toEqual([
			["error", "unexpected-null-character", 3, 4, "warning"],
			["attr", "\u0000x", null, 0],
			["open", "a", false]
		]);
	});

	it("quote as attribute-name first char", () => {
		expect(walk('<a "x>')).toEqual([
			["error", "unexpected-character-in-attribute-name", 3, 4, "warning"],
			["attr", '"x', null, 0],
			["open", "a", false]
		]);
	});

	it("apostrophe as attribute-name first char", () => {
		expect(walk("<a 'x>")).toEqual([
			["error", "unexpected-character-in-attribute-name", 3, 4, "warning"],
			["attr", "'x", null, 0],
			["open", "a", false]
		]);
	});

	it("less-than as attribute-name first char", () => {
		expect(walk("<a <b>")).toEqual([
			["error", "unexpected-character-in-attribute-name", 3, 4, "warning"],
			["attr", "<b", null, 0],
			["open", "a", false]
		]);
	});

	it("plain attribute-name runs", () => {
		expect(walk("<a bc de>")).toEqual([
			["attr", "bc", null, 0],
			["attr", "de", null, 0],
			["open", "a", false]
		]);
	});
});

describe("htmlMinify — assets webpack only passes through", () => {
	const htmlMinify = require("../lib/html/htmlMinify");

	/**
	 * @param {string} src html source
	 * @returns {string} the minified serialization
	 */
	const min = (src) => htmlMinify({ "page.html": src }).code;

	it("keeps server-side template tags", () => {
		// `<?php … ?>` is a bogus comment per §13.2.5.42, so the inert-comment rule
		// would delete the whole directive from a copied template.
		expect(min("<?php echo $t; ?>\n<html><body><p>a</p></body></html>")).toBe(
			"<?php echo $t; ?><body><p>a</body></html>"
		);
		expect(min("<html><body><!-- inert --><p>a</p></body></html>")).toBe(
			"<body><p>a</body></html>"
		);
	});

	it("keeps text-level template placeholders unescaped", () => {
		// Escaping these to `&lt;%= t %&gt;` breaks the server-side render.
		expect(min("<div>   <%= t %>   </div>")).toBe("<div>   <%= t %>   </div>");
		expect(min("<div>{{ t }}</div>")).toBe("<div>{{ t }}</div>");
	});

	it("still escapes text that would re-parse as markup", () => {
		// `a &lt;b&gt;c` decodes to `a <b>c`; emitting the `<` raw would build a
		// real `<b>` element, so that one stays escaped. A bare `>` is only ever a
		// character in text.
		expect(min("<p>a &lt;b&gt;c")).toBe("<p>a &lt;b>c");
		expect(min("<p>a&amp;b")).toBe("<p>a&amp;b");
		// Foster-parented text merges into one node whose range no longer covers
		// its data — the source slice would drop the `c`.
		expect(min("<table>a<tr><td>b</td></tr>c</table>")).toBe(
			"ac<table><tr><td>b</table>"
		);
		// A trailing `<` has to stay escaped: dropping a comment after it would
		// let it fuse with the next sibling into a tag.
		expect(min("<p>a<</p>")).toBe("<p>a&lt;");
		expect(min("<p>a<<!--c--></p>")).toBe("<p>a&lt;");
	});

	it("keeps template expressions containing ampersands", () => {
		// `&&` is everywhere in EJS/PHP conditionals; escaping it to `&amp;&amp;`
		// breaks the server-side render just as escaping `<` does.
		expect(min("<div><%= a && b %></div>")).toBe("<div><%= a && b %></div>");
		expect(min("<div><% if (a && b) { %>x<% } %></div>")).toBe(
			"<div><% if (a && b) { %>x<% } %></div>"
		);
		expect(min("<p>a & b")).toBe("<p>a & b");
		expect(min("<p>a &foo; b")).toBe("<p>a &foo; b");
	});

	it("escapes a character reference left open at the end", () => {
		// The next sibling could complete it (`a &am` + `p;`) once a comment
		// between them is dropped, so only a closed tail passes through.
		expect(min("<p>a &</p>")).toBe("<p>a &amp;");
		expect(min("<p>a &am</p>")).toBe("<p>a &amp;am");
		expect(min("<p>a &am<!--c-->p;</p>")).toBe("<p>a &amp;amp;");
	});

	it("keeps the body of literal-text elements raw", () => {
		// `script` / `style` bodies are not markup, so `<` must not be escaped —
		// `a &lt; b` would change what the script does. A `<style>` body is still
		// run through the CSS minifier, which is not an escaping pass.
		expect(min("<script>if (a < b) { x(); }</script>")).toBe(
			"<script>if (a < b) { x(); }</script>"
		);
		expect(min("<style>.a[x='<'] { color: red }</style>")).toBe(
			'<style>.a[x="<"]{color:red}</style>'
		);
	});
});

describe("SourceProcessor — minify serialization edge cases", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @returns {string} minified serialization
	 */
	const minify = (source) =>
		new SourceProcessor().process(source, { mode: "minify" }).code;

	describe("cloned / reconstructed formatting elements", () => {
		it("keeps the reconstructed <b> around text after an implied </p>", () => {
			expect(minify("<p><b>a<p>b")).toBe("<p><b>a</b><p><b>b</b>");
		});

		it("keeps the adoption-agency clone of <b> inside <p>", () => {
			expect(minify("<b><p>x</b>y</p>")).toBe("<b></b><p><b>x</b>y");
		});

		it("keeps cloned attributes on the reconstructed element", () => {
			// The reconstructed clone is synthesized, not sliced from source, and
			// synthesized values always keep their quotes.
			expect(minify('<b x="1"><p>x</b>y</p>')).toBe(
				'<b x=1></b><p><b x="1">x</b>y'
			);
		});

		it("keeps the reconstructed <b> in a full document round-trip", () => {
			expect(
				minify(
					"<!DOCTYPE html><html><head></head><body><p><b>a<p>b</body></html>"
				)
			).toBe(
				"<!doctype html><head></head><body><p><b>a</b><p><b>b</b></body></html>"
			);
		});

		it("escapes a quote-holding cloned attribute value safely", () => {
			expect(minify("<b a='x\"y'><p>t</b>")).toBe(
				'<b a=\'x"y\'></b><p><b a="x&quot;y">t</b>'
			);
		});

		it("rebuilds renamed void tokens instead of dropping them", () => {
			expect(minify('<image src="a&amp;b">')).toBe('<img src="a&amp;b">');
			expect(minify("a</br>b")).toBe("a<br>b");
		});

		it("materializes an implied <body> once attributes merge onto it", () => {
			expect(minify('<div>a</div><body class="x">')).toBe(
				'<body class="x"><div>a</div></body>'
			);
		});

		it("still omits parser-inserted html/head/body and table sections", () => {
			expect(minify("<p>x")).toBe("<p>x");
			expect(minify("<table><tr><td>x</table>")).toBe(
				"<table><tr><td>x</table>"
			);
			expect(minify("<table><td>x")).toBe("<table><td>x</table>");
		});
	});

	describe("<noscript> content", () => {
		it("re-escapes decoded text inside <noscript>", () => {
			expect(minify("<body><noscript>a &lt;b&gt; c</noscript>")).toBe(
				"<body><noscript>a &lt;b> c</noscript></body>"
			);
		});

		it("round-trips elements nested inside <noscript>", () => {
			expect(minify('<noscript><link href="x"></noscript>')).toBe(
				"<noscript><link href=x></noscript>"
			);
		});
	});

	describe("comments", () => {
		it("keeps both halves of a downlevel-revealed conditional block", () => {
			expect(minify('<!--[if !IE]><!--><link href="x"><!--<![endif]-->')).toBe(
				"<!--[if !IE]><!--><link href=x><!--<![endif]-->"
			);
			expect(minify("<!--[if IE]><p>ie only</p><![endif]-->")).toBe(
				"<!--[if IE]><p>ie only</p><![endif]-->"
			);
		});

		it("keeps server-side include directives", () => {
			expect(minify('<!--#include virtual="a.html" -->')).toBe(
				'<!--#include virtual="a.html" -->'
			);
		});
	});

	describe("<plaintext>", () => {
		it("never emits a </plaintext> end tag", () => {
			expect(minify("<plaintext>foo")).toBe("<plaintext>foo");
		});
	});

	describe("opening-tag whitespace", () => {
		it("collapses the run before a valueless attribute", () => {
			expect(minify("<p   hidden   class='x'>t</p>")).toBe(
				"<p hidden class=x>t"
			);
			expect(minify("<input    disabled>")).toBe("<input disabled>");
			expect(minify("<p   a   b   c>t</p>")).toBe("<p a b c>t");
		});

		it("keeps a foreign element's self-closing slash", () => {
			expect(minify("<svg><circle   r='1'   /></svg>")).toBe(
				"<svg><circle r=1 /></svg>"
			);
			// After an unquoted value the `/` needs its space, or it would fuse
			// into the value.
			expect(minify("<svg><circle   r=1   /></svg>")).toBe(
				"<svg><circle r=1 /></svg>"
			);
			expect(minify("<svg><circle/></svg>")).toBe("<svg><circle/></svg>");
		});

		it("leaves a `/` that is the last character of an unquoted value", () => {
			expect(minify("<a href=x/>t</a>")).toBe("<a href=x/>t</a>");
		});

		it("folds the name of a tag that carries nothing else", () => {
			expect(minify("<DIV>t</DIV>")).toBe("<div>t</div>");
			// Foreign content keeps its source bytes, name included.
			expect(minify("<svg><TITLE>t</TITLE></svg>")).toBe(
				"<svg><TITLE>t</TITLE></svg>"
			);
		});
	});

	// Every other minify transform is covered end to end by
	// `configCases/html/minimize-transforms`, whose snapshot is the corpus. CR
	// cases cannot live there: `.gitattributes` checks every `test/` file out
	// with LF, so a CR only reaches the parser from a string built here.
	describe("implied <body> with leading whitespace", () => {
		it("materializes the tag so the text node survives", () => {
			// Found by running the html5lib serializer corpus through minify. A
			// transparent implied `<body>` puts the run where re-parsing drops it:
			// before `<body>` starts, the insertion modes ignore whitespace.
			expect(minify("</html> foo")).toBe("<body> foo");
			expect(minify("</body> foo")).toBe("<body> foo");
			expect(minify("<colgroup> foo")).toBe("<body> foo");
			// Nothing to keep when the run is not in the body to begin with.
			expect(minify(" foo")).toBe("foo");
			expect(minify("<p>x</p>")).toBe("<p>x");
		});
	});

	describe("carriage returns in text", () => {
		it("normalizes a CRLF to one newline", () => {
			expect(minify("<p>a\r\nb</p>")).toBe("<p>a\nb");
		});

		it("normalizes a lone CR to a newline", () => {
			// Preprocessing maps CR to LF without changing length, so the raw
			// source is not the text's serialization even at equal lengths.
			expect(minify("<p>a\rb</p>")).toBe("<p>a\nb");
			expect(minify("<p>a\r\rb</p>")).toBe("<p>a\n\nb");
		});

		it("keeps a CRLF text run whole when it leads an insertion mode", () => {
			// `leadingWs` splits this run, and its source span has to survive the
			// CRLF collapsing or the tail is dropped. `<colgroup>` is the insertion
			// mode that both splits the run and keeps it — `<head>`/`<html>` drop
			// their whitespace as inert.
			expect(minify("<table><colgroup>\r\n\t<col></colgroup></table>")).toBe(
				"<table><colgroup>\n\t<col></table>"
			);
			expect(minify("<table>\r\n\t<tr><td>x</table>")).toBe(
				minify("<table>\n\t<tr><td>x</table>")
			);
		});

		it("keeps whitespace that decoded from character references", () => {
			// Decoding shortens the run, so the split cannot count its offsets in
			// the source either.
			expect(minify("<table><colgroup>&#10;&#9;<col></colgroup></table>")).toBe(
				"<table><colgroup>\n\t<col></table>"
			);
		});

		it("leaves a CR inside a literal-text element alone", () => {
			expect(minify("<script>a\r\nb</script>")).toBe("<script>a\nb</script>");
		});
	});
});

describe("SourceProcessor — print modes", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @param {import("../lib/util/SourceProcessor").PrintOptions["mode"]} mode print mode
	 * @returns {string} its serialization
	 */
	const print = (source, mode) =>
		new SourceProcessor().process(source, { mode }).code;

	it("prints nothing unless output is asked for", () => {
		expect(new SourceProcessor().process("<p>x</p>")).toBeUndefined();
	});

	it("beautifies by re-serializing rather than rewriting", () => {
		// Ugly is allowed — nothing is re-indented — but the source's own attribute
		// quoting, comments and end tags all have to come back.
		const source =
			'<!DOCTYPE html><div id=a class="x"><!-- c --><p>hi <b>there</b></p><ul><li>one<li>two</ul></div>';
		expect(print(source, "beautify")).toBe(
			'<!DOCTYPE html><div id=a class="x"><!-- c --><p>hi <b>there</b></p><ul><li>one</li><li>two</li></ul></div>'
		);
		expect(print(source, "minify")).toBe(
			"<!doctype html><div id=a class=x><p>hi <b>there</b><ul><li>one<li>two</ul></div>"
		);
	});

	it("beautifies to something that minifies back the same", () => {
		for (const source of [
			'<!DOCTYPE html><div id=a class="x"><!-- c --><p>hi</p></div>',
			"<table><tr><td>x</table>",
			"<div><pre>\n\nkeep</pre><template><p>t</p></template></div>",
			"<svg><path/></svg><math><mi>x</mi></math>",
			"<p><b>a<p>b"
		]) {
			expect(print(print(source, "beautify"), "minify")).toBe(
				print(source, "minify")
			);
		}
	});
});

describe("SourceProcessor — printing in pieces", () => {
	const { SourceProcessor } = require("../lib/html/syntax");

	/**
	 * @param {string} source html source
	 * @returns {string} minified serialization
	 */
	const minify = (source) =>
		new SourceProcessor().process(source, { mode: "minify" }).code;

	// Most of a document prints as `open tag + children + end tag`, so each piece
	// goes out as the walk reaches it rather than being held for the parent to
	// read back. These are the elements whose text is not that — printed whole, so
	// the piecemeal path has to leave them alone — and the pieces that are only
	// decidable once something inside has printed.

	it("prints a long sibling chain a piece at a time", () => {
		// The store is what this avoids: nothing but the node being printed is in
		// it, so a wide document costs its output rather than a multiple of it.
		const source = `<div id=a>${"<span>x</span>".repeat(200)}</div>`;
		expect(minify(source)).toBe(source);
	});

	for (const name of ["pre", "textarea", "listing"]) {
		it(`re-adds the leading newline <${name}> would lose on re-parsing`, () => {
			// The parser eats one newline going in, so a value that starts with one
			// needs a second — knowable only once the children are in, which is why
			// this element prints whole.
			expect(minify(`<div><${name}>\n\nkeep</${name}></div>`)).toBe(
				`<div><${name}>\n\nkeep</${name}></div>`
			);
			expect(minify(`<div><${name}>x</${name}></div>`)).toBe(
				`<div><${name}>x</${name}></div>`
			);
		});

		it(`swallows a newline only in the token right after <${name}>`, () => {
			// §13.2.6.4.7 ignores the newline only if it is *the next token*, so an
			// end tag, a comment or a doctype in between ends the offer — the
			// newline after them belongs to the document and renders.
			expect(minify(`<div><${name}></${name}>\nafter</div>`)).toBe(
				`<div><${name}></${name}>\nafter</div>`
			);
			// `<textarea>` is RCDATA, so nothing but text can come between.
			if (name === "textarea") return;
			expect(minify(`<div><${name}><!--c-->\nkeep</${name}></div>`)).toBe(
				`<div><${name}>\n\nkeep</${name}></div>`
			);
			expect(
				minify(`<div><${name}><!DOCTYPE html>\nkeep</${name}></div>`)
			).toBe(`<div><${name}>\n\nkeep</${name}></div>`);
			expect(minify(`<${name}><span></span>\nkeep</${name}>`)).toBe(
				`<${name}><span></span>\nkeep</${name}>`
			);
		});
	}

	it("drops an omitted tag that nothing printed inside", () => {
		expect(minify("")).toBe("");
		expect(minify("<html><body>")).toBe("<body></body></html>");
		expect(minify("</body><!--c-->")).toBe("");
	});

	it("keeps the end tag of a `<tbody>` whose start tag is omitted", () => {
		// Its start tag goes, its end tag stays — a `<caption>` after it would
		// otherwise re-parse into the row group.
		expect(minify("<table><tr><td>x</tbody><caption>c</caption></table>")).toBe(
			"<table><tr><td>x</tbody><caption>c</table>"
		);
		expect(minify("<table><tbody><tr><td>x</table>")).toBe(
			"<table><tr><td>x</table>"
		);
		expect(minify("<table><colgroup><col></colgroup><tr><td>y</table>")).toBe(
			"<table><col><tr><td>y</table>"
		);
	});

	it("keeps the end tag of a `/>` element that has children", () => {
		// `/>` only closes the tag in foreign content; in HTML it is ignored, and
		// whether the end tag is needed hangs on what ends up inside.
		expect(minify("<div/>x</div>")).toBe("<div>x</div>");
		expect(minify("<div/></div>")).toBe("<div>");
		expect(minify("<svg><path/><circle/></svg>")).toBe(
			"<svg><path/><circle/></svg>"
		);
	});

	it("prints a `<template>`'s content fragment in its place", () => {
		expect(minify("<div><template><p>a</p></template></div>")).toBe(
			"<div><template><p>a</template></div>"
		);
		expect(minify("<template></template>")).toBe("<template></template>");
	});
});

describe("token parts reported by the tokenizer", () => {
	/**
	 * @param {string} source HTML
	 * @returns {{ name: (string | null), publicId: (string | null), systemId: (string | null) }} the parsed doctype
	 */
	const doctypeOf = (source) => {
		for (const child of A.children(parseHtmlRefs(source))) {
			if (A.type(child) === NodeType.Doctype) {
				return {
					name: A.doctypeName(child),
					publicId: A.doctypePublicId(child),
					systemId: A.doctypeSystemId(child)
				};
			}
		}
		throw new Error(`no doctype in ${JSON.stringify(source)}`);
	};

	/**
	 * @param {string} source HTML
	 * @returns {string[]} every comment's data, in document order
	 */
	const commentsOf = (source) => {
		/** @type {string[]} */
		const out = [];
		/**
		 * @param {import("../lib/html/syntax").HtmlNodeRef} node node
		 */
		const walk = (node) => {
			if (A.type(node) === NodeType.Comment) out.push(A.data(node));
			for (const child of A.children(node)) walk(child);
		};
		for (const child of A.children(parseHtmlRefs(source))) walk(child);
		return out;
	};

	it("folds only ASCII upper alpha in a DOCTYPE name", () => {
		// The name states lowercase ASCII upper alpha and append everything else
		// unchanged, so `String#toLowerCase` is too eager here.
		expect(doctypeOf("<!DOCTYPE HTML>").name).toBe("html");
		expect(doctypeOf("<!DOCTYPEÐ>").name).toBe("Ð");
		expect(doctypeOf("<!DOCTYPEİ>").name).toBe("İ");
	});

	it("keeps a DOCTYPE identifier that no closing quote terminates", () => {
		expect(doctypeOf('<!DOCTYPE html PUBLIC "x')).toEqual({
			name: "html",
			publicId: "x",
			systemId: null
		});
		expect(doctypeOf("<!DOCTYPE html SYSTEM 's")).toEqual({
			name: "html",
			publicId: null,
			systemId: "s"
		});
		expect(doctypeOf('<!DOCTYPE html PUBLIC "p" ">x')).toEqual({
			name: "html",
			publicId: "p",
			systemId: ""
		});
	});

	it("treats U+000B as part of a DOCTYPE name, not whitespace", () => {
		// Only tab / LF / FF / space are ASCII whitespace to the tokenizer.
		expect(doctypeOf("<!DOCTYPE a\v>").name).toBe("a\v");
	});

	it("reports the comment data the comment states accumulated", () => {
		// Each of these appends characters that are not the ones just consumed,
		// so trimming delimiters off the token range gets them wrong.
		expect(commentsOf("<!-")).toEqual(["-"]);
		expect(commentsOf("<!-- >")).toEqual([" >"]);
		expect(commentsOf("<!-- ->")).toEqual([" ->"]);
		expect(commentsOf("<!----!")).toEqual([""]);
		expect(commentsOf("<!----! >")).toEqual(["--! >"]);
		expect(commentsOf("<!--a--->")).toEqual(["a-"]);
		expect(commentsOf("<!--a<!--b-->")).toEqual(["a<!--b"]);
		expect(commentsOf("<!-- <!--")).toEqual([" <!"]);
		// `-foo--` is no processing instruction target, so this stays a comment.
		expect(commentsOf("<?-foo-->")).toEqual(["?-foo--"]);
		expect(commentsOf("</-")).toEqual(["-"]);
		expect(commentsOf("<![CDATA[foo]]>")).toEqual(["[CDATA[foo]]"]);
	});
});

// The html5lib corpus reaches these arcs, but it is an optional git submodule
// that is skipped when absent — so the shipped states it exercises need
// coverage that runs unconditionally.
describe("tokenize — content modes, CDATA and NUL arcs", () => {
	const NUL = "\0";

	/**
	 * @param {string} source HTML
	 * @param {import("../lib/html/syntax").HtmlTokenCallbacks=} extra extra callbacks
	 * @returns {[string, ...EXPECTED_ANY[]][]} token stream
	 */
	const walk = (source, extra) => {
		/** @type {[string, ...EXPECTED_ANY[]][]} */
		const out = [];
		tokenize(source, 0, {
			openTag: (input, start, end, nameStart, nameEnd) => {
				out.push(["open", input.slice(nameStart, nameEnd)]);
				return end;
			},
			closeTag: (input, start, end, nameStart, nameEnd) => {
				out.push(["close", input.slice(nameStart, nameEnd)]);
				return end;
			},
			comment: (input, start, end) => {
				out.push(["comment", input.slice(start, end)]);
				return end;
			},
			text: (input, start, end) => {
				out.push(["text", input.slice(start, end)]);
				return end;
			},
			...extra
		});
		return out;
	};

	/**
	 * @param {string} source HTML
	 * @param {import("../lib/html/syntax").HtmlTokenCallbacks=} extra extra callbacks
	 * @returns {{ code: string, slice: string, severity: string }[]} reported errors
	 */
	const errorsOf = (source, extra) => {
		/** @type {{ code: string, slice: string, severity: string }[]} */
		const errors = [];
		tokenize(source, 0, {
			parseError: (input, code, start, end, severity) => {
				errors.push({ code, slice: input.slice(start, end), severity });
			},
			...extra
		});
		return errors;
	};

	it("seeds the content mode from `fragmentContext`", () => {
		// A fragment parsed with `<title>` as its context element starts in
		// RCDATA, so markup inside it is text until that element's end tag.
		expect(walk("<b>x</b></title>after", { fragmentContext: "title" })).toEqual(
			[
				["text", "<b>x</b>"],
				["close", "title"],
				["text", "after"]
			]
		);
		expect(walk("<b>x</b></style>after", { fragmentContext: "style" })).toEqual(
			[
				["text", "<b>x</b>"],
				["close", "style"],
				["text", "after"]
			]
		);
		expect(
			walk("<b>x</b></script>after", { fragmentContext: "script" })
		).toEqual([
			["text", "<b>x</b>"],
			["close", "script"],
			["text", "after"]
		]);
		// PLAINTEXT has no end tag at all.
		expect(walk("<b>x</b>", { fragmentContext: "plaintext" })).toEqual([
			["text", "<b>x</b>"]
		]);
		// A context element with no content mode of its own stays in data.
		expect(walk("<b>x</b>", { fragmentContext: "td" })).toEqual([
			["open", "b"],
			["text", "x"],
			["close", "b"]
		]);
	});

	it("runs a content mode to EOF when no `<` follows", () => {
		expect(walk("<title>abc")).toEqual([
			["open", "title"],
			["text", "abc"]
		]);
		expect(walk("<style>abc")).toEqual([
			["open", "style"],
			["text", "abc"]
		]);
		expect(walk("<script>abc")).toEqual([
			["open", "script"],
			["text", "abc"]
		]);
	});

	describe("CDATA sections in foreign content", () => {
		const foreign = { isForeign: () => true };

		it("keeps a `]` that does not close the section", () => {
			expect(walk("<svg><![CDATA[a]b]]c]]>t</svg>", foreign)).toEqual([
				["open", "svg"],
				["comment", "<![CDATA[a]b]]c]]>"],
				["text", "t"],
				["close", "svg"]
			]);
		});

		it("closes on the last of a run of `]`", () => {
			expect(walk("<svg><![CDATA[a]]]>t</svg>", foreign)).toEqual([
				["open", "svg"],
				["comment", "<![CDATA[a]]]>"],
				["text", "t"],
				["close", "svg"]
			]);
		});

		it("reports eof-in-cdata and emits what was read", () => {
			expect(walk("<svg><![CDATA[abc", foreign)).toEqual([
				["open", "svg"],
				["comment", "<![CDATA[abc"]
			]);
			expect(errorsOf("<svg><![CDATA[abc", foreign)).toEqual([
				{ code: "eof-in-cdata", slice: "", severity: "error" }
			]);
		});
	});

	it("reports unexpected-null-character from each state that consumes one", () => {
		/** @type {[string, string][]} */
		const states = [
			["attribute name", `<a b${NUL}c>`],
			["double-quoted attribute value", `<a b="${NUL}">`],
			["single-quoted attribute value", `<a b='${NUL}'>`],
			["unquoted attribute value", `<a b=${NUL}>`],
			["bogus comment", `<?${NUL}>`],
			["script data escape start dash", `<script><!-${NUL}</script>`],
			["script data escaped dash", `<script><!--x-${NUL}</script>`],
			["script data escaped dash dash", `<script><!--${NUL}</script>`],
			[
				"script data double escaped",
				`<script><!--<script>${NUL}</script></script>`
			],
			[
				"script data double escaped dash",
				`<script><!--<script>-${NUL}</script></script>`
			],
			[
				"script data double escaped dash dash",
				`<script><!--<script>--${NUL}</script></script>`
			],
			["plaintext", `<plaintext>${NUL}x`]
		];
		for (const [state, source] of states) {
			const nulls = errorsOf(source).filter(
				(error) => error.code === "unexpected-null-character"
			);
			expect([state, nulls]).toEqual([
				state,
				[{ code: "unexpected-null-character", slice: NUL, severity: "warning" }]
			]);
		}
	});

	it("scans a quoted attribute value again after a NUL before a reference", () => {
		// The memoized NUL scan is behind `pos` once the reference is consumed,
		// so the value states have to re-run it rather than stop at the old hit.
		/** @type {string[]} */
		const values = [];
		walk(`<a b="${NUL}&amp;y" c='${NUL}&amp;y'>`, {
			attribute: (
				/** @type {string} */ input,
				/** @type {number} */ nameStart,
				/** @type {number} */ nameEnd,
				/** @type {number} */ valueStart,
				/** @type {number} */ valueEnd
			) => {
				values.push(input.slice(valueStart, valueEnd));
				return valueEnd + 1;
			}
		});
		expect(values).toEqual([`${NUL}&amp;y`, `${NUL}&amp;y`]);
	});
});

describe("parseHtml — quirks and foreign-content arcs", () => {
	// In quirks mode `<table>` does not close an open `<p>`.
	/**
	 * @param {string} doctype the doctype to test
	 * @returns {boolean} whether the doctype selects quirks mode
	 */
	const isQuirks = (doctype) => {
		const nodes = body(`${doctype}<p>x<table></table>`);
		return nodes.length === 1 && nodes[0].tagName === "p";
	};

	it("selects quirks mode from the exact, prefix and system-id doctype lists", () => {
		expect(isQuirks('<!DOCTYPE html PUBLIC "HTML">')).toBe(true);
		expect(
			isQuirks(
				'<!DOCTYPE html PUBLIC "+//Silmaril//dtd html Pro v0r11 19970101//EN">'
			)
		).toBe(true);
		expect(
			isQuirks(
				'<!DOCTYPE html SYSTEM "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd">'
			)
		).toBe(true);
		expect(isQuirks("<!DOCTYPE html>")).toBe(false);
	});

	it("treats MathML and SVG integration points as their own scopes", () => {
		// `<mi>` is MathML-special, so `<p>` breaks all the way out of `<math>`.
		expect(
			body("<math><mi>a</mi><p>b</p></math>").map((n) => n.tagName)
		).toEqual(["math", "p"]);
		// `<desc>` is an SVG HTML-integration point, so `<p>` nests inside it.
		const svg = body("<svg><desc><p>b</p></desc></svg>")[0];
		expect(child(child(svg.children, "desc").children, "p")).toBeDefined();
		// `<g>` is neither, so `<p>` breaks out again.
		expect(body("<svg><g><p>b</p></g></svg>").map((n) => n.tagName)).toEqual([
			"svg",
			"p"
		]);
	});

	it("only treats <annotation-xml> as an integration point for HTML encodings", () => {
		/**
		 * @param {string} attributes the element's attributes
		 * @returns {boolean} whether `<p>` stayed inside the element
		 */
		const nestsHtml = (attributes) => {
			const math = body(
				`<math><annotation-xml${attributes}><p>b</p></annotation-xml></math>`
			)[0];
			return (
				child(child(math.children, "annotation-xml").children, "p") !==
				undefined
			);
		};
		expect(nestsHtml(' encoding="text/html"')).toBe(true);
		expect(nestsHtml(' encoding="APPLICATION/XHTML+XML"')).toBe(true);
		expect(nestsHtml(' encoding="text/plain"')).toBe(false);
		expect(nestsHtml("")).toBe(false);
	});

	it("stops an unmatched end tag at a special element in either foreign namespace", () => {
		// "Any other end tag" walks the stack of open elements and gives up at the
		// first special one — which can be a MathML or SVG element, not only HTML.
		const math = body(
			'<math><annotation-xml encoding="text/html"><b>x</foo>y</b></annotation-xml></math>'
		)[0];
		const b = child(child(math.children, "annotation-xml").children, "b");
		expect(/** @type {MatText} */ (b.children[0]).data).toBe("xy");

		const svg = body("<svg><desc><b>x</foo>y</b></desc></svg>")[0];
		const svgB = child(child(svg.children, "desc").children, "b");
		expect(/** @type {MatText} */ (svgB.children[0]).data).toBe("xy");
	});

	it("applies the Noah's Ark clause only to identical formatting elements", () => {
		/**
		 * @param {string} source source
		 * @returns {number} how many formatting elements were reconstructed
		 */
		const reconstructed = (source) => {
			let depth = 0;
			/** @type {MatElement} */
			let node = body(source)[1];
			while (node !== undefined && node.tagName === "b") {
				depth++;
				node = /** @type {MatElement} */ (node.children[0]);
			}
			return depth;
		};
		// Four identical entries: the earliest is dropped from the list.
		expect(reconstructed("<p><b x=1><b x=1><b x=1><b x=1>t</p>after")).toBe(3);
		// A differing attribute count, and a differing value, both break the match.
		expect(reconstructed("<p><b x=1><b x=1 y=2><b x=1><b x=1>t</p>after")).toBe(
			4
		);
		expect(reconstructed("<p><b x=1><b x=2><b x=1><b x=1>t</p>after")).toBe(4);
	});

	it("grows the node columns past the initial estimate", () => {
		// `len / 12` under-estimates a document of nothing but short start tags,
		// so the doubling growth path has to carry the rest. Walk the refs
		// directly — `materialize` recurses, and this tree is 5000 deep.
		let node = parseHtmlRefs("<i>".repeat(5000));
		let depth = 0;
		for (;;) {
			const children = A.children(node);
			if (children.length === 0) break;
			node = children[children.length - 1];
			if (A.type(node) === NodeType.Element && A.tagName(node) === "i") depth++;
		}
		expect(depth).toBe(5000);
	});
});

// Insertion-mode arcs the optional html5lib submodule covers only when present;
// each case is the smallest corpus input reaching an arc nothing else here does.

/**
 * @param {string} source HTML
 * @param {string=} fragmentContext context element for fragment parsing
 * @returns {string} the serialized tree
 */
const treeOf = (source, fragmentContext) => {
	const doc = parseHtmlRefs(source, 0, { fragmentContext });
	// In fragment mode the tree is the children of the synthesized root.
	const first = A.firstChild(doc);
	return serializeHtmlTree(fragmentContext && first !== 0 ? first : doc);
};

/** @type {[string, string, (string | undefined)][]} */
const CASES = [
	[
		"fosters an adoption-agency reparent out of a table",
		"<!doctype html><table><td><table><i>a<div>b<b>c</i>d",
		undefined
	],
	[
		"ignores every end tag the in-table insertion mode has no arc for",
		"<table><tr></strong></b></em></i></u></strike></s></blink></tt></pre></big></small></font></select></h1></h2></h3></h4></h5></h6></body></br></a></img></title></span></style></script></table></th></td></tr></frame></area></link></param></hr></input></col></base></meta></basefont></bgsound></embed></spacer></p></dd></dt></caption></colgroup></tbody></tfoot></thead></address></blockquote></center></dir></div></dl></fieldset></listing></menu></ol></ul></li></nobr></wbr></form></button></marquee></object></html></frameset></head></iframe></image></isindex></noembed></noframes></noscript></optgroup></option></plaintext></textarea>",
		undefined
	],
	[
		"nests framesets and switches to after-frameset",
		"<frame></frame></frame><frameset><frame><frameset><frame></frameset><noframes></frameset><noframes>",
		undefined
	],
	["closes a foreign element by its own end tag", "<g></path>X", "svg path"],
	["opens a template with no body yet", "<head></head><template>", undefined],
	[
		"re-nests a badly nested table, font and anchor",
		"<TABLE>\n<TR>\n<CENTER><CENTER><TD></TD></TR><TR>\n<FONT>\n<TABLE><tr></tr></TABLE>\n</P>\n<a></font><font></a>\nThis page contains an insanely badly-nested tag sequence.",
		undefined
	],
	[
		"parses a template fragment with a form in it",
		'<template><form><input name="q"></form><div>second</div></template>',
		"template"
	],
	[
		"breaks a paragraph out of foreign content",
		"<!doctype html><p><math></p>a",
		undefined
	],
	[
		"ignores a second form in a table",
		"<!doctype html><table><form><form>",
		undefined
	],
	["closes an implied tbody from a cell", "<table><td></tbody>A", undefined],
	[
		"ends a template inside a table body",
		"<table><tbody><template></tbody></template>",
		undefined
	],
	[
		"pops a select and a template out of a cell",
		"<body><table><tr><td><select><template>Foo</template><caption>A</table>",
		undefined
	],
	[
		"keeps an end tag inside a script fragment",
		"<!-- inside </script> -->",
		"script"
	],
	[
		"foster-parents text out of a column group",
		"<table><colgroup> foo</colgroup></table>",
		undefined
	],
	[
		"breaks out of MathML text integration points",
		"<b></b><mglyph/><i></i><malignmark/><u></u><ms/>X",
		"math ms"
	],
	[
		"handles a break and a comment in head noscript",
		"<head><noscript></br><!--foo--></noscript>",
		undefined
	],
	[
		"implies the end of a ruby base",
		"<html><ruby>a<rb>b<rb></ruby></html>",
		undefined
	],
	[
		"appends a comment after the body to the html element",
		"<!doctype html><html></p><!--foo-->",
		undefined
	],
	[
		"opens a column group inside a template",
		"<body><template><col><colgroup>",
		undefined
	],
	["reads a textarea fragment as text", "direct textarea content", "textarea"],
	["ends a caption fragment", "</caption><div>", "caption"],
	["ends a frameset fragment", "</frameset><frame>", "frameset"],
	[
		"foster-parents a formatting element out of a table",
		"<table><a>1<td>2</td>3</table>",
		undefined
	],
	[
		"runs the adoption agency past its outer-loop limit",
		"<div><a><b><div><div><div><div><div><div><div><div><div><div></a>",
		undefined
	],
	[
		"reconstructs nobr across a table and a marquee",
		"<nobr><table><marquee></table><nobr>",
		undefined
	],
	[
		"ignores a doctype inside a column group",
		"<table><colgroup><!DOCTYPE html></colgroup></table>",
		undefined
	],
	[
		"ignores a doctype in foreign content",
		"<svg><!DOCTYPE html></svg>",
		undefined
	],
	["parses a body start tag in an SVG desc fragment", "<body>X", "svg desc"],
	[
		"ignores a stray menuitem end tag",
		"<!DOCTYPE html><head></menuitem>",
		undefined
	],
	[
		"ignores the end tags a cell has no arc for",
		"<table><td></body></caption></col></colgroup></html>foo",
		undefined
	],
	[
		"ignores a template end tag with no template open",
		"<div></template></div>",
		undefined
	],
	[
		"opens a row inside a template",
		"<body><template><tr><div></div></tr></template>",
		undefined
	],
	[
		"merges html attributes across a template",
		"<html a=b><template><div><html b=c><span></template>",
		undefined
	],
	[
		"leaves annotation-xml when its SVG child closes",
		"<math><annotation-xml><svg></svg></annotation-xml><mi>",
		undefined
	],
	[
		"reads noframes text after the frameset closed",
		"<!doctype html><frameset></frameset><noframes>abc",
		undefined
	],
	[
		"closes an optgroup when the next one opens",
		"<!DOCTYPE html><select><optgroup><option><optgroup>",
		undefined
	],
	[
		"reopens a form once the table that held it closed",
		"<!doctype html><table><form></table><form>",
		undefined
	],
	[
		"ignores a plaintext end tag in a plaintext fragment",
		"</plaintext>",
		"plaintext"
	],
	[
		"ignores the end tags a table body has no arc for",
		"<table><tbody></body></caption></col></colgroup></html></td></th></tr>",
		undefined
	],
	["drops an input from a select fragment", "<input><option>", "select"],

	// A stray DOCTYPE, a repeated `<html>` or a repeated `<head>`/`<body>` has
	// its own arc in every insertion mode, and each one is a separate ignore.
	[
		"ignores a second doctype before html",
		"<!DOCTYPE html><!DOCTYPE html>",
		undefined
	],
	["ignores a doctype before head", "<html><!DOCTYPE html>", undefined],
	[
		"ignores a doctype in head",
		"<html><head><!DOCTYPE html></head>",
		undefined
	],
	[
		"ignores a doctype after head",
		"<html><head></head><!DOCTYPE html>",
		undefined
	],
	[
		"ignores a doctype after the body",
		"<body></body><!DOCTYPE html>",
		undefined
	],
	[
		"ignores a doctype after after the body",
		"<html><body></body></html><!DOCTYPE html>",
		undefined
	],
	[
		"merges a repeated html start tag before head",
		"<!DOCTYPE html><html><html abc:def=gh><xyz:abc></xyz:abc>",
		undefined
	],
	[
		"merges a repeated html start tag in head",
		"<!DOCTYPE html><head><html id=x>",
		undefined
	],
	[
		"merges a repeated html start tag after head",
		"<!doctype html><html a=b><head></head><html c=d>",
		undefined
	],
	[
		"merges a repeated html start tag after the body",
		'<!DOCTYPE html>X</body><html id="x">',
		undefined
	],
	[
		"merges a repeated html start tag in head noscript",
		'<head><noscript><html class="foo"><!--foo--></noscript>',
		undefined
	],
	[
		"treats an html start tag in a column group as in-body",
		"<table><colgroup><html></colgroup></table>",
		undefined
	],
	[
		"ignores a repeated head start tag after head",
		"<html><head></head><template></template><head>",
		undefined
	],
	[
		"ignores a repeated head end tag in head",
		"<!DOCTYPE html><HTML><META><HEAD></HEAD></HTML>",
		undefined
	],
	[
		"ignores a paragraph end tag after head",
		"<!doctype html><head></head></p><!--foo-->",
		undefined
	],
	[
		"merges a repeated body start tag inside a template",
		"<body a=b><template><div></div><body c=d><div></div></body></template></body>",
		undefined
	],
	["ends the body from an html fragment", "<body></body></html>", "html"],

	// NUL handling and text insertion.
	["drops a NUL before a frameset", "<html>\0<frameset></frameset>", undefined],
	[
		"keeps a frameset out once text arrived",
		"<html>a\0a<frameset></frameset>",
		undefined
	],
	[
		"foster-parents text between two formatting elements",
		"<!doctype html>a<i>b<table>c<b>d</i>e</b>f",
		undefined
	],
	[
		"strips the newline a pre element starts with",
		"<!DOCTYPE html><html><head></head><body><pre>\n</pre></body></html>",
		undefined
	],

	// Table-related modes reached through a template or a fragment.
	[
		"ignores a table end tag inside a template",
		"<body><template><thead></thead></table><tbody></tbody></template></body>",
		undefined
	],
	[
		"ignores a row end tag inside a template",
		"<body><template><td></td></tr><td></td></template>",
		undefined
	],
	[
		"ignores a row end tag inside a template cell",
		"<body><table><template><td></tr><div></template></table>",
		undefined
	],
	[
		"ignores a column group end tag inside a template",
		"<body><template><col></colgroup>",
		undefined
	],
	[
		"ends a column group on text inside a template",
		"<body><template><col>Hello",
		undefined
	],
	[
		"closes a cell on a mismatched th end tag",
		"<table><tr><td></th>",
		undefined
	],
	[
		"ignores table-section end tags in a row fragment",
		"</tbody></tfoot></thead><td>",
		"tr"
	],
	[
		"ignores a thead end tag in a table body",
		"<table><tbody></thead>",
		undefined
	],
	["opens an implied tbody in a table fragment", "<table><tr>", "table"],
	[
		"clears a table body context across nested tables",
		"<a><table><td><a><table></table><a></tr><a></table><b>X</b>C<a>Y",
		undefined
	],
	[
		"runs thorough implied end tags for a template in a table",
		"<table><thead><template><td></template></table>",
		undefined
	],

	// Foreign content and scope boundaries.
	["ignores a foreign end tag with no match", "</path>X", "svg path"],
	[
		"ignores a frameset start tag in an SVG desc fragment",
		"<frameset>X",
		"svg desc"
	],
	[
		"ignores a tbody start tag inside MathML in a thead fragment",
		"<math><thead><mo><tbody>",
		"thead"
	],
	["closes a div across an SVG element", "<div><svg></div>a", undefined],
	[
		"treats a self-closed math element as foreign",
		"<!doctype html><math/><foo>",
		undefined
	],

	// Arcs the corpus does not reach at all.
	[
		"ignores a second form end tag inside a template",
		"<template><form></form></form></template>",
		undefined
	],
	[
		"drops a table cell holding nothing but a NUL",
		"<table>\0</table>",
		undefined
	],
	[
		"ignores a template end tag after head",
		"<head></head></template>",
		undefined
	]
];

describe("parseHtml — insertion modes", () => {
	for (const [name, source, fragmentContext] of CASES) {
		it(name, () => {
			expect(treeOf(source, fragmentContext)).toMatchSnapshot();
		});
	}
});
