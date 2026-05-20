"use strict";

// cspell:ignore apos notpre Elig reconsumes xyzabc zzzunknown codepoint

const fs = require("fs");
const path = require("path");
const walkHtmlTokens = require("../lib/html/walkHtmlTokens");

describe("walkHtmlTokens", () => {
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
			const results = [];

			walkHtmlTokens(code, 0, {
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
					if (quoteType === walkHtmlTokens.QUOTE_DOUBLE) {
						return valueEnd + 1;
					}
					if (quoteType === walkHtmlTokens.QUOTE_SINGLE) {
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
			const reconstructed = [];
			walkHtmlTokens(code, 0, {
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
		const results = [];
		walkHtmlTokens("", 0, {
			text: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual([]);
	});

	it("should handle plain text with no tags", () => {
		const results = [];
		walkHtmlTokens("hello world", 0, {
			text: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual(["hello world"]);
	});

	it("should detect self-closing tags", () => {
		const tags = [];
		walkHtmlTokens("<br/><img src='x'/>", 0, {
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
		const attrs = [];
		walkHtmlTokens('<input disabled required type="text">', 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([
					input.slice(ns, ne),
					vs === -1 ? null : input.slice(vs, ve)
				]);
				if (vs === -1) return ne;
				if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
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
		const attrs = [];
		walkHtmlTokens("<div a=\"1\" b='2' c=3>", 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve), qt]);
				if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([
			["a", "1", walkHtmlTokens.QUOTE_DOUBLE],
			["b", "2", walkHtmlTokens.QUOTE_SINGLE],
			["c", "3", walkHtmlTokens.QUOTE_NONE]
		]);
	});

	it("should parse comments", () => {
		const comments = [];
		walkHtmlTokens("before<!-- hi -->after", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<!-- hi -->"]);
	});

	it("should handle lone < at EOF", () => {
		const texts = [];
		walkHtmlTokens("hello<", 0, {
			text: (input, start, end) => {
				texts.push(input.slice(start, end));
				return end;
			}
		});
		expect(texts).toEqual(["hello<"]);
	});

	it("should parse DOCTYPE as doctype", () => {
		const results = [];
		walkHtmlTokens("<!DOCTYPE html><div>hi</div>", 0, {
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
		const results = [];
		walkHtmlTokens("<!doctype html><!DoCtYpE html>", 0, {
			doctype: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual(["<!doctype html>", "<!DoCtYpE html>"]);
	});

	it("should handle CDATA sections", () => {
		const results = [];
		walkHtmlTokens("<div><![CDATA[<img src='x'>]]></div>", 0, {
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
		const comments = [];
		walkHtmlTokens("<![CDATA[a]b]]c]]>", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<![CDATA[a]b]]c]]>"]);
	});

	it("should handle nested <!-- inside comments", () => {
		const comments = [];
		walkHtmlTokens("<!-- outer <!-- inner -->", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<!-- outer <!-- inner -->"]);
	});

	it("should handle EOF in DOCTYPE", () => {
		const results = [];
		walkHtmlTokens("<!DOCTYPE html", 0, {
			doctype: (input, start, end) => {
				results.push(input.slice(start, end));
				return end;
			}
		});
		expect(results).toEqual(["<!DOCTYPE html"]);
	});

	it("should handle EOF in CDATA", () => {
		const comments = [];
		walkHtmlTokens("<![CDATA[unclosed", 0, {
			comment: (input, start, end) => {
				comments.push(input.slice(start, end));
				return end;
			}
		});
		expect(comments).toEqual(["<![CDATA[unclosed"]);
	});

	it("should roundtrip DOCTYPE + tags + CDATA", () => {
		const html = "<!DOCTYPE html><html><body><![CDATA[data]]></body></html>";
		const parts = [];
		walkHtmlTokens(html, 0, {
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
		const results = [];
		walkHtmlTokens("<title>Hello <b>World</b></title>", 0, {
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
		const results = [];
		walkHtmlTokens("<textarea><p>not a tag</p></textarea>", 0, {
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
		const results = [];
		walkHtmlTokens("<style>.a { color: red; }</style>", 0, {
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

	it("should handle script data state", () => {
		const results = [];
		walkHtmlTokens("<script>var x = 1 < 2;</script>", 0, {
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
		const results = [];
		walkHtmlTokens("<script><!--- comment --></script>", 0, {
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
		const results = [];
		walkHtmlTokens(
			"<script><!-- <script> var x = 1; </script> --></script>",
			0,
			{
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
			}
		);
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
		const results = [];
		walkHtmlTokens(html, 0, {
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
		const results = [];
		walkHtmlTokens(html, 0, {
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
		const results = [];
		walkHtmlTokens("<title>text</div></title>", 0, {
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
		const results = [];
		walkHtmlTokens("<style>.a{}</STYLE>", 0, {
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
		const parts = [];
		walkHtmlTokens(html, 0, {
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
		const results = [];
		walkHtmlTokens("<div><plaintext><p>ignored</p></div>", 0, {
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
		const parts = [];
		const html = "<p>Tom &amp; Jerry</p>";
		walkHtmlTokens(html, 0, {
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
		const attrs = [];
		walkHtmlTokens('<a href="?a=1&amp;b=2">', 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve)]);
				if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([["href", "?a=1&amp;b=2"]]);
	});

	it("should handle named character references in single-quoted attributes", () => {
		const attrs = [];
		walkHtmlTokens("<a href='?x=1&lt;2'>", 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve)]);
				if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([["href", "?x=1&lt;2"]]);
	});

	it("should handle character references in unquoted attributes", () => {
		const attrs = [];
		walkHtmlTokens("<a href=foo&amp;bar>", 0, {
			attribute: (input, ns, ne, vs, ve, qt) => {
				attrs.push([input.slice(ns, ne), input.slice(vs, ve)]);
				if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
				return ve;
			}
		});
		expect(attrs).toEqual([["href", "foo&amp;bar"]]);
	});

	it("should handle decimal numeric character references", () => {
		const parts = [];
		const html = "<p>&#65;&#66;&#67;</p>";
		walkHtmlTokens(html, 0, {
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
		const parts = [];
		const html = "<p>&#x41;&#X42;</p>";
		walkHtmlTokens(html, 0, {
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
		const parts = [];
		const html = "<p>bare & alone</p>";
		walkHtmlTokens(html, 0, {
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
		const parts = [];
		const html = "<p>&unknown;</p>";
		walkHtmlTokens(html, 0, {
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
		const parts = [];
		const html = "<p>&#;&#x;</p>";
		walkHtmlTokens(html, 0, {
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
			const out = [];
			walkHtmlTokens(html, 0, {
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
					if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
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
			const parts = [];
			walkHtmlTokens(html, 0, {
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
				["attr", "=foo", null, walkHtmlTokens.QUOTE_NONE],
				["open", "a", false]
			]);
		});

		// --- STATE_AFTER_ATTRIBUTE_NAME ---
		it("aFTER_ATTR_NAME: space then `/` self-closes", () => {
			expect(walk("<br foo />")).toEqual([
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
				["open", "br", true]
			]);
		});

		it("aFTER_ATTR_NAME: space then `=` switches to BEFORE_ATTR_VALUE", () => {
			expect(walk("<a foo = 'bar'>")).toEqual([
				["attr", "foo", "bar", walkHtmlTokens.QUOTE_SINGLE],
				["open", "a", false]
			]);
		});

		it("aFTER_ATTR_NAME: `>` closing on a close tag form `</a foo >`", () => {
			expect(walk("<a></a foo >")).toEqual([
				["open", "a", false],
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
				["close", "a"]
			]);
		});

		it("aFTER_ATTR_NAME: new attribute begins after whitespace", () => {
			expect(walk("<a foo bar>")).toEqual([
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
				["attr", "bar", null, walkHtmlTokens.QUOTE_NONE],
				["open", "a", false]
			]);
		});

		// --- STATE_BEFORE_ATTRIBUTE_VALUE ---
		it("bEFORE_ATTR_VALUE: leading whitespace before value is ignored", () => {
			expect(walk("<a foo=   'bar'>")).toEqual([
				["attr", "foo", "bar", walkHtmlTokens.QUOTE_SINGLE],
				["open", "a", false]
			]);
		});

		it("bEFORE_ATTR_VALUE: `>` after `=` emits attribute with empty value", () => {
			// Per spec, `<a foo=>` is a missing-attribute-value parse error and
			// `foo` is created with the empty string. The walker reports an empty
			// value range pointing at `>`.
			expect(walk("<a foo=>")).toEqual([
				["attr", "foo", "", walkHtmlTokens.QUOTE_NONE],
				["open", "a", false]
			]);
		});

		it("bEFORE_ATTR_VALUE: `>` after `=` on close tag form", () => {
			expect(walk("<a></a foo=>")).toEqual([
				["open", "a", false],
				["attr", "foo", "", walkHtmlTokens.QUOTE_NONE],
				["close", "a"]
			]);
		});

		// --- STATE_ATTRIBUTE_VALUE_UNQUOTED ---
		it("aTTR_VALUE_UNQUOTED: space terminates value", () => {
			expect(walk("<a foo=bar baz>")).toEqual([
				["attr", "foo", "bar", walkHtmlTokens.QUOTE_NONE],
				["attr", "baz", null, walkHtmlTokens.QUOTE_NONE],
				["open", "a", false]
			]);
		});

		it("aTTR_VALUE_UNQUOTED: `>` on close tag form", () => {
			expect(walk("<a></a foo=bar>")).toEqual([
				["open", "a", false],
				["attr", "foo", "bar", walkHtmlTokens.QUOTE_NONE],
				["close", "a"]
			]);
		});

		// --- STATE_AFTER_ATTRIBUTE_VALUE_QUOTED ---
		it("aFTER_ATTR_VALUE_QUOTED: `/` self-closes", () => {
			expect(walk('<br foo="bar"/>')).toEqual([
				["attr", "foo", "bar", walkHtmlTokens.QUOTE_DOUBLE],
				["open", "br", true]
			]);
		});

		it("aFTER_ATTR_VALUE_QUOTED: `>` on close tag form", () => {
			expect(walk('<a></a foo="bar">')).toEqual([
				["open", "a", false],
				["attr", "foo", "bar", walkHtmlTokens.QUOTE_DOUBLE],
				["close", "a"]
			]);
		});

		it("aFTER_ATTR_VALUE_QUOTED: anything else reconsumes (missing-whitespace)", () => {
			expect(walk('<a foo="x"bar>')).toEqual([
				["attr", "foo", "x", walkHtmlTokens.QUOTE_DOUBLE],
				["attr", "bar", null, walkHtmlTokens.QUOTE_NONE],
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
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
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
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
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
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
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
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
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
				["attr", "foo", null, walkHtmlTokens.QUOTE_NONE],
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
			expect(() => walkHtmlTokens("<a>hello</a>")).not.toThrow();
		});

		it("missing closeTag/comment/doctype callbacks are tolerated", () => {
			// Each branch checks `callbacks.X !== undefined`; exercise the false
			// side by walking a document that would produce those tokens but
			// passing only `openTag` / `text`.
			const opens = [];
			expect(() =>
				walkHtmlTokens("<!DOCTYPE html><!-- c --><a>x</a><![CDATA[ y ]]>", 0, {
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
				walkHtmlTokens(
					"<!DOCTYPE html><!-- c --><a>x</a><![CDATA[ y ]]>z",
					0,
					{}
				)
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
				expect(() => walkHtmlTokens(html, 0, {})).not.toThrow();
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
				expect(() => walkHtmlTokens(html, 0, {})).not.toThrow();
			}
		});

		// --- NAMED_CHARACTER_REFERENCE safety cap on very long entities ---
		it("nAMED_CHARACTER_REFERENCE: caps consumption at 33 chars", () => {
			// Entity names in the WHATWG table are at most ~33 chars; the
			// scanner has a safety cap that breaks out of the consume loop
			// past 33 alphanumeric chars even without a closing semicolon.
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
				(label) =>
				(
					input,
					start,
					end,
					/** @type {number} */ ns,
					/** @type {number} */ ne
				) => {
					out.push([label, input.slice(ns, ne)]);
					// Skip one character past `>` so nextPos > end.
					return end + 1;
				};
			walkHtmlTokens(
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
						if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
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
			walkHtmlTokens(html, 0, {
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

		it("reports eof-in-tag as an error and emits the partial open tag", () => {
			/** @type {{ code: string, severity: string }[]} */
			const errors = [];
			/** @type {string[]} */
			const opens = [];
			walkHtmlTokens('<div class="x', 0, {
				openTag: (input, start, end, ns, ne) => {
					opens.push(input.slice(ns, ne));
					return end;
				},
				attribute: (input, ns, ne, vs, ve, qt) => {
					if (vs === -1) return ne;
					if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
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
			walkHtmlTokens("<a></a", 0, {
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
			walkHtmlTokens("<div data-x", 0, {
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
			walkHtmlTokens('<a href="x&amp', 0, {
				openTag: (input, start, end, ns, ne) => {
					opens.push(input.slice(ns, ne));
					return end;
				},
				attribute: (input, ns, ne, vs, ve, qt) => {
					if (vs === -1) return ne;
					if (qt !== walkHtmlTokens.QUOTE_NONE) return ve + 1;
					return ve;
				},
				parseError: (input, code) => codes.push(code)
			});
			expect(codes).toEqual(["eof-in-tag"]);
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
			walkHtmlTokens("<!x", 0, {
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

		it("does not report any error for well-formed HTML", () => {
			expect(
				collectErrors("<!DOCTYPE html><html><body>hi</body></html>")
			).toEqual([]);
		});
	});

	describe("decodeHtmlEntities", () => {
		it("should decode core named entities", () => {
			expect(
				walkHtmlTokens.decodeHtmlEntities("&amp;&lt;&gt;&quot;&apos;&nbsp;")
			).toBe("&<>\"'\u00A0");
		});

		it("should decode legacy named entities without trailing semicolon", () => {
			// `&AMP` and `&copy` are legacy bare-form entities in the WHATWG
			// named character references table.
			expect(walkHtmlTokens.decodeHtmlEntities("&AMP")).toBe("&");
			expect(walkHtmlTokens.decodeHtmlEntities("&copy")).toBe("\u00A9");
		});

		it("should decode entities outside the BMP and multi-codepoint entities", () => {
			expect(walkHtmlTokens.decodeHtmlEntities("&AElig;")).toBe("\u00C6");
			// `&NotEqualTilde;` is a multi-codepoint named reference (\u2242 + combining slash).
			expect(walkHtmlTokens.decodeHtmlEntities("&NotEqualTilde;")).toBe(
				"\u2242\u0338"
			);
		});

		it("should apply longest-prefix backtrack per WHATWG", () => {
			// `&notpre;` is not in the table, but `&not` is \u2014 the prefix matches
			// and the remainder `pre;` is left as literal text.
			expect(walkHtmlTokens.decodeHtmlEntities("&notpre;")).toBe("\u00ACpre;");
		});

		it("should decode numeric decimal references", () => {
			expect(walkHtmlTokens.decodeHtmlEntities("&#65;&#66;&#67;")).toBe("ABC");
		});

		it("should decode numeric references without trailing semicolon", () => {
			expect(walkHtmlTokens.decodeHtmlEntities("&#65")).toBe("A");
			expect(walkHtmlTokens.decodeHtmlEntities("&#x41")).toBe("A");
		});

		it("should decode numeric hexadecimal references", () => {
			expect(walkHtmlTokens.decodeHtmlEntities("&#x41;&#x42;&#x43;")).toBe(
				"ABC"
			);
			expect(walkHtmlTokens.decodeHtmlEntities("&#X41;&#X42;&#X43;")).toBe(
				"ABC"
			);
		});

		it("should leave unknown or incomplete entities as literals", () => {
			expect(walkHtmlTokens.decodeHtmlEntities("&zzzunknown;")).toBe(
				"&zzzunknown;"
			);
			expect(walkHtmlTokens.decodeHtmlEntities("&#;")).toBe("&#;");
			expect(walkHtmlTokens.decodeHtmlEntities("&#x;")).toBe("&#x;");
			expect(walkHtmlTokens.decodeHtmlEntities("bare & alone")).toBe(
				"bare & alone"
			);
		});

		it("should handle mixed text and entities", () => {
			expect(
				walkHtmlTokens.decodeHtmlEntities("foo &amp; bar &#x41; baz")
			).toBe("foo & bar A baz");
		});

		it("should fast-path strings with no `&`", () => {
			expect(walkHtmlTokens.decodeHtmlEntities("plain text")).toBe(
				"plain text"
			);
		});

		it("should replace numeric references above U+10FFFF with U+FFFD", () => {
			expect(walkHtmlTokens.decodeHtmlEntities("&#x110000;")).toBe("�");
			expect(walkHtmlTokens.decodeHtmlEntities("&#1114112;")).toBe("�");
		});
	});
});
