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
	_propertyIdOf,
	normalizeUrl,
	parseABlocksContents,
	parseACommaSeparatedListOfComponentValues,
	parseAComponentValue,
	parseADeclaration,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents,
	Part,
	TokenStream
} = require("../../../lib/css/syntax-parser");

describe("CssSyntax — parser entry points", () => {
	it("takes the start offset and the options as optional", () => {
		expect(parseACommaSeparatedListOfComponentValues("a, b")).toHaveLength(2);
		expect(parseAStylesheetsContents("a{}")).toHaveLength(1);
		expect(parseABlocksContents("a:b").decls).toHaveLength(1);
		expect(parseARule("a{}")).toBeDefined();
		expect(parseAComponentValue("a")).toBeDefined();
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
});

describe("CssSyntax — Node / Token", () => {
	it("numbers a declaration's property by what it means", () => {
		/** @type {Record<string, number>} */
		const ids = {};
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					const id = _propertyIdOf(path.node);
					// A second read hands back what the first looked up.
					expect(_propertyIdOf(path.node)).toBe(id);
					ids[A.source(path.node).split(":")[0]] = id;
				}
			})
			.process(
				"a{color:1;COLOR:1;c\\6flor:1;word-wrap:1;overflow-wrap:1;" +
					"-webkit-transition:1;transition:1;--x:1;\\2d-y:1;foo:1;é:1;" +
					"value:1;gab:1}"
			);
		expect(ids.color).toBeGreaterThanOrEqual(0);
		expect(ids.COLOR).toBe(ids.color);
		expect(ids["c\\6flor"]).toBe(ids.color);
		expect(ids["word-wrap"]).toBe(ids["overflow-wrap"]);
		expect(ids["-webkit-transition"]).toBe(ids.transition);
		expect(ids.transition).not.toBe(ids.color);
		expect(ids["--x"]).toBe(-1);
		expect(ids["\\2d-y"]).toBe(-1);
		expect(ids.foo).toBe(-2);
		expect(ids["é"]).toBe(-2);
		// These two probe past a known name, of another length and of the same.
		expect(ids.value).toBe(-2);
		expect(ids.gab).toBe(-2);
	});
});

