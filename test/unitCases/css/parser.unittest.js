"use strict";

const { fixture } = require("../../helpers/fixture");

// Each fixture's tree and parse errors are in `invariants.unittest.js`'s
// snapshot; these hold the other entry points, accessors, skips and visitors.

const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	A,
	buildSkipSet,
	Field,
	Flag,
	NodeType,
	normalizeUrl,
	parseABlocksContents,
	parseACommaSeparatedListOfComponentValues,
	parseAComponentValue,
	parseADeclaration,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents,
	TokenStream
} = require("../../../lib/css/syntax-parser");

describe("CssSyntax — parser entry points", () => {
	it("takes the start offset and the options as optional", () => {
		expect(parseACommaSeparatedListOfComponentValues(fixture("css", "css-syntax-parser-entry-points-takes-the-start-offset-and-the-options-as"))).toHaveLength(2);
		expect(parseAStylesheetsContents(fixture("css", "source-processor-merging-adjacent-style-drops-a-run-s-first-element-only-where-4"))).toHaveLength(1);
		expect(parseABlocksContents(fixture("css", "css-syntax-parser-entry-points-takes-the-start-offset-and-the-options-as-2")).decls).toHaveLength(1);
		expect(parseARule(fixture("css", "source-processor-merging-adjacent-style-drops-a-run-s-first-element-only-where-4"))).toBeDefined();
		expect(parseAComponentValue(fixture("css", "css-syntax-parse-error-callback-reports-a"))).toBeDefined();
	});

	it("accepts a pre-built TokenStream as input", () => {
		const ss = parseAStylesheet(new TokenStream(fixture("css", "css-syntax-parser-entry-points-accepts-a-pre-built-token-stream-as-input")));
		expect(A.fieldCount(Field.rules, ss)).toBe(1);
	});

	it("returns refs valid until the next parse", () => {
		const first = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration(fixture("css", "css-syntax-parser-entry-points-parse-a-declaration-parses-name-value-and"))
		);
		expect(A.name(first)).toBe("color");
		parseADeclaration(fixture("css", "css-syntax-parser-entry-points-returns-refs-valid-until-the-next-parse"));
		expect(A.name(first)).toBe("margin");
	});

	it("keeps no list of rules for each stylesheet it parsed", () => {
		const { gc } = global;
		// `yarn test:base` exposes it; without it nothing can be counted.
		if (gc === undefined) return;
		const sheet = fixture("css", "css-syntax-parser-entry-points-keeps-no-list-of-rules-for-each-stylesheet-it-par");
		const settle = () => {
			gc();
			gc();
			return process.memoryUsage().heapUsed;
		};
		for (let i = 0; i < 5; i++) parseAStylesheet(sheet);
		const before = settle();
		for (let i = 0; i < 20; i++) parseAStylesheet(sheet);
		// A list of 30000 rules kept by each of 20 parses is over 4 MB.
		expect(settle() - before).toBeLessThan(1 << 20);
		expect(A.fieldCount(Field.rules, parseAStylesheet(fixture("css", "css-syntax-parser-entry-points-keeps-no-list-of-rules-for-each-stylesheet-it-par-2")))).toBe(2);
		expect(parseAStylesheetsContents(fixture("css", "css-syntax-parser-entry-points-keeps-no-list-of-rules-for-each-stylesheet-it-par-3"))).toHaveLength(3);
	});

	it("reads a small input after a large one, and the large one again", () => {
		// 40000 rules are over 65536 nodes: more than is kept for a small input.
		const large = fixture("css", "css-syntax-parser-entry-points-reads-a-small-input-after-a-large-one-and-the-lar");
		const small = fixture("css", "css-syntax-parser-entry-points-reads-a-small-input-after-a-large-one-and-the-lar-2");
		/**
		 * @param {string} input a stylesheet
		 * @returns {string[]} how many rules it has, and its first and last
		 */
		const read = (input) => {
			const sheet = parseAStylesheet(input);
			const count = A.fieldCount(Field.rules, sheet);
			return [
				String(count),
				A.source(A.field(0, Field.rules, sheet)),
				A.source(A.field(count - 1, Field.rules, sheet))
			];
		};
		expect(read(large)).toEqual(["40000", "a{b:c}", "last{b:c}"]);
		expect(read(small)).toEqual(["2", "d{e:f}", "g{h:i}"]);
		expect(read(large)).toEqual(["40000", "a{b:c}", "last{b:c}"]);
		// A walk hands large columns back itself, so the next parse starts small.
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					seen.push(path.source(path.node));
				}
			})
			.process(small);
		expect(seen).toEqual(["d{e:f}", "g{h:i}"]);
		expect(read(small)).toEqual(["2", "d{e:f}", "g{h:i}"]);
	});
});

