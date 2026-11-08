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
	parseAComponentValue,
	parseADeclaration,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents,
	Part,
	TokenStream
} = require("../../../lib/css/syntax-parser");

describe("CssSyntax — component values (tokenToNode)", () => {
	/**
	 * @param {string} s source
	 * @returns {import("../../../lib/css/syntax-parser").ComponentValue} its one component value
	 */
	const one = (s) =>
		/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
			parseAComponentValue(s)
		);

	it("decodes hash id vs unrestricted and url content", () => {
		expect(A.flag(Flag.id, one(fixture("css", "css-syntax-component-values-token-to-node-classifies-each-leaf-token-type-4")))).toBe(true);
		expect(A.flag(Flag.id, one(fixture("css", "css-syntax-component-values-token-to-node-decodes-hash-id-vs-unrestricted-and")))).toBe(false);
		const url = one(fixture("css", "css-syntax-component-values-token-to-node-classifies-each-leaf-token-type-6"));
		expect(A.value(url)).toBe("a.png");
		expect(A.rangeOf(Part.value, url)).toEqual([4, 9]);
	});

	it("reads no declarations or rules on non-rule nodes", () => {
		const fn = one(fixture("css", "css-syntax-component-values-token-to-node-exposes-function-name-and-nested"));
		expect(A.fieldCount(Field.declarations, fn)).toBe(0);
		expect(A.fieldCount(Field.rules, fn)).toBe(0);
	});
});

