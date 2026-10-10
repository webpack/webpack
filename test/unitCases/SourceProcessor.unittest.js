"use strict";

const { SourceProcessor: CssSourceProcessor } = require("../../lib/css/syntax");
const {
	Field: CssField,
	Flag: CssFlag,
	NodeType: CssNodeType,
	Part: CssPart,
	_blockTokenOf
} = require("../../lib/css/syntax-parser");
const { SourceProcessor: HtmlSourceProcessor } = require("../../lib/html/syntax");
const {
	Field: HtmlField,
	Flag: HtmlFlag,
	NodeType: HtmlNodeType,
	Part: HtmlPart
} = require("../../lib/html/syntax-parser");
const GenericSourceProcessor = require("../../lib/util/SourceProcessor");
const { PrintContext } = require("../../lib/util/SourceProcessor");

const CSS = "a {\n\tcolor : #ff0000 ;\n}\n";
const HTML = "<div   class='a'  >\n  <p>x</p>\n</div>\n";

/** @typedef {{ mode?: "minify" | "beautify", source?: string, content?: string }} PrintAsk */

/** @type {[string, EXPECTED_ANY, string][]} name, processor, source */
const LANGUAGES = [
	["css", CssSourceProcessor, CSS],
	["html", HtmlSourceProcessor, HTML]
];