describe("CssSyntax — substitution span searches", () => {
	const { _hasSubstitutionInSpan } = require("../../../lib/css/syntax-parser");

	it.each([
		["", "css-syntax-substitution-span-searches-shares-one-search-across-values-without"],
		[";last:var(--x)", "css-syntax-substitution-span-searches-shares-one-search-across-values-without-2"]
	])(
		"shares one search across values without calls before %s",
		(_suffix, name) => {
			expect.assertions(2);
			const css = fixture("css", name);
			const spans = ["one:1", "two:2", "three:3"].map((declaration) => [
				css.indexOf(declaration),
				declaration.length
			]);
			new SourceProcessor()
				.use({
					[NodeType.QualifiedRule]: () => {
						const search = jest.spyOn(String.prototype, "indexOf");
						try {
							const results = spans.map(([from, length]) =>
								_hasSubstitutionInSpan(from, from + length)
							);
							const calls = search.mock.calls.filter(
								([value]) => value === "("
							);
							expect(results).toEqual([false, false, false]);
							expect(calls).toHaveLength(1);
						} finally {
							search.mockRestore();
						}
					}
				})
				.process(css);
		}
	);

	it("handles overlapping and backward spans after a hit or end of input", () => {
		expect.assertions(7);
		const css = fixture("css", "css-syntax-substitution-span-searches-handles-overlapping-and-backward-spans");
		const first = css.indexOf("var");
		const second = css.indexOf("calc");
		const last = css.indexOf("c:0");
		const opening = css.indexOf("(");
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: () => {
					expect(_hasSubstitutionInSpan(first, opening)).toBe(false);
					expect(_hasSubstitutionInSpan(first, opening + 1)).toBe(true);
					expect(_hasSubstitutionInSpan(opening, opening + 1)).toBe(false);
					expect(_hasSubstitutionInSpan(second, last)).toBe(true);
					expect(_hasSubstitutionInSpan(first, second)).toBe(true);
					expect(_hasSubstitutionInSpan(last, css.length)).toBe(false);
					expect(_hasSubstitutionInSpan(second, last)).toBe(true);
				}
			})
			.process(css);
	});

	it("resets search results between stylesheets, including escaped calls", () => {
		expect.assertions(5);
		for (const { css, expected } of [
			{ css: fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"), expected: false },
			{ css: fixture("css", "css-syntax-substitution-span-searches-resets-search-results-between-stylesheets"), expected: true },
			{ css: fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"), expected: false },
			{ css: fixture("css", "css-syntax-substitution-span-searches-resets-search-results-between-stylesheets-2"), expected: true },
			{ css: fixture("css", "css-syntax-substitution-span-searches-resets-search-results-between-stylesheets-3"), expected: true }
		]) {
			new SourceProcessor()
				.use({
					[NodeType.QualifiedRule]: () => {
						expect(_hasSubstitutionInSpan(2, css.length - 1)).toBe(expected);
					}
				})
				.process(css);
		}
	});
});