describe("CssSyntax — substitution span searches", () => {
	const { _hasSubstitutionInSpan } = require("../../../lib/css/syntax-parser");

	it.each(["", ";last:var(--x)"])(
		"shares one search across values without calls before %s",
		(suffix) => {
			expect.assertions(2);
			const css = `a{one:1;two:2;three:3${suffix}}`;
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

		it("prints a rule large enough to stream as written, and what follows it too", () => {
			// Past the streaming threshold the block is written out as it is read.
			let body = "";
			for (let i = 0; i < 1800; i++) {
				body += `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
			}
			const css = `a{${body}}b{color:red}`;
			const plain = print(css, {});
			for (const event of ["enter", "exit"]) {
				expect(
					print(css, {
						[NodeType.QualifiedRule]: {
							[event]: (
								/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
							) => {
								if (path.source().startsWith("a{")) path.replace("z{q:1}");
							}
						}
					})
				).toBe(plain);
			}
		});
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
		const big = `a{b:${"x ".repeat(70000)}}`;
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
		expect(processor.process(fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"), { mode: "minify" }).code).toBe(
			"a{color:red}"
		);
		expect(typeof processor._printer).toBe("function");
	});
});

describe("CssSyntax — nesting and error recovery", () => {
	it("fails on a nesting deeper than the stack as a parse error", () => {
		const deep = `a{b:${"(".repeat(100000)}}`;
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

		expect(code).toBe("color:red");
		// The list prints as one piece, so it anchors as one.
		expect(map.sources).toEqual(["style"]);
		expect(map.mappings).toBe("AAAA");
	});
});

describe("CssSyntax — path accessors", () => {
	/** @import { CssPath } from "../../../lib/css/syntax-parser" */
	const SRC =
		fixture("css", "css-syntax-path-accessors-exposes-every-field-read-on-the-current-node");

	it("exposes every field read on the current node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (/** @type {CssPath} */ path) => {
						log.push(`at:${path.name()}`);
						log.push(
							`atName:${path.source(.../** @type {[number, number]} */ (path.rangeOf(Part.name)))}`
						);
						log.push(`prelude:${path.childCount() > 0}`);
						log.push(
							`childRules:${path.fieldCount(Field.rules)}`
						);
						log.push(
							`decls:${path.fieldCount(Field.declarations)
							}`
						);
						log.push(`blockOpen:${SRC[/** @type {[number, number]} */ (path.rangeOf(Part.block))[0]]}`);
						log.push(`blockClose:${SRC[/** @type {[number, number]} */ (path.rangeOf(Part.block))[1] - 1]}`);
						log.push(`span:${SRC.slice(path.range()[0], path.range()[0] + 6)}`);
						log.push(`node:${path.node !== null}`);
						log.push(`parent:${path.parent}`);
					},
					[NodeType.Declaration]: (/** @type {CssPath} */ path) => {
						if (path.flag(Flag.important)) {
							log.push(
								`decl:${path.source(.../** @type {[number, number]} */ (path.rangeOf(Part.name)))}=${path.name()}`
							);
						}
					},
					[NodeType.Url]: (/** @type {CssPath} */ path) => {
						log.push(
							`url:${SRC.slice(/** @type {[number, number]} */ (path.rangeOf(Part.value))[0], /** @type {[number, number]} */ (path.rangeOf(Part.value))[1])}`
						);
					},
					[NodeType.SimpleBlock]: (/** @type {CssPath} */ path) => {
						log.push(`blockToken:${path.value()}`);
					},
					[NodeType.Function]: {
						enter: (/** @type {CssPath} */ path) => {
							if (path.name() === "var") {
								log.push(`fnChildren:${path.childCount() > 0}`);
							}
						},
						exit: (/** @type {CssPath} */ path) => {
							log.push(`fnExit:${path.name()}`);
						}
					},
					[NodeType.Comment]: {
						enter: (/** @type {CssPath} */ path) => {
							log.push(`comment:${SRC.slice(path.range()[0], path.range()[1])}`);
							log.push(`commentParent:${path.parent}`);
						},
						exit: () => log.push("commentExit")
					}
				})
			)
			.process(SRC);
		expect(log).toContain("at:media");
		expect(log).toContain("atName:media");
		expect(log).toContain("prelude:true");
		expect(log).toContain("childRules:1");
		expect(log).toContain("decls:0");
		expect(log).toContain("blockOpen:{");
		expect(log).toContain("blockClose:}");
		expect(log).toContain("blockToken:[");
		expect(log).toContain("span:@media");
		expect(log).toContain("node:true");
		expect(log).toContain("parent:null");
		expect(log).toContain("decl:co\\6cor=color");
		expect(log).toContain("url:x.png");
		expect(log).toContain("fnChildren:true");
		expect(log).toContain("fnExit:var");
		expect(log).toContain("comment:/* note */");
		expect(log).toContain("commentParent:null");
		expect(log).toContain("commentExit");
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
		 * @param {number} length number of escaped at-signs
		 * @returns {number} character reads while processing them
		 */
		const reads = (length) => {
			const src = `.a{color:red}${"\\@".repeat(length)}`;
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
		expect(reads(2000) / reads(500)).toBeLessThan(6);
	});
});

describe("CssSyntax — path reads on every node kind", () => {
	/**
	 * Run one visitor per node type over `css`, collecting what it returns.
	 * @param {string} css source
	 * @param {Record<number, (path: import("../../../lib/css/syntax-parser").CssPath) => unknown>} reads per-type reads
	 * @param {object=} options process options
	 * @returns {unknown[]} the reads, in walk order
	 */
	const collect = (css, reads, options) => {
		/** @type {unknown[]} */
		const out = [];
		/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */
		const map = {};
		for (const [type, read] of Object.entries(reads)) {
			map[Number(type)] = (
				/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
			) => {
				out.push(read(path));
			};
		}
		new SourceProcessor().use(map).process(css, options);
		return out;
	};

	it("reads names, values and flags that a node kind does not have as empty", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => [
			path.name(),
			path.value(),
			path.childCount(),
			path.children().length,
			path.flag(Flag.integer),
			path.flag(Flag.important),
			path.flag(Flag.id),
			path.rangeOf(Part.value),
			path.rangeOf(Part.block),
			path.textOf(Part.name)
		];
		expect(
			collect(fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is"), {
				[NodeType.Ident]: read,
				[NodeType.Declaration]: read
			})
		).toEqual([
			["", "a", 0, 0, false, false, false, null, null, null],
			["b", "", 1, 1, false, false, false, [4, 5], null, null],
			["", "c", 0, 0, false, false, false, null, null, null]
		]);
	});

	it("reads children, fields and fields by name", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => {
			const color = path.fieldNamed(Field.declarations, "color");
			return [
				path.index,
				path.children().map((n) => path.source(n)),
				/** @type {unknown} */ (path.child(0)) !== 0 && path.source(path.child(0)),
				path.child(9),
				path.fieldCount(Field.prelude),
				path.fieldCount(Field.value),
				path.fieldCount(Field.declarations),
				path.fieldCount(Field.rules),
				path.source(path.field(0, Field.prelude)),
				/** @type {unknown} */ (path.field(0, Field.rules)) !== 0 &&
					path.source(path.field(0, Field.rules)),
				/** @type {unknown} */ (path.field(1, Field.declarations)) !== 0 &&
					path.source(path.field(1, Field.declarations)),
				path.field(-1, Field.declarations),
				path.field(5, Field.declarations),
				/** @type {unknown} */ (color) !== 0 && path.source(color),
				path.fieldNamed(Field.declarations, "nope"),
				path.source(path.node)
			];
		};
		expect(
			collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-children-fields-and-fields-by"), {
				[NodeType.QualifiedRule]: read
			})
		).toEqual([
			[0, ["x"], "x", 0, 1, 0, 0, 0, "x", false, false, 0, 0, false, 0, "x{}"],
			[
				0,
				["a", " ", "b"],
				"a",
				0,
				3,
				0,
				2,
				0,
				"a",
				false,
				fixture("css", "source-processor-merging-adjacent-style-writes-a-style-attribute-whose-4"),
				0,
				0,
				fixture("css", "source-processor-merging-adjacent-style-writes-a-style-attribute-whose-4"),
				0,
				"a b{width:1;color:red}"
			],
			[0, ["c"], "c", 0, 1, 0, 0, 1, "c", "d{}", false, 0, 0, false, 0, "c{d{}}"],
			[0, ["d"], "d", 0, 1, 0, 0, 0, "d", false, false, 0, 0, false, 0, "d{}"]
		]);
		// Below the top level, each node knows its place among its siblings.
		expect(
			collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-children-fields-and-fields-by-2"), {
				[NodeType.Declaration]: (path) => path.index,
				[NodeType.QualifiedRule]: (path) => path.index
			})
		).toEqual([0, 0, 1, 0]);
		// A leaf has no children and no fields.
		expect(
			collect(fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is"), {
				[NodeType.Declaration]: (path) => [
					path.fieldCount(Field.declarations, path.child(0)),
					path.children(path.child(0))
				]
			})
		).toEqual([[0, []]]);
	});

	it("stop() ends the walk once, however often it is called", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					log.push(path.name());
					path.stop();
					path.stop();
				}
			})
			.process(fixture("css", "css-syntax-path-reads-on-every-node-kind-stop-ends-the-walk-once-however-often"));
		expect(log).toEqual(["b"]);
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
	const DECLS = "c:1 2 3 4;".repeat(MANY);

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

	it("walks an at-rule opening a block", () => {
		expect(walk(fixture("css", "css-syntax-block-streaming-reads-the-same-tree-walks-an-at-rule-opening-a-block"))).toEqual(["rule:a", "@media", "b"]);
	});

	it("streams a block grown on declarations after a child rule", () => {
		const log = walk(`a{b{}${DECLS}d:1}`);
		expect(log.slice(0, 3)).toEqual(["rule:a", "rule:b", "c"]);
		expect(log).toHaveLength(MANY + 3);
		expect(log[log.length - 1]).toBe("d");
	});

	it("streams the rest of a block a descendant's growth activated", () => {
		const log = walk(`a{b{${DECLS}}e{}d:1}`);
		expect(log.slice(0, 3)).toEqual(["rule:a", "rule:b", "c"]);
		expect(log.slice(-2)).toEqual(["rule:e", "d"]);
		expect(log).toHaveLength(MANY + 4);
	});

	it("streams a block grown on child rules", () => {
		const log = walk(`a{${"b c{}".repeat(MANY * 2)}d:1}`);
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
	// Comfortably past the node count a block streams its children at.
	const MANY = 3000;

	it("collects a block of declarations alone for the longhand merge", () => {
		const css = `a{${"margin-top:1px;margin-right:2px;margin-bottom:3px;margin-left:4px;".repeat(MANY)}}`;
		expect(minify(css)).toBe("a{margin:1px 2px 3px 4px}");
	});
});