describe("SourceProcessor", () => {
	it("reuses the caller's print options", () => {
		const options = { mode: /** @type {const} */ ("minify") };
		let received;
		const processor = new GenericSourceProcessor(
			(input, visitors, writer) =>
				/** @type {InstanceType<typeof PrintContext>} */ (writer).printPiece(
					null
				),
			(path, writer) => {
				received = writer.options;
				return "";
			}
		);

		processor.process("", options);
		expect(received).toBe(options);
	});

	it("shares the empty mapping column when source maps are not requested", () => {
		const first = new PrintContext({ mode: "minify" }, () => "");
		const second = new PrintContext({ mode: "minify" }, () => "");
		const mapped = new PrintContext(
			{ mode: "minify", source: "input.css" },
			() => ""
		);

		expect(first._mappings).toBe(second._mappings);
		expect(mapped._mappings).not.toBe(first._mappings);
	});

	// A language whose printer is a module of its own hands one of these over
	// instead of the printer, so a walk that never prints never loads it.
	describe("deferred printer", () => {
		/**
		 * @returns {{ processor: EXPECTED_ANY, loads: () => number }} a processor that counts what it was asked for
		 */
		const counting = () => {
			let loads = 0;
			const processor = new GenericSourceProcessor(
				() => {},
				undefined,
				() => {
					loads++;
					return () => "";
				}
			);
			return { processor, loads: () => loads };
		};

		it("is not asked for by a walk", () => {
			const { processor, loads } = counting();
			expect(processor.process("x")).toBeUndefined();
			expect(loads()).toBe(0);
		});

		it("is asked for once, by the first print", () => {
			const { processor, loads } = counting();
			processor.process("x");
			processor.process("x", { mode: "minify" });
			expect(loads()).toBe(1);
		});

		it("is reused by every print after it", () => {
			const { processor, loads } = counting();
			processor.process("x", { mode: "minify" });
			const first = processor._printer;
			processor.process("x", { mode: "beautify" });
			expect(loads()).toBe(1);
			expect(processor._printer).toBe(first);
		});

		it("stays out of a processor that was handed its printer", () => {
			const printer = () => "";
			let loads = 0;
			const processor = new GenericSourceProcessor(() => {}, printer, () => {
				loads++;
				return () => "";
			});
			processor.process("x", { mode: "minify" });
			expect(processor._printer).toBe(printer);
			expect(loads).toBe(0);
		});
	});

	// Dropping the store has to let go of the text, not just stop answering for
	// it: a stylesheet prints ~300k nodes, which is the output over again.
	describe("printed-text store", () => {
		/**
		 * @param {InstanceType<typeof PrintContext>} context print context
		 * @returns {number} characters the store still holds
		 */
		const held = (context) => {
			let chars = 0;
			for (let i = 0; i < context._storeText.length; i++) {
				chars += context._storeText[i].length;
			}
			return chars;
		};

		it("lets go of the text when the epoch moves", () => {
			const context = new PrintContext({ mode: "minify" }, () =>
				"x".repeat(64)
			);
			for (let node = 0; node < 500; node++) context.printNode(node, null);
			expect(held(context)).toBe(500 * 64);
			context.dropStore();
			expect(held(context)).toBe(0);
		});

		it("holds only what was printed since the last drop", () => {
			const context = new PrintContext({ mode: "minify" }, () => "y".repeat(8));
			for (let node = 0; node < 300; node++) {
				context.printNode(node, null);
				if (node % 10 === 9) context.dropStore();
			}
			expect(held(context)).toBe(0);
			context.printNode(300, null);
			expect(held(context)).toBe(8);
		});

		it("lets go of the text when a node is taken", () => {
			const context = new PrintContext({ mode: "minify" }, () =>
				"t".repeat(16)
			);
			context.printNode(1, null);
			expect(held(context)).toBe(16);
			context.take(1);
			expect(held(context)).toBe(0);
		});

		it("lets go of the text when a retractable node is taken", () => {
			const context = new PrintContext({ mode: "minify" }, () =>
				"r".repeat(16)
			);
			context.printNode(1, null);
			expect(held(context)).toBe(16);
			context.takeRetractable(1);
			expect(held(context)).toBe(0);
		});

		it("answers for a node printed since the drop, and no earlier one", () => {
			const context = new PrintContext({ mode: "minify" }, () => "z");
			context.printNode(1, null);
			expect(context.get(1)).toBe("z");
			context.dropStore();
			expect(context.get(1)).toBeUndefined();
			context.printNode(2, null);
			expect(context.get(2)).toBe("z");
			expect(context.get(1)).toBeUndefined();
		});
	});

	// `mode` is the only thing that names the output, and it resolves in the
	// shared processor — so both languages bound to it must agree.
	describe("mode", () => {
		for (const [language, Processor, source] of LANGUAGES) {
			describe(language, () => {
				it("walks without printing when none is asked for", () => {
					expect(new Processor().process(source)).toBeUndefined();
					expect(new Processor().process(source, {})).toBeUndefined();
					// `minimize` used to be a second way to ask; `mode` is the only one.
					expect(
						new Processor().process(source, {
							minimize: true
						})
					).toBeUndefined();
				});

				it("prints for each mode it names", () => {
					for (const mode of ["minify", "beautify"]) {
						expect(typeof new Processor().process(source, { mode }).code).toBe(
							"string"
						);
					}
				});

				it("minifies to something shorter than it beautifies", () => {
					const minified = new Processor().process(source, {
						mode: "minify"
					}).code;
					const beautified = new Processor().process(source, {
						mode: "beautify"
					}).code;
					expect(minified).not.toBe(beautified);
					expect(minified.length).toBeLessThanOrEqual(beautified.length);
				});

				it("prints what it already printed unchanged, in either mode", () => {
					for (const mode of ["minify", "beautify"]) {
						const once = new Processor().process(source, { mode }).code;
						const twice = new Processor().process(once, { mode }).code;
						expect(twice).toBe(once);
					}
				});

				it("carries no state between calls", () => {
					const processor = new Processor();
					const first = processor.process(source, { mode: "minify" }).code;
					processor.process("", { mode: "minify" });
					processor.process(source, { mode: "beautify" });
					expect(processor.process(source, { mode: "minify" }).code).toBe(
						first
					);
				});
			});
		}

		it("answers alike in every language", () => {
			/** @type {PrintAsk[]} */
			const asks = [{}, { mode: "minify" }, { mode: "beautify" }];
			for (const ask of asks) {
				const printed = LANGUAGES.map(
					([, Processor, source]) =>
						new Processor().process(source, ask) !== undefined
				);
				expect(printed[0]).toBe(printed[1]);
			}
		});
	});

	// A map is built only for a caller that named the input, since building one
	// walks the whole output — an inline `style=""` asks for none.
	describe("source map", () => {
		for (const [language, Processor, source] of LANGUAGES) {
			describe(language, () => {
				it("is absent when the input is not named", () => {
					expect(
						new Processor().process(source, { mode: "minify" }).map
					).toBeUndefined();
				});

				it("is a version 3 map naming the input when it is", () => {
					const { map } = new Processor().process(source, {
						mode: "minify",
						source: "in.txt"
					});
					expect(map.version).toBe(3);
					expect(map.file).toBe("in.txt");
					expect(map.sources).toEqual(["in.txt"]);
					expect(typeof map.mappings).toBe("string");
					expect(map.sourcesContent).toBeUndefined();
				});

				it("carries the input's text only when it is given", () => {
					const { map } = new Processor().process(source, {
						mode: "minify",
						source: "in.txt",
						content: source
					});
					expect(map.sourcesContent).toEqual([source]);
				});

				it("prints the same output whether or not a map is asked for", () => {
					expect(
						new Processor().process(source, {
							mode: "minify",
							source: "in.txt"
						}).code
					).toBe(new Processor().process(source, { mode: "minify" }).code);
				});
			});
		}

		// The map is walked over the flat output, so a piece the print took back
		// takes its mapping with it and a newline still opens a generated line.
		describe("over the flat output", () => {
			// cspell:ignore CAIA

			// The first declaration is the one the second overrides, so minifying
			// retracts the piece it was written into.
			const SOURCE =
				"a {\n  color : red ;\n  color : blue ;\n}\nb {\n  color : lime ;\n}\n";

			/**
			 * @param {"minify" | "beautify"} mode how to print
			 * @returns {{ code: string, mappings: string }} output and its mappings
			 */
			const printed = (mode) => {
				const { code, map } = new CssSourceProcessor().process(SOURCE, {
					mode,
					source: "in.css",
					content: SOURCE
				});
				return { code, mappings: map.mappings };
			};

			it("drops the mapping of a piece the print took back", () => {
				// Two mappings, not three: the anchor written with `color:red` is gone,
				// and `b` still maps to its own line rather than to the dropped one.
				expect(printed("minify")).toEqual({
					code: "a{color:blue}b{color:lime}",
					mappings: "AAAA,aAIA"
				});
			});

			it("counts a generated line for each newline the output holds", () => {
				// `;;;` is the three line breaks before `b`, found in the flat output
				// rather than in the pieces it was built from.
				expect(printed("beautify")).toEqual({
					code: "a {\ncolor: red;\ncolor: blue;\n}b {\ncolor: lime;\n}",
					mappings: "AAAA;;;CAIA"
				});
			});
		});

		// A prefixed rule an unprefixed twin makes dead weight is taken back after
		// it was written, so the mapping anchored to it has to go with it.
		it("css anchors nothing at a rule the prefix pass took back", () => {
			const ask = {
				mode: /** @type {"minify"} */ ("minify"),
				source: "in.css",
				environment: { browsers: ["chrome 120"] }
			};
			const dropped = new CssSourceProcessor().process(
				"@-webkit-keyframes a{from{opacity:0}}\n@keyframes a{from{opacity:0}}\n",
				ask
			);
			// The same stylesheet with the twin never written, so the surviving rule
			// stands on the same source line: both must map alike.
			const alone = new CssSourceProcessor().process(
				"\n@keyframes a{from{opacity:0}}\n",
				ask
			);
			expect(dropped.code).toBe(alone.code);
			expect(dropped.map.mappings).toBe(alone.map.mappings);
		});
	});

	describe("node path", () => {
		/**
		 * @param {string} input source
		 * @param {number} offset offset into it
		 * @returns {[number, number]} 1-based line, 0-based column
		 */
		const lineColumn = (input, offset) => {
			const before = input.slice(0, offset).split("\n");
			return [before.length, before[before.length - 1].length];
		};

		/**
		 * Reads a node through `NodePath` members only, as a language-agnostic visitor would.
		 * @param {import("../../lib/util/SourceProcessor").NodePath<EXPECTED_ANY>} path path
		 * @param {string} input the parsed source
		 * @returns {Record<string, unknown>} what a shared visitor sees
		 */
		const describeNode = (path, input) => {
			const [start, end] = path.range();
			const parent = path.parent;
			/** @type {unknown[]} */
			const children = [];
			for (let i = 0, c = path.child(0); c !== 0; c = path.child(++i)) {
				children.push(c);
			}
			return {
				loc: path.loc(),
				expectedLoc: [...lineColumn(input, start), ...lineColumn(input, end)],
				source: path.source(),
				slice: path.source(start, end),
				index: path.index,
				atIndex:
					parent === null ? null : path.child(path.index, parent) === path.node,
				childCount: path.childCount(),
				children
			};
		};

		it("reads html nodes through the shared members", () => {
			const input = "<ul>\n<li>a</li>\n<li>b</li></ul>";
			/** @type {Record<string, unknown>[]} */
			const seen = [];
			/** @type {[number, string][]} each child of the list, and its own first child's type */
			const listChildren = [];
			/** @type {[string, string | null, number | null][]} name, its source, content offset */
			const implied = [];
			new HtmlSourceProcessor()
				.use({
					[HtmlNodeType.Element]: (path) => {
						if (path.name() === "ul") {
							// Reading each child's own children between steps keeps the
							// list's place: the cursor is per parent.
							for (let i = 0; i < path.childCount(); i++) {
								const item = path.child(i);
								const inner = path.child(0, item);
								listChildren.push([
									path.type(item),
									inner === 0 ? "" : path.source(inner)
								]);
							}
							expect(path.child(listChildren.length)).toBe(0);
							expect(path.child(1)).toBe(path.child(1));
							expect(path.type(path.child(0))).toBe(HtmlNodeType.Text);
						}
						if (path.name() === "li") seen.push(describeNode(path, input));
						const name = path.rangeOf(HtmlPart.name);
						const content = path.rangeOf(HtmlPart.content);
						implied.push([
							path.name(),
							name === null ? null : path.source(...name),
							content === null ? null : content[0] - path.range()[0]
						]);
					}
				})
				.process(input);
			expect(listChildren).toEqual([
				[HtmlNodeType.Text, ""],
				[HtmlNodeType.Element, "a"],
				[HtmlNodeType.Text, ""],
				[HtmlNodeType.Element, "b"]
			]);
			expect(implied).toEqual([
				["html", null, null],
				["head", null, null],
				["body", null, null],
				["ul", "ul", 4],
				["li", "li", 4],
				["li", "li", 4]
			]);
			expect(seen).toHaveLength(2);
			for (const node of seen) {
				expect(node.loc).toEqual(node.expectedLoc);
				expect(node.source).toBe(node.slice);
				expect(node.atIndex).toBe(true);
				expect(node.childCount).toBe(1);
				expect(node.children).toHaveLength(1);
			}
			expect(seen.map((node) => node.index)).toEqual([1, 3]);
			expect(seen.map((node) => node.source)).toEqual([
				"<li>a</li>",
				"<li>b</li>"
			]);
			expect(seen[1].loc).toEqual([3, 0, 3, 10]);
		});

		it("reads names and values decoded, and as written through source", () => {
			/** @type {string[]} */
			const css = [];
			new CssSourceProcessor()
				.use(
					[CssNodeType.AtRule, CssNodeType.Declaration, CssNodeType.String],
					(path) => {
						const written =
							path.type() === CssNodeType.String
								? path.source()
								: path.source(.../** @type {[number, number]} */ (path.rangeOf(CssPart.name)));
						css.push(`${path.name()}|${path.value()}|${written}`);
					}
				)
				.process('@m\\65 dia x{a{co\\6cor:red;content:"\\41 b"}}');
			expect(css).toEqual([
				"media||m\\65 dia",
				"color||co\\6cor",
				"content||content",
				'|Ab|"\\41 b"'
			]);
			/** @type {string[]} */
			const html = [];
			new HtmlSourceProcessor()
				.use(
					[
						HtmlNodeType.Doctype,
						HtmlNodeType.Element,
						HtmlNodeType.Text,
						HtmlNodeType.Comment
					],
					(path) => {
						if (path.type() === HtmlNodeType.Element && path.parent !== null) {
							if (path.name() !== "b") return;
						}
						html.push(`${path.name()}|${path.value()}`);
					}
				)
				.process("<!DOCTYPE html><B>a &amp; b</B><!--c-->");
			expect(html).toEqual(["html|", "b|", "|a & b", "|c"]);
		});

		it("reads css numbers as numbers and leaves source exactly as written", () => {
			/** @type {[string, unknown, string, string][]} */
			const seen = [];
			const input = "a{w:1\\70x;p:50%;n:+1.50e1;i:a\u0000b}/* c */z{y:q\\";
			new CssSourceProcessor()
				.use(
					[
						CssNodeType.Dimension,
						CssNodeType.Percentage,
						CssNodeType.Number,
						CssNodeType.Ident,
						CssNodeType.Comment
					],
					(path) => {
						seen.push([
							path.source(),
							path.value(),
							path.type() === CssNodeType.Dimension ? path.name() : "",
							path.source(path.range()[0], path.range()[1])
						]);
					}
				)
				.process(input);
			expect(seen).toEqual([
				["a", "a", "", "a"],
				["1\\70x", 1, "px", "1\\70x"],
				["50%", 50, "", "50%"],
				["+1.50e1", 15, "", "+1.50e1"],
				["a\u0000b", "a\uFFFDb", "", "a\u0000b"],
				["/* c */", " c ", "", "/* c */"],
				["z", "z", "", "z"],
				["q\\", "q\uFFFD", "", "q\\"]
			]);
		});

		it("reads every part of a node as a [start, end] range", () => {
			const css = "@media x{a{b:url(c)}}@import 'd';";
			/** @type {Record<string, unknown>[]} */
			const cssSeen = [];
			new CssSourceProcessor()
				.use([CssNodeType.AtRule, CssNodeType.Url], (path) => {
					/**
					 * @param {[number, number] | null} range range
					 * @returns {string | null} what it covers
					 */
					const text = (range) => (range === null ? null : path.source(...range));
					cssSeen.push({
						source: path.source(...path.range()),
						name: text(path.rangeOf(CssPart.name)),
						value: text(path.rangeOf(CssPart.value)),
						block: text(path.rangeOf(CssPart.block)),
						rules: path.fieldCount(CssField.rules)
					});
				})
				.process(css);
			expect(cssSeen).toEqual([
				{ source: "@media x{a{b:url(c)}}", name: "media", value: null, block: "{a{b:url(c)}}", rules: 1 },
				{ source: "url(c)", name: null, value: "c", block: null, rules: 0 },
				{ source: "@import 'd'", name: "import", value: null, block: null, rules: 0 }
			]);
			const html = "<div id=a>x</div><p>y<br><p>z";
			/** @type {Record<string, unknown>[]} */
			const htmlSeen = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					const content = path.rangeOf(HtmlPart.content);
					if (content === null) return;
					htmlSeen.push({
						source: path.source(...path.range()),
						name: path.source(.../** @type {[number, number]} */ (path.rangeOf(HtmlPart.name))),
						content: path.source(...content)
					});
				})
				.process(html);
			expect(htmlSeen).toEqual([
				{ source: "<div id=a>x</div>", name: "div", content: "x" },
				{ source: "<p>y<br>", name: "p", content: "y<br>" },
				{ source: "<br>", name: "br", content: "" },
				{ source: "<p>z", name: "p", content: "z" }
			]);
		});

		it("ends an html element with the end tag naming it, whichever path closes it", () => {
			// `</b>` and `</a>` go through the adoption agency, `</span>` through the
			// generic end tag, `</div>` and `</li>` through their own rules, and the
			// second `<b>` is closed by its parent's end tag instead.
			const html = "<div><b>b</b><a>a</a><span>s</span><li>l</li><p><b>z</p></div>";
			/** @type {string[]} */
			const seen = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					if (path.parent !== null && path.name(path.parent) === "body") return;
					if (path.name() === "html" || path.name() === "head" || path.name() === "body") {
						return;
					}
					seen.push(path.source());
				})
				.process(html);
			expect(seen).toEqual([
				"<b>b</b>",
				"<a>a</a>",
				"<span>s</span>",
				"<li>l</li>",
				"<p><b>z</p>",
				"<b>z"
			]);
		});

		it("ends a foreign element with the end tag naming it", () => {
			const html =
				'<svg><marker><path d="x"/><b-c></b-c></marker><script></script></svg>';
			/** @type {string[]} */
			const seen = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					if (path.flag(HtmlFlag.svg) || path.flag(HtmlFlag.mathml)) seen.push(path.source());
				})
				.process(html);
			expect(seen).toEqual([
				html,
				'<marker><path d="x"/><b-c></b-c></marker>',
				'<path d="x"/>',
				"<b-c></b-c>",
				"<script></script>"
			]);
		});

		it("answers empty for a css node without a name or value", () => {
			/** @type {[number, string, [number, number] | null, string | number][]} */
			const seen = [];
			new CssSourceProcessor()
				.use(
					[CssNodeType.QualifiedRule, CssNodeType.Ident, CssNodeType.SimpleBlock],
					(path) => {
						seen.push([
							path.type(),
							path.name(),
							// @ts-expect-error none of these has a name
							path.rangeOf(CssPart.name),
							path.value()
						]);
					}
				)
				.process("a[b]{}");
			expect(seen).toEqual([
				[CssNodeType.QualifiedRule, "", null, ""],
				[CssNodeType.Ident, "", null, "a"],
				// A simple block's value is its opening bracket.
				[CssNodeType.SimpleBlock, "", null, "["],
				[CssNodeType.Ident, "", null, "b"]
			]);
		});

		it("reads css structure through fields and flags", () => {
			const css =
				'@import "a.css"; @media screen { a { color: red !important; width: 1px } b {} } c { d: f(1) }';
			/** @type {unknown[]} */
			const seen = [];
			new CssSourceProcessor()
				.use(
					[
						CssNodeType.AtRule,
						CssNodeType.QualifiedRule,
						CssNodeType.Declaration
					],
					(path) => {
						/**
						 * @param {import("../../lib/css/syntax-parser").CssListField} field a field
						 * @returns {string[]} each item's source
						 */
						const items = (field) => {
							/** @type {string[]} */
							const out = [];
							for (let i = 0, n = path.fieldCount(field); i < n; i++) {
								out.push(path.source(path.field(i, field)).trim());
							}
							expect(path.field(path.fieldCount(field), field)).toBe(0);
							return out;
						};
						const width = path.fieldNamed(CssField.declarations, "width");
						seen.push([
							path.type(),
							path.name(),
							items(CssField.prelude).join(""),
							items(CssField.value).join(""),
							items(CssField.declarations),
							items(CssField.rules).length,
							/** @type {unknown} */ (width) === 0 ? null : path.source(width),
							path.fieldNamed(CssField.declarations, "margin"),
							path.flag(CssFlag.important)
						]);
					}
				)
				.process(css);
			expect(seen).toEqual([
				[CssNodeType.AtRule, "import", '"a.css"', "", [], 0, null, 0, false],
				[CssNodeType.AtRule, "media", "screen", "", [], 2, null, 0, false],
				[
					CssNodeType.QualifiedRule,
					"",
					"a",
					"",
					["color: red !important", "width: 1px"],
					0,
					"width: 1px ",
					0,
					false
				],
				[CssNodeType.Declaration, "color", "", "red", [], 0, null, 0, true],
				[CssNodeType.Declaration, "width", "", "1px", [], 0, null, 0, false],
				[CssNodeType.QualifiedRule, "", "b", "", [], 0, null, 0, false],
				[CssNodeType.QualifiedRule, "", "c", "", ["d: f(1)"], 0, null, 0, false],
				[CssNodeType.Declaration, "d", "", "f(1)", [], 0, null, 0, false]
			]);
		});

		it("reads html structure through fields and flags", () => {
			const html = `<p a="1" b><br><template><i>t</i></template>`;
			/** @type {unknown[]} */
			const seen = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					const name = path.name();
					if (name !== "p" && name !== "br" && name !== "template") return;
					const b = path.fieldNamed(HtmlField.attributes, "b");
					const content = path.field(0, HtmlField.content);
					seen.push([
						name,
						path.fieldCount(HtmlField.attributes),
						path.name(path.field(0, HtmlField.attributes)),
						path.field(2, HtmlField.attributes),
						b === 0 ? null : path.source(b),
						path.fieldNamed(HtmlField.attributes, "c"),
						path.flag(HtmlFlag.selfClosing),
						content === 0 ? 0 : path.type(content),
						path.fieldCount(HtmlField.content)
					]);
					if (name === "p") {
						const a = path.field(0, HtmlField.attributes);
						// An attribute has no parts: each read below fails to type-check too.
						// @ts-expect-error no attributes
						expect(path.fieldCount(HtmlField.attributes, a)).toBe(0);
						// @ts-expect-error no attributes
						expect(path.field(0, HtmlField.attributes, a)).toBe(0);
						// @ts-expect-error no attributes
						expect(path.fieldNamed(HtmlField.attributes, "x", a)).toBe(0);
						// @ts-expect-error no flags
						expect(path.flag(HtmlFlag.selfClosing, a)).toBe(false);
						// @ts-expect-error no content
						expect(path.field(0, HtmlField.content, a)).toBe(0);
					}
				})
				.process(html);
			expect(seen).toEqual([
				["p", 2, "a", 0, "b", 0, false, 0, 0],
				["br", 0, "", 0, null, 0, true, 0, 0],
				["template", 0, "", 0, null, 0, false, HtmlNodeType.DocumentFragment, 1]
			]);
		});

		it("answers fields and flags only for the node that owns them", () => {
			/** @type {string[]} */
			const flagged = [];
			/** @type {Record<number, (path: import("../../lib/css/syntax-parser").CssPath) => void>} */
			const visitors = {};
			for (const type of Object.values(CssNodeType)) {
				visitors[type] = (path) => {
					if (path.type() !== CssNodeType.Declaration && path.flag(CssFlag.important)) {
						flagged.push(path.source());
					}
				};
			}
			// The second rule's nodes reuse the first rule's ids.
			new CssSourceProcessor()
				.use(visitors)
				.process("a{x:y !important} b c d e f g h{z:1}");
			expect(flagged).toEqual([]);
			/** @type {unknown[]} */
			const css = [];
			new CssSourceProcessor()
				.use([CssNodeType.QualifiedRule], (path) => {
					css.push(path.field(-1, CssField.declarations), path.field(-1, CssField.prelude));
				})
				.process("a{b:c;d:e}");
			expect(css).toEqual([0, 0]);

			new HtmlSourceProcessor().process('<p a="1" b="2" c="3">x</p>');
			/** @type {unknown[]} */
			const html = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Text], (path) => {
					html.push(
						// @ts-expect-error a text node has no attributes
						path.fieldCount(HtmlField.attributes),
						// @ts-expect-error a text node has no attributes
						path.field(0, HtmlField.attributes),
						// @ts-expect-error a text node has no attributes
						path.fieldNamed(HtmlField.attributes, "a")
					);
				})
				.use([HtmlNodeType.Element], (path) => {
					if (path.name() === "p") html.push(path.field(-1, HtmlField.attributes));
				})
				.process('hello <i x="1"></i><p a="1">');
			expect(html).toEqual([0, 0, 0, 0]);
		});

		it("types each visitor's path by the node types it visits", () => {
			/** @type {unknown[]} */
			const css = [];
			new CssSourceProcessor()
				.use([CssNodeType.QualifiedRule], (path) => {
					const declaration = path.field(0, CssField.declarations);
					css.push(
						path.flag(CssFlag.important, declaration),
						// @ts-expect-error a rule is never `!important`
						path.flag(CssFlag.important),
						// @ts-expect-error a declaration has no nested rules
						path.fieldCount(CssField.rules, declaration),
						// @ts-expect-error a rule's component values are its prelude
						path.fieldCount(CssField.value),
						// @ts-expect-error a qualified rule has no name
						path.rangeOf(CssPart.name)
					);
				})
				.use({
					[CssNodeType.Ident]: (path) => {
						// @ts-expect-error an ident has no value list
						css.push(path.fieldCount(CssField.value));
					}
				})
				.process("a{b:c !important}");
			expect(css).toEqual([true, false, 0, 0, null, 0, 0]);

			/** @type {unknown[]} */
			const html = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					const attribute = path.field(0, HtmlField.attributes);
					if (attribute === 0) return;
					html.push(
						path.name(attribute),
						// @ts-expect-error an attribute has no attributes
						path.fieldCount(HtmlField.attributes, attribute),
						// @ts-expect-error an attribute is never self-closing
						path.flag(HtmlFlag.selfClosing, attribute),
						// @ts-expect-error an attribute has no content
						path.rangeOf(HtmlPart.content, attribute)
					);
				})
				.use([HtmlNodeType.Comment, HtmlNodeType.Text], (path) => {
					html.push(
						// @ts-expect-error a comment or text has no attributes
						path.fieldNamed(HtmlField.attributes, "a"),
						// @ts-expect-error nor a template's content
						path.field(0, HtmlField.content),
						// @ts-expect-error nor a name
						path.rangeOf(HtmlPart.name)
					);
				})
				.process('<p a="1"><!--c-->');
			expect(html).toEqual(["a", 0, false, null, 0, 0, null]);
		});

		it("reads what one grammar has through the generic members", () => {
			/** @type {unknown[]} */
			const css = [];
			new CssSourceProcessor()
				.use([CssNodeType.Dimension, CssNodeType.Number], (path) => {
					css.push([
						path.source(),
						path.name(),
						path.type() === CssNodeType.Dimension
							? path.source(.../** @type {[number, number]} */ (path.rangeOf(CssPart.name)))
							: null,
						path.flag(CssFlag.integer)
					]);
				})
				.use([CssNodeType.Hash], (path) => {
					css.push([path.source(), path.flag(CssFlag.id), path.within(CssNodeType.Declaration)]);
				})
				.use([CssNodeType.SimpleBlock], (path) => {
					css.push([path.source(), path.value()]);
				})
				.use([CssNodeType.Declaration], (path) => {
					// @ts-expect-error CSS has no text beyond a name and value
					css.push(path.textOf(CssPart.name));
				})
				.process("#a,a[b]{width:10px;margin:1.5em;z-index:2;color:#123}");
			expect(css).toEqual([
				["#a", true, false],
				["[b]", "["],
				null,
				["10px", "px", "px", true],
				null,
				["1.5em", "em", "em", false],
				null,
				["2", "", null, true],
				null,
				["#123", false, true]
			]);

			/** @type {unknown[]} */
			const html = [];
			const page = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "about:legacy"><p>a</p><li>b<svg><path/></svg><math><mi/></math>`;
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Doctype], (path) => {
					html.push(
						path.textOf(HtmlPart.publicId),
						path.source(.../** @type {[number, number]} */ (path.rangeOf(HtmlPart.systemId))),
						// @ts-expect-error a doctype has no start tag
						path.rangeOf(HtmlPart.startTag)
					);
				})
				.use([HtmlNodeType.Element], (path) => {
					const start = path.rangeOf(HtmlPart.startTag);
					const end = path.rangeOf(HtmlPart.endTag);
					html.push([
						path.name(),
						start === null ? null : path.source(...start),
						end === null ? null : path.source(...end),
						path.flag(HtmlFlag.svg),
						path.flag(HtmlFlag.mathml),
						path.within(HtmlNodeType.Element)
					]);
				})
				.use([HtmlNodeType.Text], (path) => {
					// @ts-expect-error a text node has no identifiers
					html.push(path.textOf(HtmlPart.publicId));
				})
				.process(page);
			expect(html).toEqual([
				"-//W3C//DTD HTML 4.01//EN",
				"about:legacy",
				null,
				["html", null, null, false, false, false],
				["head", null, null, false, false, true],
				["body", null, null, false, false, true],
				["p", "<p>", "</p>", false, false, true],
				null,
				["li", "<li>", null, false, false, true],
				null,
				["svg", "<svg>", "</svg>", true, false, true],
				["path", "<path/>", null, true, false, true],
				["math", "<math>", "</math>", false, true, true],
				["mi", "<mi/>", null, false, true, true]
			]);
		});

		it("answers null for a part a node does not have", () => {
			/** @type {unknown[]} */
			const html = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Doctype], (path) => {
					const id = path.rangeOf(HtmlPart.publicId);
					html.push(
						id === null ? null : path.source(...id),
						// @ts-expect-error a doctype's name is read with `name`
						path.textOf(HtmlPart.name)
					);
				})
				.use([HtmlNodeType.Element], (path) => {
					if (path.name() !== "b") return;
					html.push(
						path.rangeOf(HtmlPart.startTag),
						// @ts-expect-error an element's value has no position
						path.rangeOf(HtmlPart.value),
						path.field(1, HtmlField.content)
					);
				})
				// The second `b` is the adoption agency's clone, so no tag of its own.
				.process('<!DOCTYPE html PUBLIC "a"><b>1<p>2</b>3</p>');
			expect(html).toEqual(["a", null, [26, 29], null, 0, null, null, 0]);

			/** @type {unknown[]} */
			const css = [];
			new CssSourceProcessor()
				.use([CssNodeType.Dimension], (path) => {
					css.push(path.name(), _blockTokenOf(path.node));
				})
				// An escape the input ends inside is U+FFFD (CSS Syntax §4.3.7).
				.process("a{b:1p\\");
			expect(css).toEqual(["p\uFFFD", ""]);
		});

		it("knows a streamed block's ancestors until it closes", () => {
			let rules = "";
			for (let i = 0; i < 1800; i++) {
				rules += `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
			}
			let inside = 0;
			/** @type {boolean[]} */
			const after = [];
			new CssSourceProcessor()
				.use([CssNodeType.Dimension], (path) => {
					if (path.source() === "0px") {
						after.push(path.within(CssNodeType.AtRule));
					} else if (
						path.within(CssNodeType.Declaration) &&
						path.within(CssNodeType.QualifiedRule) &&
						path.within(CssNodeType.AtRule)
					) {
						inside++;
					}
				})
				.process(`@media screen{${rules}}x{y:0px}`);
			expect(inside).toBe(1800);
			expect(after).toEqual([false]);
		});

		it("reads html attributes as nodes through the shared members", () => {
			const input = `<p>\n<a href="/x?a&amp;b" title=t data-x>y</a>`;
			/** @type {Record<string, unknown>[]} */
			const seen = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					if (path.name() !== "a") return;
					for (
						let i = 0, a = path.field(0, HtmlField.attributes);
						a !== 0;
						a = path.field(++i, HtmlField.attributes)
					) {
						const valueRange = path.rangeOf(HtmlPart.value, a);
						seen.push({
							type: path.type(a),
							name: path.name(a),
							value: path.value(a),
							source: path.source(a),
							written: valueRange === null ? null : path.source(...valueRange),
							nameSource: path.source(
								.../** @type {[number, number]} */ (path.rangeOf(HtmlPart.name, a))
							),
							loc: path.loc(a).slice(0, 2)
						});
					}
					expect(
						path.field(path.fieldCount(HtmlField.attributes), HtmlField.attributes)
					).toBe(0);
					expect(path.fieldNamed(HtmlField.attributes, "id")).toBe(0);
					expect(path.name(path.fieldNamed(HtmlField.attributes, "title"))).toBe("title");
				})
				.process(input);
			expect(seen).toEqual([
				{
					type: HtmlNodeType.Attribute,
					name: "href",
					value: "/x?a&b",
					source: 'href="/x?a&amp;b"',
					written: "/x?a&amp;b",
					nameSource: "href",
					loc: [2, 3]
				},
				{
					type: HtmlNodeType.Attribute,
					name: "title",
					value: "t",
					source: "title=t",
					written: "t",
					nameSource: "title",
					loc: [2, 21]
				},
				{
					type: HtmlNodeType.Attribute,
					name: "data-x",
					value: "",
					source: "data-x",
					written: null,
					nameSource: "data-x",
					loc: [2, 29]
				}
			]);
		});

		it("reads the html root and a template's content at index 0", () => {
			/** @type {[number, number | null, number][]} */
			const seen = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Document, HtmlNodeType.DocumentFragment], (path) => {
					seen.push([path.type(), path.parent, path.index]);
				})
				.process("<template><b></b><i></i></template>");
			expect(seen).toHaveLength(2);
			expect(seen[0]).toEqual([HtmlNodeType.Document, null, 0]);
			expect(seen[1][0]).toBe(HtmlNodeType.DocumentFragment);
			expect(seen[1][1]).not.toBeNull();
			expect(seen[1][2]).toBe(0);
		});

		it("reads css nodes through the shared members", () => {
			const input = "a {\n\tcolor: rgb(1, 2,\n3);\n}";
			// Leaves reuse ids that held lists in this parse, so a leaf reading
			// its id's leftover list slots would report children.
			new CssSourceProcessor().process(`a{b:${"f(".repeat(40)}${")".repeat(40)}}`);
			/** @type {Record<string, unknown>[]} */
			const seen = [];
			/** @type {string[]} */
			const args = [];
			new CssSourceProcessor()
				.use({
					[CssNodeType.Function]: (path) => {
						for (let i = 0; i < path.childCount(); i++) {
							args.push(path.source(path.child(i)));
						}
						expect(path.child(path.childCount())).toBe(0);
					},
					[CssNodeType.Number]: (path) => {
						seen.push(describeNode(path, input));
					}
				})
				.process(input);
			expect(args).toEqual(["1", ",", " ", "2", ",", "\n", "3"]);
			expect(seen.map((node) => node.source)).toEqual(["1", "2", "3"]);
			for (const node of seen) {
				expect(node.loc).toEqual(node.expectedLoc);
				expect(node.source).toBe(node.slice);
				expect(node.atIndex).toBe(true);
				expect(node.childCount).toBe(0);
				expect(node.children).toEqual([]);
			}
			expect(seen.map((node) => node.index)).toEqual([0, 3, 6]);
			expect(seen[2].loc).toEqual([3, 0, 3, 1]);
		});
	});

	describe("stop", () => {
		it("ends a css walk: no later visitor, exit or comment fires", () => {
			/** @type {string[]} */
			const log = [];
			const processor = new CssSourceProcessor()
				.use({
					[CssNodeType.QualifiedRule]: {
						enter: () => log.push("rule"),
						exit: () => log.push("rule exit")
					},
					[CssNodeType.Declaration]: (path) => {
						log.push(path.name());
						if (path.name() === "b") path.stop();
					},
					[CssNodeType.Comment]: () => log.push("comment")
				})
				.use({
					[CssNodeType.Declaration]: (path) => log.push(`second ${path.name()}`)
				});
			processor.process("x{a:1;b:2;c:3}/* c */y{d:4}");
			expect(log).toEqual(["rule", "a", "second a", "b"]);
			log.length = 0;
			processor.process("x{a:1}/* c */");
			expect(log).toEqual(["rule", "a", "second a", "rule exit", "comment"]);
		});

		it("stops css visitors but still prints the whole output", () => {
			const css = "a { color: red }\nb { top: 0 }\nc { left: 0 }";
			let fired = 0;
			const { code } = new CssSourceProcessor()
				.use({
					[CssNodeType.Declaration]: (path) => {
						fired++;
						path.stop();
					}
				})
				.process(css, { mode: "minify" });
			expect(fired).toBe(1);
			expect(code).toBe(
				new CssSourceProcessor().process(css, { mode: "minify" }).code
			);
		});

		it("ends an html walk, and the next parse starts afresh", () => {
			/** @type {string[]} */
			const log = [];
			const processor = new HtmlSourceProcessor().use([HtmlNodeType.Element], {
				enter: (path) => {
					log.push(path.name());
					if (path.name() === "base") path.stop();
				},
				exit: (path) => log.push(`/${path.name()}`)
			});
			processor.process("<base href=/a><p>x</p><i>y</i>");
			expect(log).toEqual(["html", "head", "base"]);
			log.length = 0;
			processor.process("<p>x</p>");
			expect(log).toEqual([
				"html",
				"head",
				"/head",
				"body",
				"p",
				"/p",
				"/body",
				"/html"
			]);
		});

		it("ends a streamed html walk mid-parse", () => {
			// Past the node count where the walk streams during tree construction.
			const html = `<ul>${"<li>x</li>".repeat(40000)}</ul>`;
			let seen = 0;
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					if (path.name() === "li" && ++seen === 10) path.stop();
				})
				.process(html);
			expect(seen).toBe(10);
			let total = 0;
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], (path) => {
					if (path.name() === "li") total++;
				})
				.process(html);
			expect(total).toBe(40000);
		});

		it("stops html visitors but still prints the whole output", () => {
			const html = "<div><p>a</p><p>b</p></div>";
			/** @type {string[]} */
			const log = [];
			const { code } = new HtmlSourceProcessor()
				.use([HtmlNodeType.Element], {
					enter: (path) => {
						log.push(path.name());
						if (path.name() === "div") path.stop();
					},
					exit: (path) => log.push(`/${path.name()}`)
				})
				.process(html, { mode: "minify" });
			expect(log).toEqual(["html", "head", "/head", "body", "div"]);
			expect(code).toBe(
				new HtmlSourceProcessor().process(html, { mode: "minify" }).code
			);
		});
	});

	describe("use with an array of node types", () => {
		it("registers one visitor for every listed type, in each language", () => {
			/** @type {string[]} */
			const css = [];
			new CssSourceProcessor()
				.use([CssNodeType.Number, CssNodeType.Dimension], (path) =>
					css.push(path.source())
				)
				.process("a{top:1px;z-index:2;left:3em}");
			expect(css).toEqual(["1px", "2", "3em"]);
			/** @type {string[]} */
			const html = [];
			new HtmlSourceProcessor()
				.use([HtmlNodeType.Text, HtmlNodeType.Comment], {
					exit: (path) => html.push(path.source())
				})
				.process("<p>a<!--b-->c</p>");
			expect(html).toEqual(["a", "<!--b-->", "c"]);
		});

		it("requires a visitor", () => {
			expect(() =>
				new CssSourceProcessor().use(
					[CssNodeType.Number],
					/** @type {EXPECTED_ANY} */ (undefined)
				)
			).toThrow(TypeError);
		});
	});

	describe("visitors", () => {
		it("fires a css visitor for each node of that type, and still prints", () => {
			/** @type {string[]} */
			const seen = [];
			const result = new CssSourceProcessor()
				.use({
					[CssNodeType.Declaration]: (path) => {
						seen.push(path.name());
					}
				})
				.process("a{color:red;top:0}", { mode: "minify" });
			expect(seen).toEqual(["color", "top"]);
			expect(result.code).toBe("a{color:red;top:0}");
		});

		it("fires an html visitor for each element", () => {
			/** @type {string[]} */
			const seen = [];
			new HtmlSourceProcessor()
				.use({
					[HtmlNodeType.Element]: (path) => {
						seen.push(path.name());
					}
				})
				.process("<div><p>x</p></div>");
			expect(seen).toEqual(["html", "head", "body", "div", "p"]);
		});

		it("runs enter before exit", () => {
			/** @type {string[]} */
			const order = [];
			new CssSourceProcessor()
				.use({
					[CssNodeType.QualifiedRule]: {
						enter: () => order.push("enter"),
						exit: () => order.push("exit")
					}
				})
				.process("a{color:red}");
			expect(order).toEqual(["enter", "exit"]);
		});

		it("returns the processor so `use` chains", () => {
			const processor = new CssSourceProcessor();
			expect(processor.use({})).toBe(processor);
		});
	});

	describe("empty and degenerate input", () => {
		for (const [language, Processor] of LANGUAGES) {
			it(`${language} prints empty input without failing`, () => {
				const { code } = new Processor().process("", { mode: "minify" });
				expect(typeof code).toBe("string");
			});
		}

		it("css prints a stylesheet that is only a comment", () => {
			expect(
				new CssSourceProcessor().process("/* c */", { mode: "minify" }).code
			).toBe("");
		});

		it("css keeps a license comment", () => {
			expect(
				new CssSourceProcessor().process("/*! keep */a{b:c}", {
					mode: "minify"
				}).code
			).toContain("/*! keep */");
		});
	});
});