describe("CssSyntax — SourceProcessor", () => {
	it("reports an empty body for a streamed rule with no prelude", () => {
		const css = fixture("css", "css-syntax-source-processor-reports-an-empty-body-for-a-streamed-rule-with-no-prelude");
		/** @type {number[]} */
		const counts = [];
		// A parser of its own: its list store starts empty, as in a fresh process.
		jest.isolateModules(() => {
			const syntax = require("../../../lib/css/syntax");
			const { Field: fields, NodeType: types } = require("../../../lib/css/syntax-parser");
			new syntax.SourceProcessor()
				.use({
					[types.QualifiedRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						counts.push(path.fieldCount(fields.declarations));
					}
				})
				.process(css, {});
		});
		expect(counts).toEqual([0]);
	});

	describe("replacing a node", () => {
		/**
		 * @param {string} css source
		 * @param {import("../../../lib/css/syntax-parser").CssVisitorMap} visitors visitors
		 * @param {"minify" | "beautify"} mode print mode
		 * @returns {string | undefined} the printed code
		 */
		const print = (css, visitors, mode = "minify") => {
			const result = new SourceProcessor().use(visitors).process(css, { mode });
			return result && result.code;
		};

		it("prints a value token, a declaration and a rule as their replacement", () => {
			const css = "a{color:#ff0000;margin-top:1px}b{color:red}";
			expect(print(css, { [NodeType.Hash]: (path) => path.replaceWith("blue") })).toBe(
				"a{color:blue;margin-top:1px}b{color:red}"
			);
			expect(
				print(css, {
					[NodeType.Declaration]: (path) => {
						if (path.name() === "margin-top") path.replaceWith("padding:2px");
					}
				})
			).toBe("a{color:red;padding:2px}b{color:red}");
			expect(
				print(css, {
					[NodeType.QualifiedRule]: (path) => {
						if (path.source().startsWith("b")) path.replaceWith("i{x:y}");
					}
				})
			).toBe("a{color:red;margin-top:1px}i{x:y}");
			expect(
				print(
					css,
					{ [NodeType.Hash]: (path) => path.replaceWith("blue") },
					"beautify"
				)
			).toBe("a {\ncolor: blue;\nmargin-top: 1px;\n}b {\ncolor: red;\n}");
		});

		it("removes a node, in an enter visitor too", () => {
			expect(
				print("a{color:red;top:0}", {
					[NodeType.Declaration]: {
						enter: (path) => {
							if (path.name() === "color") path.remove();
						}
					}
				})
			).toBe("a{top:0}");
		});

		it("minifies what holds a replacement as the source it spells", () => {
			expect(
				print("a{margin:0;margin-top:#f00}b{margin:0;margin-top:1px}", {
					[NodeType.Hash]: (path) => path.replaceWith("1px")
				})
			).toBe("a,b{margin:1px 0 0}");
		});

		it("composes a style attribute's declarations as they printed", () => {
			const result = new SourceProcessor()
				.use({
					[NodeType.Declaration]: (path) => {
						if (path.name() === "margin-top") path.replaceWith("padding:0");
					}
				})
				.process(
					"margin-top:1px;margin-bottom:1px;margin-left:2px;margin-right:2px",
					{ mode: "minify", as: "block-contents" }
				);
			expect(result && result.code).toBe(
				"padding:0;margin-bottom:1px;margin-left:2px;margin-right:2px"
			);
		});

		it("refuses an edit from a comment's visitor", () => {
			// A comment is read from the token stream, not walked as a node.
			expect(() =>
				print("/*! x */a{color:red}b{top:0}", {
					[NodeType.Comment]: (path) => path.replaceWith("/*y*/")
				})
			).toThrow(
				"css syntax: path.replaceWith() cannot edit from a Comment's visitor, which fires as the source is read"
			);
		});

		it("refuses an edit in a rule large enough to stream", () => {
			// Past the streaming threshold the block is walked as it is read.
			const css = fixture(
				"css",
				"css-syntax-source-processor-replacing-a-node-prints-a-rule-large-enough-to"
			);
			for (const event of ["enter", "exit"]) {
				expect(() =>
					print(css, {
						[NodeType.QualifiedRule]: {
							[event]: (
								/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
							) => {
								if (path.start() === 0) path.replaceWith("z{q:1}");
							}
						}
					})
				).toThrow("not a block of over 16384 nodes, walked as it parses");
			}
		});

		it("prints a custom property's value holding a replacement as one written so", () => {
			/** @type {import("../../../lib/css/syntax-parser").CssVisitorMap} */
			const visitors = { [NodeType.Hash]: (path) => path.replaceWith("blue") };
			expect(print("a{--x: foo  #f00 bar(#f00) ;color:#f00}", visitors)).toBe(
				"a{--x:foo blue bar(blue);color:blue}"
			);
			expect(
				print("a{--x: foo  #f00 bar(#f00) }", visitors, "beautify")
			).toBe("a {\n--x: foo  blue bar(blue);\n}");
			// The walk visits what an edit adds: the replacement's whitespace goes too.
			expect(
				print("a{--x: a, b c;b:x}", {
					[NodeType.Comma]: (path) => path.replaceWith(" / "),
					[NodeType.Whitespace]: (path) => path.remove()
				})
			).toBe("a{--x:a/bc;b:x}");
			// A string the input ran out in is left open, as written.
			expect(print('a{--x:#f00 "open', visitors)).toBe('a{--x:blue "open');
						expect(print("a{--x: a  b;--y: c  #f00}", visitors)).toBe(
				"a{--x:a b;--y:c blue}"
			);
		});

		it("edits a walk that prints nothing, whose later reads see it", () => {
			let seen = 0;
			/** @type {number[]} */
			const types = [];
			new SourceProcessor()
				.use({
					[NodeType.Hash]: (path) => {
						seen++;
						path.replaceWith("blue");
					},
					[NodeType.Declaration]: {
						exit: (path) => {
							types.push(path.type(path.child(0)));
						}
					}
				})
				.process("a{color:#f00}");
			expect(seen).toBe(1);
			expect(types).toEqual([NodeType.Ident]);
		});
	});

	it("exposes range / unescaped / type flags / setEnd / setBlockEnd on the path", () => {
		/** @type {Record<string, unknown>} */
		const seen = {};
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Hash]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.idFlag = path.flag(Flag.id);
						// `A.value` on a hash drops the `#` (raw-value slice).
						seen.hashValue = path.value();
					},
					[NodeType.Number]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.integerFlag = path.flag(Flag.integer);
					},
					[NodeType.String]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.unescaped = path.value();
					},
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.range = [path.range()[0], path.range()[1]];
					}
				})
			)
			.process('a { z-index: 5; content: "x"; color: #123 }');
		expect(seen.idFlag).toBe(false);
		expect(seen.integerFlag).toBe(true);
		expect(seen.hashValue).toBe("123");
		expect(seen.unescaped).toBe("x");
		expect(Array.isArray(seen.range)).toBe(true);
	});

	it("fires enter / exit visitors in source order", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.QualifiedRule]: {
						enter: () => log.push("enter"),
						exit: () => log.push("exit")
					},
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`)
				})
			)
			.process("a{color:red;width:1px}");
		expect(log).toEqual(["enter", "decl:color", "decl:width", "exit"]);
	});

	it("path.skipChildren() stops descent into a node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					log.push("qr");
					path.skipChildren();
				},
				[NodeType.Declaration]: () => log.push("decl")
			})
			.process("a{color:red}");
		expect(log).toEqual(["qr"]);
	});

	it("recurseBlocks: false stops at top-level rules", () => {
		const count = (/** @type {boolean} */ recurseBlocks) => {
			let n = 0;
			new SourceProcessor()
				.use({ [NodeType.QualifiedRule]: () => n++ })
				.process("@media x{.a{c:1}.b{d:2}}", { recurseBlocks });
			return n;
		};
		expect(count(false)).toBe(0);
		expect(count(true)).toBe(2);
	});

	it("walks declarations inside at-rule blocks", () => {
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => names.push(path.name())
				})
			)
			.process("@font-face{font-family:x;src:url(y)}");
		expect(names).toEqual(["font-family", "src"]);
	});

	it("use() chains and accumulates visitors per type", () => {
		let a = 0;
		let b = 0;
		const sp = new SourceProcessor()
			.use({ [NodeType.Declaration]: () => a++ })
			.use({ [NodeType.Declaration]: () => b++ });
		expect(sp).toBeInstanceOf(SourceProcessor);
		sp.process(fixture("css", "css-syntax-source-processor-use-chains-and-accumulates-visitors-per-type"));
		expect([a, b]).toEqual([1, 1]);
	});

	it("re-shrinks the SoA buffers after a pathologically large rule", () => {
		// one top-level rule with > 64 Ki component-value nodes grows the SoA
		// buffers past the shrink threshold; the next parse must work after the
		// post-parse release re-shrinks them
		const big = fixture("css", "css-syntax-source-processor-re-shrinks-the-so-a-buffers-after-a-pathologically-2");
		let idents = 0;
		new SourceProcessor()
			.use({ [NodeType.Ident]: () => idents++ })
			.process(big);
		// 70000 value idents + the selector ident
		expect(idents).toBe(70001);
		// again: the regrow-hint path must restore exactly enough capacity
		idents = 0;
		new SourceProcessor()
			.use({ [NodeType.Ident]: () => idents++ })
			.process(big);
		expect(idents).toBe(70001);
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => names.push(path.name())
				})
			)
			.process(fixture("css", "css-syntax-source-processor-re-shrinks-the-so-a-buffers-after-a-pathologically"));
		expect(names).toEqual(["c"]);
	});
});

describe("CssSyntax — the facade", () => {
	const syntax = require("../../../lib/css/syntax");

	it("names its two halves the way `javascript` does", () => {
		expect(typeof syntax.parser.grammar).toBe("function");
		expect(typeof syntax.printer.printer).toBe("function");
	});

	it("publishes only the two halves and the processor", () => {
		expect(Object.keys(syntax).sort()).toEqual([
			"SourceProcessor",
			"parser",
			"printer"
		]);
		expect(syntax.parser).toBe(require("../../../lib/css/syntax-parser"));
		expect(syntax.printer).toBe(require("../../../lib/css/syntax-printer"));
	});

	it("holds no printer until something prints", () => {
		const processor = new SourceProcessor();
		processor.process(fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"));
		expect(processor._printer).toBeUndefined();
		expect(processor.process(fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"), { mode: "minify" }).code).toMatchSnapshot();
		expect(typeof processor._printer).toBe("function");
	});
});

describe("CssSyntax — nesting and error recovery", () => {
	it("fails on a nesting deeper than the stack as a parse error", () => {
		const deep = fixture(
			"css",
			"css-syntax-nesting-and-error-recovery-fails-on-a-nesting-deeper-than-the-stack-2"
		);
		expect(() => new SourceProcessor().process(deep)).toThrow(
			/^Not enough stack space to parse input \(1:\d+\)$/
		);
		expect(() =>
			new SourceProcessor().process(deep, { mode: "minify" })
		).toThrow(SyntaxError);
		// The parse after it starts clean.
		expect(
			new SourceProcessor().process(fixture("css", "css-syntax-nesting-and-error-recovery-fails-on-a-nesting-deeper-than-the-stack"), { mode: "minify" })
		).toMatchObject({ code: fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is") });
	});

	it("rethrows what else fails a parse as it is", () => {
		const unreadable = /** @type {string[]} */ (/** @type {unknown} */ (42));
		expect(() =>
			new SourceProcessor().process(fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is"), {
				mode: "minify",
				unusedSymbols: unreadable
			})
		).toThrow(TypeError);
	});
});

describe("CssSyntax — skip set (CssProcessOptions.skip)", () => {
	// A bare declaration, parsed as block-contents so no selector prelude pollutes
	// the counts. Every leaf type appears both at the top level and inside `bar(…)`,
	// so one skip proves both the value-list and function-arg builders honour it.
	const VALUE_CSS =
		fixture("css", "parser");
	// Leaf types present in VALUE_CSS's value (Whitespace too, from the spaces).
	/** @type {[string, number][]} */
	const LEAF_TYPES = [
		["Ident", NodeType.Ident],
		["Number", NodeType.Number],
		["Dimension", NodeType.Dimension],
		["Percentage", NodeType.Percentage],
		["Hash", NodeType.Hash],
		["Delim", NodeType.Delim],
		["String", NodeType.String],
		["Colon", NodeType.Colon],
		["Comma", NodeType.Comma],
		["Whitespace", NodeType.Whitespace]
	];

	/**
	 * Count visited nodes per type while walking `css`.
	 * @param {string} css source
	 * @param {number[]=} skipTypes component-value node types to drop
	 * @returns {Record<number, number>} count keyed by node type
	 */
	const countByType = (css, skipTypes) => {
		/** @type {Record<number, number>} */
		const counts = {};
		/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */
		const map = {};
		for (const t of Object.values(NodeType)) {
			map[t] = (/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path) => {
				counts[path.type()] = (counts[path.type()] || 0) + 1;
			};
		}
		new SourceProcessor().use(map).process(css, {
			as: "block-contents",
			skip: skipTypes ? { types: buildSkipSet(skipTypes) } : undefined
		});
		return counts;
	};

	const base = countByType(VALUE_CSS);

	it("baseline (no skip) visits every leaf type in the value", () => {
		for (const [name, type] of LEAF_TYPES) {
			expect({ [name]: base[type] || 0 }).toEqual({
				[name]: expect.any(Number)
			});
			expect(base[type]).toBeGreaterThan(0);
		}
	});

	// The skip-mode prelude walk steps over the leaves it drops in bytes, so
	// every spelling that can hide the `{` it stops at has to hold it back, and
	// a `(` has to hand the name in front of it back to the tokenizer.
	describe("skip.selectorPrelude reads the same rules as a full parse", () => {
		/**
		 * What a walk sees: each rule's byte range, the declarations in it, and
		 * every url, which is all skip mode still materializes.
		 * @param {string} css source
		 * @param {boolean} skip whether to skip selector preludes
		 * @returns {string[]} the visit log
		 */
		const walk = (css, skip) => {
			/** @type {string[]} */
			const log = [];
			/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */
			const map = {
				[NodeType.QualifiedRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => log.push(`rule:${path.range()[0]}-${path.range()[1]}`),
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => log.push(`decl:${path.name()}`),
				[NodeType.Url]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => log.push(`url:${path.value()}`)
			};
			new SourceProcessor()
				.use(map)
				.process(css, skip ? { skip: { selectorPrelude: true } } : {});
			return log;
		};

		// Each case reaches the scan, which runs only past two non-whitespace
		// tokens: `.a .b` is that prefix, and the shape under test follows it.
		// Without one the tokenizer would consume the shape as one of the two.
		/** @type {[string, string][]} */
		const CASES = [
			["a plain run of leaves", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-10")],
			["a string hiding the braces", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-18")],
			["a single-quoted string", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-15")],
			["a quote hiding the brace", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-12")],
			["a brace inside an attribute block", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the")],
			["a comment hiding the brace", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-2")],
			["an escaped brace", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-21")],
			["a function and its name", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-4")],
			["a url inside the prelude's function", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-19")],
			["an attribute block", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-20")],
			["a non-ASCII selector", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-8")],
			["a stray closer in the prelude", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-17")],
			["a stray brace in the prelude", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-16")],
			["a one-token prelude", fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14")],
			["a nested rule under a block", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-7")],
			["a nested prelude stopped by a semicolon", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-5")],
			[
				"a nested prelude stopped by the block's brace",
				fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-6")
			],
			["a rule inside an at-rule", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-13")],
			["a selector that reads as a declaration", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-14")],
			["a custom-property block", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-3")],
			["a prelude running to EOF", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-11")],
			["a NUL in the prelude", fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-9")]
		];

		it.each(CASES)("%s", (_name, css) => {
			expect(walk(css, true)).toEqual(walk(css, false));
		});
	});

	it('maps an as: "block-contents" print to where the list starts', () => {
		const { code, map } = /** @type {{ code: string, map: EXPECTED_ANY }} */ (
			new SourceProcessor().process(fixture("css", "css-syntax-skip-set-css-process-options-skip-maps-an-as-block-contents-print-to"), {
				mode: "minify",
				as: "block-contents",
				source: "style",
				content: fixture("css", "css-syntax-skip-set-css-process-options-skip-maps-an-as-block-contents-print-to")
			})
		);

		expect(code).toMatchSnapshot();
		// The list prints as one piece, so it anchors as one.
		expect(map.sources).toEqual(["style"]);
		expect(map.mappings).toMatchSnapshot();
	});
});

describe("CssSyntax — normalizeUrl", () => {
	it("should return a plain url unchanged", () => {
		const s = "./images/photo.png";
		expect(normalizeUrl(s, false)).toBe(s);
	});

	it("should keep data: URIs verbatim (case-insensitive) without decoding", () => {
		expect(normalizeUrl("data:image/png;base64,AA%2F", false)).toBe(
			"data:image/png;base64,AA%2F"
		);
		expect(normalizeUrl("DATA:text/plain,x%41", false)).toBe(
			"DATA:text/plain,x%41"
		);
	});

	it("should trim whitespace, strip escaped newlines and decode escapes", () => {
		expect(normalizeUrl("  img.png\t ", true)).toBe("img.png");
		expect(normalizeUrl("im\\\ng.png", true)).toBe("img.png");
		expect(normalizeUrl("./im\\61 ges/a.png", false)).toBe("./images/a.png");
	});

	it("should decode percent-encoding outside data: URIs", () => {
		expect(normalizeUrl("./%2E/img.png", false)).toBe("././img.png");
	});
});

describe("CssSyntax — SourceProcessor without visitors", () => {
	it("streams a stylesheet through the recycle-only sink", () => {
		// Zero registered buckets: the grammar consumes with `_recycleTopLevel`
		// (no walk); nested rules exercise the per-top-level buffer recycling.
		expect(() =>
			new SourceProcessor()
				.use({})
				.process(
					fixture("css", "css-syntax-source-processor-without-visitors-streams-a-stylesheet-through-the")
				)
		).not.toThrow();
	});
});

describe("CssSyntax — token value decoding", () => {
	it("scans escaped at-signs in linear time", () => {
		/**
		 * @param {string} name the fixture holding the escaped at-signs
		 * @returns {number} character reads while processing them
		 */
		const reads = (name) => {
			const src = fixture("css", name);
			const original = String.prototype.charCodeAt;
			let count = 0;
			/**
			 * @this {string}
			 * @param {number} index position read
			 * @returns {number} the code unit there
			 */
			// eslint-disable-next-line no-extend-native
			String.prototype.charCodeAt = function charCodeAt(index) {
				count++;
				return original.call(this, index);
			};
			try {
				new SourceProcessor().process(src);
			} finally {
				// eslint-disable-next-line no-extend-native
				String.prototype.charCodeAt = original;
			}
			return count;
		};
		// Linear work reads about four times as much for four times the input.
		const name = "css-syntax-token-value-decoding-scans-escaped-at-signs-in-linear-time";
		expect(reads(`${name}-2`) / reads(name)).toBeLessThan(6);
	});
});

describe("CssSyntax — a skip set keeps the tree a full parse builds", () => {
	/**
	 * What a walk sees of the structure: rules, declarations and blocks.
	 * @param {string} css source
	 * @param {import("../../../lib/css/syntax-parser").SkipOptions=} skip skip options
	 * @param {"stylesheet" | "block-contents"=} as production
	 * @returns {string[]} the visit log
	 */
	const shape = (css, skip, as) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`@${path.name()}:${path.childCount()}`),
					[NodeType.QualifiedRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`rule:${path.source()}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}:${path.childCount()}`),
					[NodeType.Function]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`fn:${path.childCount()}`)
				})
			)
			.process(css, { skip, as });
		return log;
	};
	/**
	 * @param {number[]} types node types to drop
	 * @returns {import("../../../lib/css/syntax-parser").SkipOptions} skip options
	 */
	const types = (types) => ({ types: buildSkipSet(types) });

	it.each([
		fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-reads-a-div-hover-color"),
		fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-reads-a-b-foo-x-1-the"),
		fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-reads-a-b-x-1-foo-the"),
		fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-reads-a-b-1-x-1-the"),
		fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-reads-a-b-f-x-1-the"),
		fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-reads-a-b-x-1-the-same")
	])("reads %s the same with leaves dropped", (css) => {
		const full = shape(css).filter((l) => !l.startsWith("decl"));
		for (const type of [
			NodeType.Ident,
			NodeType.Number,
			NodeType.Whitespace,
			NodeType.Function
		]) {
			expect(shape(css, types([type])).filter((l) => !l.startsWith("decl"))).toEqual(
				full
			);
		}
	});

	it("skip.selectorPrelude still drops a top-level `--name:` rule", () => {
		const skip = { selectorPrelude: true };
		for (const css of [
			fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-selector-prelude"),
			fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-selector-prelude-2"),
			fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-selector-prelude-3"),
			fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-selector-prelude-4"),
			fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-selector-prelude-5")
		]) {
			expect(shape(css, skip)).toEqual(shape(css));
		}
		expect(shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-selector-prelude"), skip)).toEqual(["rule:b{}"]);
	});
});

describe("CssSyntax — block streaming reads the same tree", () => {
	// Comfortably past the node count a block streams its children at.
	const MANY = 3000;

	/**
	 * Each rule entered and each declaration's name, in walk order.
	 * @param {string} css source
	 * @returns {string[]} the visit log
	 */
	const walk = (css) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`@${path.name()}`),
					[NodeType.QualifiedRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`rule:${path.source(path.child(0))}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(path.name())
				})
			)
			.process(css);
		return log;
	};

	it("streams a block grown on declarations after a child rule", () => {
		const log = walk(fixture("css", "css-syntax-block-streaming-reads-the-same-tree-streams-a-block-grown-on"));
		expect(log.slice(0, 3)).toEqual(["rule:a", "rule:b", "c"]);
		expect(log).toHaveLength(MANY + 3);
		expect(log[log.length - 1]).toBe("d");
	});

	it("streams the rest of a block a descendant's growth activated", () => {
		const log = walk(fixture("css", "css-syntax-block-streaming-reads-the-same-tree-streams-the-rest-of-a-block-a"));
		expect(log.slice(0, 3)).toEqual(["rule:a", "rule:b", "c"]);
		expect(log.slice(-2)).toEqual(["rule:e", "d"]);
		expect(log).toHaveLength(MANY + 4);
	});

	it("streams a block grown on child rules", () => {
		const log = walk(fixture("css", "css-syntax-block-streaming-reads-the-same-tree-streams-a-block-grown-on-child"));
		expect(log).toHaveLength(MANY * 2 + 2);
		expect(log.slice(0, 2)).toEqual(["rule:a", "rule:b"]);
		expect(log[log.length - 1]).toBe("d");
	});
});

describe("CssSyntax — what a minifying print reads off the parse", () => {
	/**
	 * @param {string} css source
	 * @param {object=} options more process options
	 * @returns {string} minified
	 */
	const minify = (css, options) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(css, { mode: "minify", ...options })
		).code;

	it("collects a block of declarations alone for the longhand merge", () => {
		const css = fixture("css", "css-syntax-what-a-minifying-print-reads-off-the-parse-collects-a-block-of");
		expect(minify(css)).toMatchSnapshot();
	});
});
