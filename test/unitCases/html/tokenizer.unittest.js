"use strict";

// cspell:ignore apos notpre Elig reconsumes xyzabc zzzunknown codepoint DFFF ampx noncharacter FFFE scrip
// cspell:ignore scripty
// cspell:ignore DOCTYPEÐ DOCTYPEİ
// cspell:ignore noembed

/** @import { HtmlNodeRef } from "../../../lib/html/syntax-parser" */
/** @import { MatText } from "../../helpers/materializeHtmlTree" */

const fs = require("fs");
const path = require("path");
const {
	A,
	Part,
	NodeType,
	Quote,
	decodeEntities,
	escapeAttribute,
	escapeText,
	parseHtml: parseHtmlRefs,
	tokenize,
	tokenizeXml
} = require("../../../lib/html/syntax-parser");
const {
	body,
	child,
	childrenOf,
	html,
	parseHtml
} = require("../../helpers/materializeHtmlTree");

describe("tokenize", () => {
	const casesPath = path.resolve(__dirname, "../../fixtures/html/parsing/cases");
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
					if (quoteType === Quote.Double) {
						return valueEnd + 1;
					}
					if (quoteType === Quote.Single) {
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
				if (qt !== Quote.None) return ve + 1;
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
				if (qt !== Quote.None) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([
			["a", "1", Quote.Double],
			["b", "2", Quote.Single],
			["c", "3", Quote.None]
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
		// `<![CDATA[` opens a CDATA section only under an adjusted current node
		// outside the HTML namespace (§13.2.5.42). With no `isForeign` callback
		// there is none, so this is a bogus comment ending at the first `>`.
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
		// accumulate the whole tag name — under a length cap `</scripts>` falsely
		// matches `script` and leaves the double-escaped state early.
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
		// Regression: a `</script>` emitted straight from SCRIPT_DATA_ESCAPED,
		// with no `-->` back through SCRIPT_DATA, needs `tagStart` at its `<` —
		// otherwise `flushText(tagStart)` empties the range and loses the body.
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
				if (qt !== Quote.None) return ve + 1;
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
				if (qt !== Quote.None) return ve + 1;
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
				if (qt !== Quote.None) return ve + 1;
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
					if (qt !== Quote.None) return ve + 1;
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
				["attr", "=foo", null, Quote.None],
				["open", "a", false]
			]);
		});

		// --- STATE_AFTER_ATTRIBUTE_NAME ---
		it("aFTER_ATTR_NAME: space then `/` self-closes", () => {
			expect(walk("<br foo />")).toEqual([
				["attr", "foo", null, Quote.None],
				["open", "br", true]
			]);
		});

		it("aFTER_ATTR_NAME: space then `=` switches to BEFORE_ATTR_VALUE", () => {
			expect(walk("<a foo = 'bar'>")).toEqual([
				["attr", "foo", "bar", Quote.Single],
				["open", "a", false]
			]);
		});

		it("aFTER_ATTR_NAME: `>` closing on a close tag form `</a foo >`", () => {
			expect(walk("<a></a foo >")).toEqual([
				["open", "a", false],
				["attr", "foo", null, Quote.None],
				["close", "a"]
			]);
		});

		it("aFTER_ATTR_NAME: new attribute begins after whitespace", () => {
			expect(walk("<a foo bar>")).toEqual([
				["attr", "foo", null, Quote.None],
				["attr", "bar", null, Quote.None],
				["open", "a", false]
			]);
		});

		// --- STATE_BEFORE_ATTRIBUTE_VALUE ---
		it("bEFORE_ATTR_VALUE: leading whitespace before value is ignored", () => {
			expect(walk("<a foo=   'bar'>")).toEqual([
				["attr", "foo", "bar", Quote.Single],
				["open", "a", false]
			]);
		});

		it("bEFORE_ATTR_VALUE: `>` after `=` emits attribute with empty value", () => {
			// Per spec, `<a foo=>` is a missing-attribute-value parse error and
			// `foo` is created with the empty string. The walker reports an empty
			// value range pointing at `>`.
			expect(walk("<a foo=>")).toEqual([
				["attr", "foo", "", Quote.None],
				["open", "a", false]
			]);
		});

		it("bEFORE_ATTR_VALUE: `>` after `=` on close tag form", () => {
			expect(walk("<a></a foo=>")).toEqual([
				["open", "a", false],
				["attr", "foo", "", Quote.None],
				["close", "a"]
			]);
		});

		// --- STATE_ATTRIBUTE_VALUE_UNQUOTED ---
		it("aTTR_VALUE_UNQUOTED: space terminates value", () => {
			expect(walk("<a foo=bar baz>")).toEqual([
				["attr", "foo", "bar", Quote.None],
				["attr", "baz", null, Quote.None],
				["open", "a", false]
			]);
		});

		it("aTTR_VALUE_UNQUOTED: `>` on close tag form", () => {
			expect(walk("<a></a foo=bar>")).toEqual([
				["open", "a", false],
				["attr", "foo", "bar", Quote.None],
				["close", "a"]
			]);
		});

		// --- STATE_AFTER_ATTRIBUTE_VALUE_QUOTED ---
		it("aFTER_ATTR_VALUE_QUOTED: `/` self-closes", () => {
			expect(walk('<br foo="bar"/>')).toEqual([
				["attr", "foo", "bar", Quote.Double],
				["open", "br", true]
			]);
		});

		it("aFTER_ATTR_VALUE_QUOTED: `>` on close tag form", () => {
			expect(walk('<a></a foo="bar">')).toEqual([
				["open", "a", false],
				["attr", "foo", "bar", Quote.Double],
				["close", "a"]
			]);
		});

		it("aFTER_ATTR_VALUE_QUOTED: anything else reconsumes (missing-whitespace)", () => {
			expect(walk('<a foo="x"bar>')).toEqual([
				["attr", "foo", "x", Quote.Double],
				["attr", "bar", null, Quote.None],
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
				["attr", "foo", null, Quote.None],
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
				["attr", "foo", null, Quote.None],
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
				["attr", "foo", null, Quote.None],
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
				["attr", "foo", null, Quote.None],
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
				["attr", "foo", null, Quote.None],
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
			// The longest WHATWG entity name is 32 chars including the `;`, so the
			// run before it is at most 31. The scanner caps the consume loop there,
			// keeping `&` plus thousands of alphanumerics linear-time.
			const longEntity = `&${"a".repeat(50)}`;
			expect(roundtrip(longEntity)).toBe(longEntity);
		});

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

		// --- attribute spellings (§13.2.5.33-.37) ---
		// Every way an attribute can be written, from the plain `name="value"`
		// to the ones that reach a state of their own.
		describe("attribute spellings", () => {
			it("reads the common shape", () => {
				expect(walk('<div a="1" b="2">')).toEqual([
					["attr", "a", "1", Quote.Double],
					["attr", "b", "2", Quote.Double],
					["open", "div", false]
				]);
				expect(roundtrip('<div a="1" b="2">')).toBe('<div a="1" b="2">');
			});

			it("reads a single-quoted value", () => {
				expect(walk("<div a='1' b='2'>")).toEqual([
					["attr", "a", "1", Quote.Single],
					["attr", "b", "2", Quote.Single],
					["open", "div", false]
				]);
				expect(roundtrip("<div a='1'>")).toBe("<div a='1'>");
			});

			it("reads whitespace around `=`", () => {
				expect(walk('<div a = "1">')).toEqual([
					["attr", "a", "1", Quote.Double],
					["open", "div", false]
				]);
				expect(walk("<div a= '1'>")).toEqual([
					["attr", "a", "1", Quote.Single],
					["open", "div", false]
				]);
				expect(roundtrip('<div a = "1">')).toBe('<div a = "1">');
			});

			it("reads an unquoted value", () => {
				expect(walk("<div a=1 b=2>")).toEqual([
					["attr", "a", "1", Quote.None],
					["attr", "b", "2", Quote.None],
					["open", "div", false]
				]);
				expect(roundtrip("<div a=1>")).toBe("<div a=1>");
			});

			it("an empty quoted value stops the scan on the closing quote", () => {
				expect(walk("<div a=\"\" b=''>")).toEqual([
					["attr", "a", "", Quote.Double],
					["attr", "b", "", Quote.Single],
					["open", "div", false]
				]);
			});

			it("reads a reference inside the value", () => {
				expect(walk("<div a=\"x&amp;y\" b='x&amp;y'>")).toEqual([
					["attr", "a", "x&amp;y", Quote.Double],
					["attr", "b", "x&amp;y", Quote.Single],
					["open", "div", false]
				]);
				// A leading `&` keeps the scan at the opening quote.
				expect(walk('<div a="&amp;">')).toEqual([
					["attr", "a", "&amp;", Quote.Double],
					["open", "div", false]
				]);
			});

			it("reads a NUL inside the value", () => {
				expect(walk("<div a=\"x\0y\" b='x\0y'>")).toEqual([
					["attr", "a", "x\0y", Quote.Double],
					["attr", "b", "x\0y", Quote.Single],
					["open", "div", false]
				]);
			});

			it("an unterminated value is recovered by the EOF handler", () => {
				// No closing quote in the rest of the input, so the scan clamps to
				// the end and the EOF handler emits what it has.
				expect(walk('<div a="1')).toEqual([
					["attr", "a", "1", Quote.Double],
					["open", "div", false]
				]);
				expect(walk("<div a='1")).toEqual([
					["attr", "a", "1", Quote.Single],
					["open", "div", false]
				]);
				expect(walk("<div a=")).toEqual([
					["attr", "a", null, Quote.None],
					["open", "div", false]
				]);
				expect(walk("<div a")).toEqual([
					["attr", "a", null, Quote.None],
					["open", "div", false]
				]);
			});

			it("reads an error character in the name", () => {
				expect(walk('<div a"b="1">')).toEqual([
					["attr", 'a"b', "1", Quote.Double],
					["open", "div", false]
				]);
			});
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

		it("reports no error for a well-formed processing instruction", () => {
			// The obsolete unexpected-question-mark-instead-of-tag-name is gone: `<?`
			// opens the processing instruction states (§13.2.5.42-46).
			expect(collectErrors("a<?pi?>b<?_a-1 x?y>")).toEqual([]);
			// A target cut at `?`, `>` or whitespace may spell `xml` inside a longer name.
			expect(collectErrors("<?xmls?><?xm>")).toEqual([]);
		});

		it("reports the processing instruction target errors as warnings", () => {
			expect(collectErrors("<?1>")).toEqual([
				{
					code: "invalid-first-character-of-processing-instruction-target",
					slice: "1",
					severity: "warning"
				}
			]);
			expect(collectErrors("<?a.b>")).toEqual([
				{
					code: "invalid-processing-instruction-target",
					slice: ".",
					severity: "warning"
				}
			]);
			expect(collectErrors("<?XML a?><?xml-stylesheet>")).toEqual([
				{
					code: "disallowed-processing-instruction-target",
					slice: "XML",
					severity: "warning"
				},
				{
					code: "disallowed-processing-instruction-target",
					slice: "xml-stylesheet",
					severity: "warning"
				}
			]);
			// A NUL after an invalid target is in the bogus comment that follows.
			expect(collectErrors("<?\0>").map((e) => e.code)).toEqual([
				"invalid-first-character-of-processing-instruction-target",
				"unexpected-null-character"
			]);
		});

		it("reports eof-in-processing-instruction as an error, after earlier ones", () => {
			for (const html of ["<?", "<?a", "<?a b?", "<?a>x<?"]) {
				expect(collectErrors(html)).toEqual([
					{ code: "eof-in-processing-instruction", slice: "", severity: "error" }
				]);
			}
			// An invalid target makes it a bogus comment, which EOF ends silently.
			expect(collectErrors("<?1").map((e) => e.code)).toEqual([
				"invalid-first-character-of-processing-instruction-target"
			]);
			expect(collectErrors("<?xml ").map((e) => e.code)).toEqual([
				"disallowed-processing-instruction-target"
			]);
			// So does one a `<?` before it does not open.
			expect(collectErrors("<?a>x</1").map((e) => e.code)).toEqual([
				"invalid-first-character-of-tag-name"
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
					if (qt !== Quote.None) return ve + 1;
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
			// Regression: EOF in an RCDATA / RAWTEXT / SCRIPT_DATA end-tag-name
			// state must reset `tagNameEnd`, which still carries the matching open
			// tag's value — otherwise `emitCloseTag(len)` slices the wrong range.
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
					if (qt !== Quote.None) return ve + 1;
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
			// No adjusted current node, so `<![CDATA[` is not a CDATA section but a
			// cdata-in-html-content bogus comment (§13.2.5.42); `eof-in-cdata` is
			// covered by the foreign-content path.
			const errors = collectErrors("<![CDATA[unclosed");
			// The bogus comment state emits its token at EOF without a further
			// parse error, so this is the only one.
			expect(errors).toEqual([
				{
					code: "cdata-in-html-content",
					slice: "<![CDATA[",
					severity: "warning"
				}
			]);
		});

		it("reports cdata-in-html-content where isForeign says HTML content", () => {
			/** @type {string[]} */
			const out = [];
			tokenize("<![CDATA[a]]>", 0, {
				isForeign: () => false,
				comment: (input, start, end, dataStart, dataEnd) => {
					out.push(input.slice(dataStart, dataEnd));
					return end;
				},
				parseError: (input, code) => out.push(code)
			});
			expect(out).toEqual(["cdata-in-html-content", "[CDATA[a]]"]);
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

		it("reports eof-in-script-html-comment-like-text from the states that reconsume into it", () => {
			// Escaped end tag open and double escape start emit what they hold and
			// reconsume in the escaped state, whose EOF is the error.
			for (const html of ["<script><!--</", "<script><!--<a", "<script><!--<"]) {
				expect(collectErrors(html)).toEqual([
					{
						code: "eof-in-script-html-comment-like-text",
						slice: "",
						severity: "error"
					}
				]);
			}
		});

		it("reports no end-tag-with-attributes for an end tag cut by EOF", () => {
			// The spec drops the token, so eof-in-tag is its only error.
			expect(collectErrors("</a b").map((e) => e.code)).toEqual(["eof-in-tag"]);
			expect(collectErrors("</a b=1 ").map((e) => e.code)).toEqual([
				"eof-in-tag"
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

		it("parseHtml forwards the option", () => {
			/** @type {[string, string][]} */
			const errors = [];
			parseHtmlRefs("<!DOCTYPE html><br foo=><p></x>", 0, {
				parseError: (input, code, start, end) => {
					errors.push([code, input.slice(start, end)]);
				}
			});
			expect(errors).toEqual([
				["missing-attribute-value", ">"],
				["unexpected-end-tag", "</x>"]
			]);
		});

		it.each([
			["x", undefined, ["expected-doctype-but-got-chars"]],
			["<p>", undefined, ["expected-doctype-but-got-start-tag"]],
			["</p>", undefined, ["expected-doctype-but-got-end-tag", "unexpected-end-tag-before-html"]],
			["", undefined, ["expected-doctype-but-got-eof"]],
			["<!DOCTYPE html5>", undefined, ["unknown-doctype"]],
			["<!DOCTYPE html PUBLIC \"x\">", undefined, ["unknown-doctype"]],
			["<!DOCTYPE html SYSTEM \"x\">", undefined, ["unknown-doctype"]],
			["<!DOCTYPE html SYSTEM \"about:legacy-compat\">", undefined, []],
			["<!DOCTYPE html><!DOCTYPE html>", undefined, ["unexpected-doctype"]],
			["<!DOCTYPE html><html><!DOCTYPE html></x>", undefined, ["unexpected-doctype", "end-tag-after-implied-root"]],
			["<!DOCTYPE html><head><!DOCTYPE html><head></x>", undefined, ["unexpected-doctype", "two-heads-are-not-better-than-one", "unexpected-end-tag"]],
			["<!DOCTYPE html><head></template>", undefined, ["unexpected-end-tag"]],
			["<!DOCTYPE html><head><template><div></template>", undefined, ["end-tag-too-early"]],
			["<!DOCTYPE html><head><noscript><!DOCTYPE html><head></x>x", undefined, ["unexpected-doctype", "unexpected-start-tag", "unexpected-end-tag", "char-in-head-noscript"]],
			["<!DOCTYPE html><head><noscript></br>", undefined, ["unexpected-inhead-noscript-tag", "unexpected-end-tag-treated-as"]],
			["<!DOCTYPE html><head><noscript>", undefined, ["eof-in-head-noscript"]],
			["<!DOCTYPE html><head></head><!DOCTYPE html><title></title><head></x>", undefined, ["unexpected-doctype", "unexpected-start-tag-out-of-my-head", "unexpected-start-tag", "unexpected-end-tag"]],
			["<!DOCTYPE html><body><!DOCTYPE html><html><body><frameset>", undefined, ["unexpected-doctype", "non-html-root", "unexpected-start-tag", "unexpected-start-tag"]],
			["<!DOCTYPE html><h1><h2>", undefined, ["unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><form><form>", undefined, ["unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><li><b><li>", undefined, ["end-tag-too-early"]],
			["<!DOCTYPE html><dd><b><dt>", undefined, ["end-tag-too-early"]],
			["<!DOCTYPE html><button><button>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><a><a>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><nobr><nobr>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><select><input>", undefined, ["unexpected-input-in-select"]],
			["<!DOCTYPE html><select><option><b><hr>", undefined, ["unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><select><option><b><option>", undefined, ["unexpected-start-tag-implies-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><image>", undefined, ["unexpected-start-tag-treated-as"]],
			["<!DOCTYPE html><select><select>", undefined, ["unexpected-select-in-select"]],
			["<!DOCTYPE html><ruby><b><rb><span><rt>", undefined, ["unexpected-start-tag", "unexpected-start-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><caption><col><frame><head><tbody>", undefined, ["unexpected-start-tag-ignored", "unexpected-start-tag-ignored", "unexpected-start-tag-ignored", "unexpected-start-tag-ignored", "unexpected-start-tag-ignored"]],
			["<!DOCTYPE html><div>\u0000x", undefined, ["unexpected-null-character", "invalid-codepoint", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><p><li><dd>", undefined, []],
			["<!DOCTYPE html></select><select><b></select>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
			["<!DOCTYPE html></body><b></body>", undefined, ["unexpected-start-tag-after-body", "expected-one-end-tag-but-got-another"]],
			["<!DOCTYPE html></div><div><b></div>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
			["<!DOCTYPE html></form><form><b></form>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early-ignored", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><template></form><form><b></form></template>", undefined, ["unexpected-end-tag", "end-tag-too-early-ignored"]],
			["<!DOCTYPE html></p><p><b></p>", undefined, ["unexpected-end-tag-before-html", "unexpected-end-tag"]],
			["<!DOCTYPE html></li><li><b></li>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
			["<!DOCTYPE html></dd><dd><b></dd>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
			["<!DOCTYPE html></h1><h1><b></h2>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
			["<!DOCTYPE html></object><object><b></object>", undefined, ["unexpected-end-tag-before-html", "end-tag-too-early"]],
			["<!DOCTYPE html></br>", undefined, ["unexpected-end-tag-treated-as"]],
			["<!DOCTYPE html><b></i></div><span><div></span>", undefined, ["unexpected-end-tag", "unexpected-end-tag", "unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><b><div></b>", undefined, ["adoption-agency-1.3", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><b><table></b>", undefined, ["unexpected-end-tag-implies-table-voodoo", "adoption-agency-4.4", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><a><table><td><a><table></table><a></tr><a></table>", undefined, ["unexpected-cell-in-table-body", "unexpected-start-tag-implies-end-tag", "unexpected-cell-end-tag", "unexpected-start-tag-implies-table-voodoo", "unexpected-start-tag-implies-end-tag", "adoption-agency-4.4"]],
			["<!DOCTYPE html><script>", undefined, ["expected-named-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><script></script x", undefined, ["eof-in-tag", "expected-named-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><script></S", undefined, ["expected-named-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><script><!--<a", undefined, ["eof-in-script-html-comment-like-text", "expected-named-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><script><!--</", undefined, ["eof-in-script-html-comment-like-text", "expected-named-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><script><!--</script", undefined, ["eof-in-script-html-comment-like-text", "expected-named-closing-tag-but-got-eof"]],
			["</b test", undefined, ["eof-in-tag", "expected-doctype-but-got-eof"]],
			["<!DOCTYPE html><table><!DOCTYPE html><table></table></table>", undefined, ["unexpected-doctype", "unexpected-start-tag-implies-end-tag", "unexpected-end-tag"]],
			["<!DOCTYPE html><table><input type=hidden><form><form>", undefined, ["unexpected-hidden-input-in-table", "unexpected-form-in-table", "unexpected-form-in-table", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><table><tr><b>x y</b>", undefined, ["unexpected-start-tag-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "unexpected-end-tag-implies-table-voodoo", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><table>\u0000 x<tr>", undefined, ["unexpected-null-character", "invalid-codepoint", "unexpected-character-implies-table-voodoo", "unexpected-character-implies-table-voodoo", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><table><caption></caption></caption>", undefined, ["unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><table><caption><b></caption>", undefined, ["expected-one-end-tag-but-got-another", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><template><caption></caption></caption><caption></body><col>",
				undefined,
				["unexpected-end-tag", "unexpected-end-tag", "eof-in-template"]
			],
			["<col></caption>", "caption", ["unexpected-start-tag", "unexpected-end-tag"]],
			[
				"<!DOCTYPE html><p><b></p></b>",
				undefined,
				["unexpected-end-tag", "adoption-agency-1.2"]
			],
			[
				"<!DOCTYPE html><div>&amp;\u0000",
				undefined,
				[
					"unexpected-null-character",
					"invalid-codepoint",
					"expected-closing-tag-but-got-eof"
				]
			],
			[
				"<!DOCTYPE html><template><col></x>",
				undefined,
				["unexpected-end-tag", "eof-in-template"]
			],
			[
				"<!DOCTYPE html><body></body></x>",
				undefined,
				["unexpected-end-tag-after-body", "unexpected-end-tag"]
			],
			[
				"<!DOCTYPE html><body></body>x",
				undefined,
				["unexpected-char-after-body"]
			],
			["<!DOCTYPE html><table><colgroup><!DOCTYPE html></col>x", undefined, ["unexpected-doctype", "no-end-tag", "unexpected-character-implies-table-voodoo", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><template><col> x<b></colgroup>", undefined, ["unexpected-char-in-column-group", "unexpected-start-tag", "unexpected-end-tag", "eof-in-template"]],
			["<!DOCTYPE html><table><tbody><td></thead></body>", undefined, ["unexpected-cell-in-table-body", "unexpected-end-tag", "unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><table><tbody></thead></body>", undefined, ["unexpected-end-tag-in-table-body", "unexpected-end-tag-in-table-body", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><template><tr></tr><caption></table></template>", undefined, ["unexpected-start-tag", "unexpected-end-tag"]],
			["<!DOCTYPE html><template><td></td></tr><caption></table></template>", undefined, ["unexpected-end-tag", "unexpected-start-tag", "unexpected-end-tag"]],
			["<!DOCTYPE html><table><tr></thead></td>", undefined, ["unexpected-end-tag", "unexpected-end-tag-in-table-row", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><table><tr><td><b></td><td></table></td></caption>", undefined, ["unexpected-cell-end-tag", "unexpected-end-tag", "unexpected-end-tag"]],
			["<!DOCTYPE html><table><tr><td></tr><td><b></tr>", undefined, ["unexpected-cell-in-table-body", "unexpected-cell-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><template></x>", undefined, ["unexpected-end-tag", "eof-in-template"]],
			["<!DOCTYPE html><body></body><!DOCTYPE html><b></b>x</html>", undefined, ["unexpected-doctype", "unexpected-start-tag-after-body"]],
			["<!DOCTYPE html><body></body></html><p></p>x", undefined, ["expected-eof-but-got-start-tag"]],
			["<!DOCTYPE html><html><body></html>x", undefined, ["expected-eof-but-got-char"]],
			["<!DOCTYPE html><frameset><!DOCTYPE html>x <b></b></frameset></frameset>", undefined, ["unexpected-doctype", "unexpected-char-in-frameset", "unexpected-start-tag-in-frameset", "unexpected-end-tag-in-frameset", "unexpected-end-tag-after-frameset"]],
			["<!DOCTYPE html><frameset>", undefined, ["eof-in-frameset"]],
			["<!DOCTYPE html><frameset></frameset><!DOCTYPE html>x <b>", undefined, ["unexpected-doctype", "unexpected-char-after-frameset", "unexpected-start-tag-after-frameset"]],
			["<!DOCTYPE html><frameset></frameset></html>x <b></b>", undefined, ["expected-eof-but-got-char", "expected-eof-but-got-start-tag", "expected-eof-but-got-end-tag"]],
			["<!DOCTYPE html><svg><!DOCTYPE html>\u0000<b></svg><svg></p>", undefined, ["unexpected-doctype", "unexpected-null-character", "invalid-codepoint", "unexpected-html-element-in-foreign-content", "unexpected-end-tag", "unexpected-html-element-in-foreign-content", "unexpected-end-tag", "expected-closing-tag-but-got-eof"]],
			["<!DOCTYPE html><svg><g></x>",
				undefined,
				[
					"unexpected-end-tag",
					"unexpected-end-tag",
					"expected-closing-tag-but-got-eof"
				]
			],
			["<!DOCTYPE html><div/><br/><svg/><math/><svg><g/></svg>", undefined, ["non-void-html-element-start-tag-with-trailing-solidus", "expected-closing-tag-but-got-eof"]],
			["</frameset>x", "frameset", ["unexpected-frameset-in-frameset-innerhtml", "unexpected-char-in-frameset"]],
			["<body></body></html>", "html", ["unexpected-end-tag-after-body-innerhtml"]],
		])("parseHtml reports the tree's errors in %j", (source, fragmentContext, codes) => {
			/** @type {string[]} */
			const reported = [];
			parseHtmlRefs(/** @type {string} */ (source), 0, {
				fragmentContext: /** @type {string | undefined} */ (fragmentContext),
				parseError: (input, code) => {
					reported.push(code);
				}
			});
			expect(reported).toEqual(codes);
		});

		it("parseHtml leaves out errors in an XML entity's replacement text", () => {
			const parseError = jest.fn();
			parseHtmlRefs(
				'<!DOCTYPE root [<!ENTITY value "<child">]><root>&value;</root>',
				0,
				{ xml: true, parseError }
			);
			expect(parseError).not.toHaveBeenCalled();
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
			// Regression: a decimal numeric reference consumes only `[0-9]+`, so
			// `&#65b` decodes to `A` and leaves `b` as text. The earlier regexp
			// matched `[0-9a-fA-F]+` for both bases and swallowed the `b`.
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
			// Regression: from a plain object literal `HTML_ENTITIES["toString"]`
			// returns `Object.prototype.toString` and the lookup reads the entity as
			// matched. The generated table has a null prototype, so it does not.
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
});

// Fused state transitions: the tokenizer runs fully predictable follow-up arcs
// inline. Each case drives one fused branch and its EOF edge, expecting the
// exact spec token and error stream.
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
				if (qt !== Quote.None) return ve + 1;
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

	// The spec reads a truncated end tag in raw text as text: no parse error.
	it("script end-tag name truncated", () => {
		expect(walk("<script>x</scr")).toEqual([
			["open", "script", false],
			["text", "x"],
			["close", "scr"]
		]);
	});

	it("rcdata end-tag name truncated", () => {
		expect(walk("<title>x</tit")).toEqual([
			["open", "title", false],
			["text", "x"],
			["close", "tit"]
		]);
	});

	it("rawtext end-tag name truncated", () => {
		expect(walk("<style>x</sty")).toEqual([
			["open", "style", false],
			["text", "x"],
			["close", "sty"]
		]);
	});

	it("script-escaped end-tag name truncated", () => {
		expect(walk("<script><!--x</scr")).toEqual([
			["open", "script", false],
			["error", "eof-in-script-html-comment-like-text", 18, 18, "error"],
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

describe("token parts reported by the tokenizer", () => {
	/**
	 * @param {string} source HTML
	 * @returns {{ name: (string | null), publicId: (string | null), systemId: (string | null) }} the parsed doctype
	 */
	const doctypeOf = (source) => {
		for (const child of childrenOf(parseHtmlRefs(source))) {
			if (A.type(child) === NodeType.Doctype) {
				return {
					name: A.name(child),
					publicId: A.textOf(Part.publicId, child),
					systemId: A.textOf(Part.systemId, child)
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
		 * @param {import("../../../lib/html/syntax-parser").HtmlNodeRef} node node
		 */
		const walk = (node) => {
			if (A.type(node) === NodeType.Comment) out.push(A.value(node));
			for (const child of childrenOf(node)) walk(child);
		};
		for (const child of childrenOf(parseHtmlRefs(source))) walk(child);
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
	 * @param {import("../../../lib/html/syntax-parser").HtmlTokenCallbacks=} extra extra callbacks
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
	 * @param {import("../../../lib/html/syntax-parser").HtmlTokenCallbacks=} extra extra callbacks
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

	it("seeds a `noscript` context from the scripting flag", () => {
		expect(
			walk("<b>x</b></noscript>", {
				fragmentContext: "noscript",
				scripting: true
			})
		).toEqual([
			["text", "<b>x</b>"],
			["close", "noscript"]
		]);
		expect(walk("<b>x</b>", { fragmentContext: "noscript" })).toEqual([
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

		it("reports and replaces NUL characters", () => {
			const source = `<svg><![CDATA[a${NUL}b${NUL}c]]></svg>`;
			expect(errorsOf(source, foreign)).toEqual([
				{
					code: "unexpected-null-character",
					slice: NUL,
					severity: "warning"
				},
				{
					code: "unexpected-null-character",
					slice: NUL,
					severity: "warning"
				}
			]);
			const svg = body(source)[0];
			expect(/** @type {MatText} */ (svg.children[0]).data).toBe("a�b�c");
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

	it("reports every NUL of a single-quoted attribute value", () => {
		expect(errorsOf(`<a x='${NUL}b${NUL}c'>`)).toEqual([
			{ code: "unexpected-null-character", slice: NUL, severity: "warning" },
			{ code: "unexpected-null-character", slice: NUL, severity: "warning" }
		]);
	});

	it("seeds RCDATA from a `textarea` fragment context", () => {
		expect(walk("<b></b></textarea>", { fragmentContext: "textarea" })).toEqual(
			[
				["text", "<b></b>"],
				["close", "textarea"]
			]
		);
	});

	it("switches to RAWTEXT after `xmp` and `noframes` start tags", () => {
		expect(walk("<xmp><b></xmp>")).toEqual([
			["open", "xmp"],
			["text", "<b>"],
			["close", "xmp"]
		]);
		expect(walk("<noframes><b></noframes>")).toEqual([
			["open", "noframes"],
			["text", "<b>"],
			["close", "noframes"]
		]);
	});

	it("switches the content mode after a self-closing start tag as well", () => {
		// None of these elements is void, so the tree builder ignores the `/`
		// and switches the tokenizer as it would for `<title>` (§13.2.6.4.4).
		expect(walk("<title/><b></title><style/><b></style>")).toEqual([
			["open", "title"],
			["text", "<b>"],
			["close", "title"],
			["open", "style"],
			["text", "<b>"],
			["close", "style"]
		]);
		// Unless the tree builder vetoes it, as foreign content does.
		expect(walk("<title/><b>", { vetoesContentMode: () => true })).toEqual([
			["open", "title"],
			["open", "b"]
		]);
	});

	it("keeps the data state after tags sharing a content-mode tag's length", () => {
		// `section`, `fieldset` and `my-widget` have the lengths of `noembed`,
		// `textarea` and `plaintext` but none of their content modes.
		for (const name of ["section", "fieldset", "my-widget"]) {
			expect(walk(`<${name}><b></b></${name}>`)).toEqual([
				["open", name],
				["open", "b"],
				["close", "b"],
				["close", name]
			]);
		}
		expect(walk("<fieldset><b></b></fieldset>", { scripting: true })).toEqual([
			["open", "fieldset"],
			["open", "b"],
			["close", "b"],
			["close", "fieldset"]
		]);
	});

	it("reads a `noscript` start tag as RAWTEXT only with scripting on", () => {
		expect(walk("<noscript><b></b></noscript>", { scripting: true })).toEqual([
			["open", "noscript"],
			["text", "<b></b>"],
			["close", "noscript"]
		]);
		expect(walk("<noscript><b></b></noscript>")).toEqual([
			["open", "noscript"],
			["open", "b"],
			["close", "b"],
			["close", "noscript"]
		]);
	});

	it("stays in the data state when `vetoesContentMode` vetoes the switch", () => {
		/** @type {string[]} */
		const asked = [];
		const vetoesContentMode = (/** @type {string} */ name) => {
			asked.push(name);
			return true;
		};
		expect(walk("<TITLE><b></b></TITLE>", { vetoesContentMode })).toEqual([
			["open", "TITLE"],
			["open", "b"],
			["close", "b"],
			["close", "TITLE"]
		]);
		// A fragment context the tree builder vetoes starts in data, too.
		expect(
			walk("<b></b>", { fragmentContext: "title", vetoesContentMode })
		).toEqual([
			["open", "b"],
			["close", "b"]
		]);
		// The veto is asked with the lowercased name, and only for content-mode tags.
		expect(asked).toEqual(["title", "title"]);
	});

	it("reports NULs in RCDATA, RAWTEXT, script data and PLAINTEXT", () => {
		const nul = {
			code: "unexpected-null-character",
			slice: NUL,
			severity: "warning"
		};
		// A reference and a NUL after ordinary text: each stop rescans for the next.
		expect(walk(`<title>a&amp;b${NUL}c</title>`)).toEqual([
			["open", "title"],
			["text", `a&amp;b${NUL}c`],
			["close", "title"]
		]);
		expect(errorsOf(`<title>a&amp;b${NUL}c</title>`)).toEqual([nul]);
		for (const name of ["style", "script"]) {
			expect(walk(`<${name}>a${NUL}b</${name}>`)).toEqual([
				["open", name],
				["text", `a${NUL}b`],
				["close", name]
			]);
			expect(errorsOf(`<${name}>a${NUL}b</${name}>`)).toEqual([nul]);
		}
		// Script data escaped state, entered by `<!--`.
		expect(walk(`<script><!-- a${NUL}b --></script>`)).toEqual([
			["open", "script"],
			["text", `<!-- a${NUL}b -->`],
			["close", "script"]
		]);
		expect(errorsOf(`<script><!-- a${NUL}b --></script>`)).toEqual([nul]);
		expect(walk(`<plaintext>a${NUL}b`)).toEqual([
			["open", "plaintext"],
			["text", `a${NUL}b`]
		]);
		expect(errorsOf(`<plaintext>a${NUL}b`)).toEqual([nul]);
	});

	it("flags numeric references far past U+10FFFF as outside the Unicode range", () => {
		// The code stops accumulating past the range, so long digit runs cannot overflow.
		for (const ref of ["&#x110000000;", "&#99999999999;"]) {
			expect(walk(ref)).toEqual([["text", ref]]);
			expect(errorsOf(ref)).toEqual([
				{
					code: "character-reference-outside-unicode-range",
					slice: ref,
					severity: "warning"
				}
			]);
		}
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