describe("CssSyntax — parser entry points", () => {
	/**
	 * @param {import("../../../lib/css/syntax-parser").Node} node a rule or stylesheet
	 * @param {number} field a `Field`
	 * @returns {import("../../../lib/css/syntax-parser").Node[]} that field's items
	 */
	const items = (node, field) => {
		const out = [];
		for (let i = 0, count = A.fieldCount(field, node); i < count; i++) {
			out.push(A.field(i, field, node));
		}
		return out;
	};

	it("parseARule parses qualified rules and at-rules", () => {
		const qr = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (
			parseARule(fixture("css", "css-syntax-parser-entry-points-parse-a-rule-parses-qualified-rules-and-at-rules"))
		);
		expect(A.type(qr)).toBe(NodeType.QualifiedRule);
		expect(A.fieldCount(Field.declarations, qr)).toBe(1);
		const at = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (
			parseARule(fixture("css", "css-syntax-parser-entry-points-parse-a-rule-parses-qualified-rules-and-at-rules-2"))
		);
		expect(A.type(at)).toBe(NodeType.AtRule);
		expect(A.name(at)).toBe("import");
		expect(A.fieldCount(Field.declarations, at)).toBe(0);
		expect(A.rangeOf(Part.block, at)).toBeNull();
	});

	it("re-parses a nested rule whose selector starts <ident><colon> as a qualified rule", () => {
		// consume-a-declaration bails on the top-level `{` (step 8 would reject
		// it) and the caller re-parses the input as a qualified rule (CSS Nesting)
		const { decls, rules } = parseABlocksContents(
			fixture("css", "css-syntax-parser-entry-points-re-parses-a-nested-rule-whose-selector-starts")
		);
		expect(decls).toHaveLength(0);
		expect(rules).toHaveLength(1);
		expect(A.type(rules[0])).toBe(NodeType.QualifiedRule);
		expect(A.fieldCount(Field.declarations, rules[0])).toBe(1);
	});

	it("parseAStylesheet builds nested rules and a full range", () => {
		const src = fixture("css", "css-syntax-parser-entry-points-parse-a-stylesheet-builds-nested-rules-and-a-full");
		const ss = parseAStylesheet(src);
		expect(A.type(ss)).toBe(NodeType.Stylesheet);
		const rules = items(ss, Field.rules);
		expect(rules.map((r) => A.type(r))).toEqual([
			NodeType.AtRule,
			NodeType.QualifiedRule
		]);
		expect(A.name(rules[0])).toBe("media");
		expect(items(rules[0], Field.rules).map((r) => A.type(r))).toEqual([
			NodeType.QualifiedRule
		]);
		expect(A.range(ss)).toEqual([0, src.length]);
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
	it("exposes range, loc and source over the input", () => {
		const decl = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration(fixture("css", "css-syntax-parser-entry-points-parse-a-declaration-parses-name-value-and"))
		);
		expect(A.type(decl)).toBe(NodeType.Declaration);
		expect(A.range(decl)).toEqual([A.start(decl), A.end(decl)]);
		expect(A.source(decl)).toBe("color: red");
		expect(A.loc(decl)).toEqual([1, 0, 1, 10]);
	});

	it("computes 1-based line / 0-based column via loc", () => {
		/** @type {[number, number, number, number] | undefined} */
		let loc;
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => (loc = path.loc())
			})
			.process(fixture("css", "css-syntax-node-token-computes-1-based-line-0-based-column-via-loc"));
		expect(loc).toEqual([2, 2, 3, 0]);
	});

	it("ranges a declaration's value without its `!important`", () => {
		const src = fixture("css", "css-syntax-node-token-ranges-a-declaration-s-value-without-its-important");
		/** @type {string[]} */
		const values = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					const range = path.rangeOf(Part.value);
					values.push(range === null ? "none" : src.slice(range[0], range[1]));
				}
			})
			.process(src);
		expect(values).toEqual(["RED", "none", "x y"]);
	});

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

	it("reads names, values and parts through A", () => {
		/**
		 * @param {string} src source
		 * @returns {import("../../../lib/css/syntax-parser").ComponentValue} its one component value
		 */
		const one = (src) =>
			/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
				parseAComponentValue(src)
			);

		// value: ident escapes resolved; a string drops its quotes, a hash its `#`
		expect(A.value(one(fixture("css", "css-syntax-node-token-reads-names-values-and-parts-through-a")))).toBe("abc");
		expect(A.value(one(fixture("css", "css-syntax-node-token-reads-names-values-and-parts-through-a-2")))).toBe("x");
		expect(A.value(one(fixture("css", "css-syntax-component-values-token-to-node-classifies-each-leaf-token-type-4")))).toBe("id");

		// a function's name and where it is written
		const fn = one(fixture("css", "css-syntax-component-values-token-to-node-classifies-each-leaf-token-type-7"));
		expect(A.rangeOf(Part.name, fn)).toEqual([0, 3]);
		expect(A.name(fn)).toBe("foo");

		// a simple block's value is its opening bracket
		expect(A.value(one(fixture("css", "css-syntax-component-values-token-to-node-classifies-each-leaf-token-type-8")))).toBe("[");

		// a qualified rule's prelude and block
		const src = fixture("css", "css-syntax-node-token-reads-names-values-and-parts-through-a-3");
		const rule = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (
			parseARule(src)
		);
		expect(A.childCount(rule)).toBeGreaterThan(0);
		expect(A.endOf(Part.block, rule)).toBe(src.length);
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

		it("prints a value token, a declaration and a rule as their replacement", () => {
			const css = fixture("css", "css-syntax-source-processor-replacing-a-node-prints-a-value-token-a-declaration");
			expect(print(css, { [NodeType.Hash]: (path) => path.replace("blue") })).toBe(
				"a{color:blue;margin-top:1px}b{color:red}"
			);
			expect(
				print(css, {
					[NodeType.Declaration]: (path) => {
						if (path.name() === "margin-top") path.replace("padding:2px");
					}
				})
			).toBe("a{color:red;padding:2px}b{color:red}");
			expect(
				print(css, {
					[NodeType.QualifiedRule]: (path) => {
						if (path.source().startsWith("b")) path.replace("i{x:y}");
					}
				})
			).toBe("a{color:red;margin-top:1px}i{x:y}");
			expect(
				print(
					css,
					{ [NodeType.Hash]: (path) => path.replace("blue") },
					"beautify"
				)
			).toBe("a {\ncolor: blue;\nmargin-top: 1px;\n}b {\ncolor: red;\n}");
		});

		it("removes a node, in an enter visitor too", () => {
			expect(
				print(fixture("css", "css-syntax-source-processor-replacing-a-node-removes-a-node-in-an-enter-visitor"), {
					[NodeType.Declaration]: {
						enter: (path) => {
							if (path.name() === "color") path.remove();
						}
					}
				})
			).toBe("a{top:0}");
		});

		it("prints what holds a replacement without the rewrites, and the rest with them", () => {
			expect(
				print(fixture("css", "css-syntax-source-processor-replacing-a-node-prints-what-holds-a-replacement"), {
					[NodeType.Hash]: (path) => path.replace("1px")
				})
			).toBe("a{margin:0;margin-top:1px}b{margin:1px 0 0}");
		});

		it("composes a style attribute's declarations as they printed", () => {
			const result = new SourceProcessor()
				.use({
					[NodeType.Declaration]: (path) => {
						if (path.name() === "margin-top") path.replace("padding:0");
					}
				})
				.process(
					fixture("css", "css-syntax-source-processor-replacing-a-node-composes-a-style-attribute-s"),
					{ mode: "minify", as: "block-contents" }
				);
			expect(result && result.code).toBe(
				"padding:0;margin-bottom:1px;margin-left:2px;margin-right:2px"
			);
		});

		it("leaves a comment and what follows it as written", () => {
			// A comment is read from the token stream, not printed as a node.
			expect(
				print(fixture("css", "css-syntax-source-processor-replacing-a-node-leaves-a-comment-and-what-follows"), {
					[NodeType.Comment]: (path) => path.replace("/*y*/")
				})
			).toBe("/*! x */a{color:red}b{top:0}");
		});

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

		it("prints a replacement in a custom property's value, the rest as written", () => {
			/** @type {import("../../../lib/css/syntax-parser").CssVisitorMap} */
			const visitors = { [NodeType.Hash]: (path) => path.replace("blue") };
			expect(print(fixture("css", "css-syntax-source-processor-replacing-a-node-prints-a-replacement-in-a-custom"), visitors)).toBe(
				"a{--x:foo  blue bar(blue);color:blue}"
			);
			expect(
				print(fixture("css", "css-syntax-source-processor-replacing-a-node-prints-a-replacement-in-a-custom-2"), visitors, "beautify")
			).toBe("a {\n--x: foo  blue bar(blue);\n}");
			// A comma and whitespace print as written too.
			expect(
				print(fixture("css", "css-syntax-source-processor-replacing-a-node-prints-a-replacement-in-a-custom-3"), {
					[NodeType.Comma]: (path) => path.replace(" / "),
					[NodeType.Whitespace]: (path) => path.remove()
				})
			).toBe("a{--x:a / bc;b:x}");
			// A string the input ran out in is closed, so the `}` stays outside it.
			expect(print(fixture("css", "css-syntax-source-processor-replacing-a-node-prints-a-replacement-in-a-custom-4"), visitors)).toBe('a{--x:blue "open"}');
			// Only a value holding an edit is printed as written.
			expect(print(fixture("css", "css-syntax-source-processor-replacing-a-node-prints-a-replacement-in-a-custom-5"), visitors)).toBe(
				"a{--x:a b;--y:c  blue}"
			);
		});

		it("does nothing on a walk that prints nothing", () => {
			let seen = 0;
			new SourceProcessor()
				.use({
					[NodeType.Hash]: (path) => {
						seen++;
						path.replace("blue");
					}
				})
				.process(fixture("css", "css-syntax-source-processor-replacing-a-node-does-nothing-on-a-walk-that-prints"));
			expect(seen).toBe(1);
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
			.process(fixture("css", "css-syntax-source-processor-exposes-range-unescaped-type-flags-set-end-set-block"));
		expect(seen.idFlag).toBe(false);
		expect(seen.integerFlag).toBe(true);
		expect(seen.hashValue).toBe("123");
		expect(seen.unescaped).toBe("x");
		expect(Array.isArray(seen.range)).toBe(true);
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
			.process(fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"));
		expect(log).toEqual(["qr"]);
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

	it("surfaces comments through the NodeType.Comment visitor", () => {
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use({ [NodeType.Declaration]: () => {} })
			.use({ [NodeType.Comment]: (path) => seen.push(path.source()) })
			.process(fixture("css", "css-syntax-source-processor-surfaces-comments-through-the-node-type-comment"));
		expect(seen).toEqual(["/*!c*/"]);
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

	it('as: "block-contents" walks a block\'s contents (style attribute)', () => {
		/** @type {string[]} */
		const names = [];
		/** @type {string[]} */
		const urls = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => names.push(path.name()),
					[NodeType.Url]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => urls.push(/** @type {string} */ (path.value()))
				})
			)
			.process(fixture("css", "css-syntax-source-processor-as-block-contents-walks-a-block-s-contents-style"), {
				as: "block-contents"
			});
		expect(names).toEqual(["color", "background"]);
		expect(urls).toEqual(["a.png"]);
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
	/**
	 * @param {string} src css source
	 * @returns {{ type: number, childRules: number, decls: number }[]} top-level rule summary
	 */
	const rules = (src) => {
		const ss = parseAStylesheet(src);
		const out = [];
		for (let i = 0, count = A.fieldCount(Field.rules, ss); i < count; i++) {
			const r = A.field(i, Field.rules, ss);
			out.push({
				type: A.type(r),
				childRules: A.fieldCount(Field.rules, r),
				decls: A.fieldCount(Field.declarations, r)
			});
		}
		return out;
	};

	it("parses nested style rules and mixed declarations", () => {
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-parses-nested-style-rules-and-mixed"))[0]).toMatchObject({
			type: NodeType.QualifiedRule,
			childRules: 1
		});
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-parses-nested-style-rules-and-mixed-2"))[0]).toMatchObject({
			childRules: 1,
			decls: 1
		});
	});

	it("parses at-rules nested inside a style rule block", () => {
		expect(rules(fixture("css", "css-syntax-block-streaming-reads-the-same-tree-walks-an-at-rule-opening-a-block"))[0].childRules).toBe(1);
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-parses-at-rules-nested-inside-a-style-rule"))[0]).toMatchObject({
			type: NodeType.AtRule,
			childRules: 1
		});
	});

	it("recovers from malformed nested rules and declarations", () => {
		// a qualified rule with no block, terminated by the enclosing `}`
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-recovers-from-malformed-nested-rules-and"))[0].childRules).toBe(0);
		// bad declarations (no colon / pure garbage) are dropped, rule survives
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-recovers-from-malformed-nested-rules-and-2"))[0]).toMatchObject({ decls: 0 });
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-recovers-from-malformed-nested-rules-and-3"))[0]).toMatchObject({ decls: 0 });
	});

	it("preserves stray closers in a rule prelude", () => {
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-preserves-stray-closers-in-a-rule-prelude"))[0].type).toBe(NodeType.QualifiedRule);
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-preserves-stray-closers-in-a-rule-prelude-2"))[0].type).toBe(NodeType.AtRule);
	});

	it("treats a declaration-like prelude with a block as a parse error", () => {
		// `ident :` followed by a block is not a valid qualified rule; at the top
		// level the block is consumed and the rule dropped, nested it recovers.
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-treats-a-declaration-like-prelude-with-a"))).toHaveLength(0);
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-treats-a-declaration-like-prelude-with-a-2"))[0].childRules).toBe(1);
		// a `--custom: { … }` nested inside a block is a custom property, not a
		// rule: it produces neither a child rule nor (with a block value) a decl.
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-treats-a-declaration-like-prelude-with-a-3"))[0].childRules).toBe(0);
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-treats-a-declaration-like-prelude-with-a-4"))[0].childRules).toBe(0);
	});

	it("drops bad declarations but keeps the surrounding rule", () => {
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-drops-bad-declarations-but-keeps-the"))[0].decls).toBe(0);
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-drops-bad-declarations-but-keeps-the-2"))[0].type).toBe(NodeType.AtRule);
		expect(rules(fixture("css", "css-syntax-nesting-and-error-recovery-drops-bad-declarations-but-keeps-the-3"))[0].childRules).toBe(1);
	});

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

	it.each(LEAF_TYPES)(
		"skips every %s leaf (value + function arg) and leaves other types untouched",
		(name, type) => {
			const counts = countByType(VALUE_CSS, [type]);
			// The skipped type is fully dropped, in both the top-level value list
			// and the nested function's arg list.
			expect(counts[type] || 0).toBe(0);
			// Every other leaf type is unaffected.
			for (const [, other] of LEAF_TYPES) {
				if (other === type) continue;
				expect(counts[other] || 0).toBe(base[other] || 0);
			}
			// Structure still parses: the declaration and its function survive.
			expect(counts[NodeType.Declaration]).toBe(base[NodeType.Declaration]);
			expect(counts[NodeType.Function]).toBe(base[NodeType.Function]);
		}
	);

	it("skipping Function drops the function and its whole arg subtree", () => {
		const counts = countByType(VALUE_CSS, [NodeType.Function]);
		expect(counts[NodeType.Function] || 0).toBe(0);
		// bar()'s args (9 baz #aaa 2px "t" %) are no longer walked, so the nested
		// leaves drop out while the top-level value leaves remain.
		expect(counts[NodeType.Ident]).toBe(1); // only top-level `foo`
		expect(counts[NodeType.Number]).toBe(1); // only top-level `10`
		expect(counts[NodeType.Declaration]).toBe(base[NodeType.Declaration]);
	});

	it("skipping SimpleBlock drops the block and its whole subtree", () => {
		// `(7 qux)` is a paren simple block holding a Number and an Ident.
		const counts = countByType(fixture("css", "css-syntax-skip-set-css-process-options-skip-skipping-simple-block-drops-the"), [NodeType.SimpleBlock]);
		expect(counts[NodeType.SimpleBlock] || 0).toBe(0);
		expect(counts[NodeType.Number] || 0).toBe(0); // nested 7 not walked
		expect(counts[NodeType.Ident]).toBe(1); // only top-level foo, not qux
	});

	it("a combined skip set drops every listed type at once", () => {
		const counts = countByType(VALUE_CSS, [
			NodeType.Number,
			NodeType.Dimension,
			NodeType.Ident
		]);
		expect(counts[NodeType.Number] || 0).toBe(0);
		expect(counts[NodeType.Dimension] || 0).toBe(0);
		expect(counts[NodeType.Ident] || 0).toBe(0);
		// A type left out of the set is still visited.
		expect(counts[NodeType.Hash]).toBe(base[NodeType.Hash]);
	});

	it("skip.selectorPrelude drops the selector prelude but keeps the block", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`ident:${path.value()}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`)
				})
			)
			.process(fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-drops-the"), {
				skip: { selectorPrelude: true }
			});
		// Selector idents (foo, bar) are never materialized; the value ident (red)
		// and the declaration still are.
		expect(log).toEqual(["decl:color", "ident:red"]);
	});

	it("skip.selectorPrelude still surfaces url() inside a selector prelude", () => {
		/** @type {string[]} */
		const urls = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Url]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => urls.push(/** @type {string} */ (path.value()))
				})
			)
			.process(fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-still"), {
				skip: { selectorPrelude: true }
			});
		expect(urls).toEqual(["p.png"]);
	});

	it("skip.selectorPrelude recovers from a stray } in the selector prelude", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`),
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`ident:${path.value()}`)
				})
			)
			.process(fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-recovers-from"), {
				skip: { selectorPrelude: true }
			});
		// Stray `}`s in the prelude are a parse error; skip mode still tracks them as
		// the disambiguation tokens, recovers, and walks the block (decl + value ident).
		expect(log).toEqual(["decl:color", "ident:red"]);
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

		// A bare `url(` is the other name the scan hands back to the tokenizer, and
		// skip mode drops the token lexed there — as it always has, a url visitor
		// reaching one only through a function. The scan owes the rule boundary.
		it("reads the rule around a bare url() the prelude drops", () => {
			expect(walk(fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-22"), true)).toEqual([
				"rule:0-27",
				"decl:color"
			]);
		});

		it("keeps a url the prelude's own function holds", () => {
			expect(walk(fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-selector-prelude-reads-the-19"), true)).toContain(
				"url:p.png"
			);
		});
	});

	it("skip.atRulePrelude drops the at-rule prelude but keeps the block", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`at:${path.name()}`),
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`ident:${path.value()}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`)
				})
			)
			.process(fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-at-rule-prelude-drops-the-at"), {
				skip: { atRulePrelude: true }
			});
		// The at-rule fires, its prelude ident (min-width) is dropped, and the
		// block (the nested rule + its declaration + value ident) is still walked.
		expect(log).toEqual(["at:media", "ident:a", "decl:color", "ident:red"]);
	});

	it("skip.atRulePrelude still surfaces url() in an at-rule prelude (@import)", () => {
		/** @type {string[]} */
		const urls = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Url]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => urls.push(/** @type {string} */ (path.value()))
				})
			)
			.process(fixture("css", "css-syntax-skip-set-css-process-options-skip-skip-at-rule-prelude-still-surfaces"), {
				skip: { atRulePrelude: true }
			});
		expect(urls).toEqual(["x.css"]);
	});

	it("the object backend (parseAStylesheet) ignores a prior skip and builds the full tree", () => {
		// Run a skipping stream parse first, then a full parse — the object backend
		// must reset the skip state so `parseA*` are never affected.
		new SourceProcessor()
			.use({ [NodeType.Declaration]: () => {} })
			.process(fixture("css", "css-syntax-skip-set-css-process-options-skip-the-object-backend-parse"), {
				skip: { types: buildSkipSet([NodeType.Number]) }
			});
		const decl = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration(fixture("css", "css-syntax-skip-set-css-process-options-skip-the-object-backend-parse-2"))
		);
		const valueTypes = A.children(decl).map((n) => A.type(n));
		expect(valueTypes).toContain(NodeType.Number);
		expect(valueTypes).toContain(NodeType.Dimension);
	});

	it("accepts skip as per-call process options", () => {
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Number]: () => seen.push("num"),
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => seen.push(/** @type {string} */ (path.value()))
				})
			)
			.process(fixture("css", "css-syntax-skip-set-css-process-options-skip-accepts-skip-as-per-call-process"), {
				as: "block-contents",
				skip: { types: buildSkipSet([NodeType.Number]) }
			});
		// The per-call skip drops numbers.
		expect(seen).toEqual(["foo"]);
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

	it("reads prelude and declarations of a qualified rule", () => {
		/** @type {unknown[]} */
		const out = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.QualifiedRule]: (/** @type {CssPath} */ path) => {
						out.push([
							path.childCount() > 0,
							path.fieldCount(Field.declarations),
							path.fieldCount(Field.rules)
						]);
					}
				})
			)
			.process(fixture("css", "css-syntax-path-accessors-reads-prelude-and-declarations-of-a-qualified-rule"));
		expect(out).toEqual([[true, 1, 0]]);
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

// cspell:ignore amespace rtant
describe("CssSyntax — §5 parsing algorithms", () => {
	/**
	 * @param {number} node a node
	 * @param {number} field which of its fields
	 * @returns {number[]} the field's items
	 */
	const items = (node, field) => {
		const out = [];
		for (let i = 0, n = A.fieldCount(field, node); i < n; i++) {
			out.push(A.field(i, field, node));
		}
		return out;
	};
	/**
	 * @param {number} node a node
	 * @param {number} field which of its fields
	 * @returns {string} the field's items' source, joined
	 */
	const text = (node, field) =>
		items(node, field)
			.map((n) => A.source(n))
			.join("");
	/**
	 * @param {string} src css source
	 * @returns {string[]} each top-level rule as `prelude{decl,…|child,…}`
	 */
	const outline = (src) =>
		items(parseAStylesheet(src), Field.rules).map(
			(r) =>
				`${text(r, Field.prelude)}{${items(r, Field.declarations)
					.map((d) => `${A.name(d)}=${text(d, Field.value)}`)
					.join(",")}|${items(r, Field.rules)
					.map((c) => text(c, Field.prelude))
					.join(",")}}`
		);

	it("parseARule reads a block-less at-rule without a block range", () => {
		const rule = /** @type {number} */ (parseARule(fixture("css", "css-syntax-5-parsing-algorithms-parse-a-rule-reads-a-block-less-at-rule-without-a")));
		expect(A.name(rule)).toBe("import");
		expect(text(rule, Field.prelude)).toBe(" x");
		expect(A.rangeOf(Part.block, rule)).toBeNull();
		expect(A.fieldCount(Field.declarations, rule)).toBe(0);
		expect(A.range(rule)).toEqual([0, 9]);
	});

	it("parseARule ends an unclosed block at end of input", () => {
		const src = fixture("css", "css-syntax-5-parsing-algorithms-parse-a-rule-ends-an-unclosed-block-at-end-of");
		const rule = /** @type {number} */ (parseARule(src));
		expect([
			A.startOf(Part.block, rule),
			A.endOf(Part.block, rule),
			A.end(rule)
		]).toEqual([1, src.length, src.length]);
		expect(items(rule, Field.declarations).map((d) => A.source(d))).toEqual([
			"x:1"
		]);
	});

	it("parseADeclaration discards whitespace around comments before and after the colon", () => {
		const decl = /** @type {number} */ (parseADeclaration(fixture("css", "css-syntax-5-parsing-algorithms-parse-a-declaration-discards-whitespace-around")));
		expect(A.name(decl)).toBe("a");
		expect(items(decl, Field.value).map((n) => A.source(n))).toEqual(["b"]);
		expect(A.start(decl)).toBe(2);
	});

	it("matches `!important` on the ident's value, escapes resolved", () => {
		/**
		 * @param {string} src declaration source
		 * @returns {[boolean, string]} important flag and the value left
		 */
		const imp = (src) => {
			const decl = /** @type {number} */ (parseADeclaration(src));
			return [A.flag(Flag.important, decl), text(decl, Field.value)];
		};
		expect(imp(fixture("css", "css-syntax-5-parsing-algorithms-matches-important-on-the-ident-s-value-escapes"))).toEqual([true, "b"]);
		expect(imp(fixture("css", "css-syntax-5-parsing-algorithms-matches-important-on-the-ident-s-value-escapes-2"))).toEqual([true, "b"]);
		// The ident at end of input ends in an escape naming U+FFFD.
		expect(imp(fixture("css", "css-syntax-5-parsing-algorithms-matches-important-on-the-ident-s-value-escapes-3"))).toEqual([false, "b !important\\"]);
		expect(imp(fixture("css", "css-syntax-5-parsing-algorithms-matches-important-on-the-ident-s-value-escapes-4"))).toEqual([false, "b important"]);
	});

	it("starts a qualified rule's prelude with a stray `}` or with nothing", () => {
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-starts-a-qualified-rule-s-prelude-with-a-stray"))).toEqual(["}a{x=1|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-starts-a-qualified-rule-s-prelude-with-a-stray-2"))).toEqual(["{x=1|}"]);
	});

	it("drops a top-level `--name:` rule whose name is escaped (§5.4.3)", () => {
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-drops-a-top-level-name-rule-whose-name-is"))).toEqual(["b{|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-drops-a-top-level-name-rule-whose-name-is-2"))).toEqual(["b{|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-drops-a-top-level-name-rule-whose-name-is-3"))).toEqual(["b{|}"]);
		// Not dashed: a rule, whatever the second code point is.
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-drops-a-top-level-name-rule-whose-name-is-4"))).toEqual(["-a:{x=1|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-drops-a-top-level-name-rule-whose-name-is-5"))).toEqual(["-\\61 :{x=1|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-drops-a-top-level-name-rule-whose-name-is-6"))).toEqual(["a:{x=1|}"]);
	});

	it("reads a nested `--name:` with an escaped name as a custom property (§5.4.6)", () => {
		// A custom property takes a `{}` block beside other values; any other
		// declaration does not and is re-read as a nested rule.
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-reads-a-nested-name-with-an-escaped-name-as-a"))).toEqual(["a{--x={b} c|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-reads-a-nested-name-with-an-escaped-name-as-a-2"))).toEqual(["a{--x={b} c|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-reads-a-nested-name-with-an-escaped-name-as-a-3"))).toEqual(["a{|x-:}"]);
	});

	it("peeks past comments for a declaration's colon", () => {
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-peeks-past-comments-for-a-declaration-s-colon"))).toEqual(["a{b=d|}"]);
		// Unterminated comment, and an ident running into end of input.
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-peeks-past-comments-for-a-declaration-s-colon-2"))).toEqual(["a{|}"]);
		expect(outline(fixture("css", "css-syntax-5-parsing-algorithms-peeks-past-comments-for-a-declaration-s-colon-3"))).toEqual(["a{|}"]);
	});

	it("keeps a top-level at-rule even when its prelude holds a stray `}`", () => {
		const rules = parseAStylesheetsContents(fixture("css", "css-syntax-5-parsing-algorithms-keeps-a-top-level-at-rule-even-when-its-prelude"));
		expect(rules.map((r) => text(r, Field.prelude))).toEqual([" } y", ""]);
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

	it("reads numeric values, units and integer flags", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => [
			path.value(),
			path.name(),
			path.flag(Flag.integer),
			path.rangeOf(Part.name)
		];
		expect(
			collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-numeric-values-units-and-integer"), {
				[NodeType.Dimension]: read,
				[NodeType.Percentage]: read,
				[NodeType.Number]: read
			})
		).toEqual([
			[10, "PX", true, [6, 8]],
			[1.5, "", false, null],
			[-2, "", true, null],
			[30, "em", false, [20, 22]]
		]);
		// A unit the input ran out of ends in U+FFFD.
		expect(
			collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-numeric-values-units-and-integer-2"), {
				[NodeType.Dimension]: (path) => path.name()
			})
		).toEqual(["p�"]);
	});

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

	it("reads a comment's text, closed or running into end of input", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => path.value();
		expect(
			collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-a-comment-s-text-closed-or"), {
				[NodeType.QualifiedRule]: () => "rule",
				[NodeType.Comment]: read
			})
		).toEqual([" a ", "rule", " b"]);
		expect(collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-a-comment-s-text-closed-or-2"), { [NodeType.Comment]: read })).toEqual([""]);
	});

	it("reads a block's start and end only on a rule that has one", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => [path.startOf(Part.block), path.endOf(Part.block)];
		expect(
			collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-a-block-s-start-and-end-only-on-a"), {
				[NodeType.AtRule]: read,
				[NodeType.QualifiedRule]: read
			})
		).toEqual([
			[-1, -1],
			[5, 7],
			[8, 10]
		]);
		expect(
			collect(fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is"), {
				[NodeType.Ident]: (path) => [
					path.startOf(Part.block),
					path.endOf(Part.block),
					path.startOf(Part.name),
					path.endOf(Part.name),
					path.startOf(Part.value),
					path.endOf(Part.value)
				]
			})[0]
		).toEqual([-1, -1, -1, -1, -1, -1]);
		expect(
			collect(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-a-block-s-start-and-end-only-on-a-2"), {
				[NodeType.Url]: (path) => [path.startOf(Part.value), path.endOf(Part.value)]
			})
		).toEqual([[8, 9]]);
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

	it.each([
		["a comment", NodeType.Comment],
		["a rule", NodeType.QualifiedRule]
	])("stop() in %s reads past the comments after it", (_, type) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Comment]: () => log.push("comment"),
				[type]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					log.push("stop");
					path.stop();
				}
			})
			.process(fixture("css", "css-syntax-path-reads-on-every-node-kind-stop-in-a-comment-reads-past-the"));
		expect(log).toEqual(
			// A comment's own visitor is the one that stops.
			type === NodeType.Comment ? ["stop"] : ["comment", "comment", "comment", "stop"]
		);
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

	it("drops a stray `}` from a value only when its type is skipped", () => {
		expect(shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-drops-a-stray-from-a"), undefined, "block-contents")).toEqual(["decl:p:5"]);
		expect(
			shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-drops-a-stray-from-a"), types([NodeType.RightCurlyBracket]), "block-contents")
		).toEqual(["decl:p:4"]);
	});

	it("drops a skipped function or block from a function's arguments", () => {
		expect(shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-drops-a-skipped"), undefined, "block-contents")).toEqual([
			"decl:p:1",
			"fn:5",
			"fn:1"
		]);
		expect(
			shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-drops-a-skipped"), types([NodeType.Function]), "block-contents")
		).toEqual(["decl:p:0"]);
		expect(
			shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-drops-a-skipped"), types([NodeType.SimpleBlock]), "block-contents")
		).toEqual(["decl:p:1", "fn:4", "fn:1"]);
	});

	it("skip.atRulePrelude drops a stray `}` from a top-level at-rule's prelude", () => {
		expect(shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-at-rule-prelude"))).toEqual(["@x:4"]);
		expect(shape(fixture("css", "css-syntax-a-skip-set-keeps-the-tree-a-full-parse-builds-skip-at-rule-prelude"), { atRulePrelude: true })).toEqual(["@x:0"]);
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
