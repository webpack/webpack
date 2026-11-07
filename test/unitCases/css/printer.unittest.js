"use strict";

const { fixture } = require("../../helpers/fixture");

const fs = require("fs");
const path = require("path");
const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	A,
	buildSkipSet,
	Field,
	NodeType,
	escapeIdentifier,
	normalizeUrl,
	parseAStylesheet,
	Part
} = require("../../../lib/css/syntax-parser");

// cspell:ignore OLOR abcdefghijklmnopqrstuvwxyzabcdefgh acontent arting auop conten displa imptant inear laye olor pmportant pxcustom suppo webk widt

/**
 * @param {string} css a stylesheet
 * @param {string[]=} browsers the browserslist selection to target
 * @param {import("../../../lib/css/syntax-parser").CssEnvironment=} abilities the CSS abilities the target reads
 * @returns {string} its minified serialization
 */
const minifyFor = (css, browsers, abilities) =>
	new SourceProcessor().process(css, {
		mode: "minify",
		environment: browsers ? { ...abilities, browsers } : abilities
	}).code;

/**
 * Minify for a browserslist selection with some of the rewrites set.
 * @param {string} css source text
 * @param {string[]} browsers the browserslist selection to target
 * @param {import("../../../lib/css/syntax-parser").CssTransformOptions} transforms the rewrites to set
 * @returns {string} its minified serialization
 */
const minifyForWith = (css, browsers, transforms) =>
	new SourceProcessor().process(css, {
		mode: "minify",
		environment: { browsers },
		transforms
	}).code;

describe("CssSyntax — block streaming", () => {
	// A block streams once it holds more than `_STREAM_MIN_NODES` nodes; under that
	// it is collected and walked in one batch. `BIG` clears the threshold, `SMALL`
	// stays under, and each case pins which it exercises if the threshold moves.
	/** @type {(i: number) => string} */
	// Distinct blocks: rules printing the same one join into a selector list, and
	// what these cases are about is the streaming, not the joining.
	const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
	/** @type {(n: number, f: (i: number) => string) => string} */
	const repeat = (n, f) => {
		let s = "";
		for (let i = 0; i < n; i++) s += f(i);
		return s;
	};
	const BIG = repeat(1800, rule);
	const SMALL = repeat(4, rule);

	/**
	 * Child rules the first rule of `type` reports: 0 means it streamed (its
	 * children went to the visitors, not to its body), a positive count means it
	 * was collected.
	 * @param {string} src css source
	 * @param {number=} type the node type to look at (default `AtRule`)
	 * @returns {number | null} the count, or null if that rule has no block
	 */
	const childCount = (src, type = NodeType.AtRule) => {
		/** @type {number | null} */
		let count = null;
		let seen = false;
		new SourceProcessor()
			.use({
				[type]: (/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path) => {
					if (seen) return;
					seen = true;
					count =
						path.rangeOf(Part.block) === null ? null : path.fieldCount(Field.rules);
				}
			})
			.process(src, { mode: "minify" });
		return count;
	};

	/**
	 * Every node the walk visits, as `type|index|start`, entering and exiting.
	 * @param {string} src css source
	 * @param {import("../../../lib/css/syntax-parser").CssProcessOptions=} extra more options
	 * @returns {string[]} the visit sequence
	 */
	const walk = (src, extra) => {
		/** @type {string[]} */
		const seq = [];
		/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */
		const map = {};
		for (const name of Object.keys(NodeType)) {
			const type = NodeType[/** @type {keyof typeof NodeType} */ (name)];
			map[type] = {
				enter: (/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path) =>
					seq.push(`+${name}|${path.index}|${path.range()[0]}`),
				exit: (/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path) =>
					seq.push(`-${name}|${path.index}|${path.range()[0]}`)
			};
		}
		new SourceProcessor().use(map).process(src, extra);
		return seq;
	};

	/**
	 * @param {string} src css source
	 * @returns {string} its minified output
	 */
	const minify = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("streams a block past the threshold and collects one under it", () => {
		expect(childCount(`@media screen{${BIG}}`)).toBe(0);
		expect(childCount(`@media screen{${SMALL}}`)).toBe(4);
	});

	it("cuts a dead rule where it stands after an earlier cut in the piece", () => {
		// Sibling `@layer a` blocks fold into one piece, so a batch cuts twice in
		// it — and its own second span must name where the first cut left it.
		const dead = ".p{color:red}.q{color:blue}";
		const victim =
			".victim{opacity:1;background:red;border-radius:0;align-items:flex-start}";
		const src = `@layer outer{${repeat(
			6000,
			(i) => `.f${i}{color:red}`
		)}@layer a{${dead}}@layer a{${dead}}@layer a{${victim}}@layer a{.q{color:blue}}}`;
		// The outer block has to stream for the fold to be the one under test.
		expect(childCount(src)).toBe(0);
		const out = minify(src);
		// Sliced, so a wrong cut reads as the mangled rule and not as the sheet.
		const at = out.indexOf(".victim");
		expect(out.slice(at, at + victim.length)).toBe(victim);
	});

	it("folds no block of a layer over a streamed block of that layer", () => {
		// A streamed block is one its parent's gather never saw, so a later block
		// of its layer must not fold in front of it — that order is the cascade's.
		const src = `@layer outer{@layer a{.one{color:red}}@layer a{${BIG}}@layer a{.three{color:teal}}}`;
		// The middle block has to stream for the gather to be the one under test.
		expect(childCount(`@layer a{${BIG}}`)).toBe(0);
		const out = minify(src);
		expect(out.indexOf(".one")).toBeLessThan(out.indexOf(".c0"));
		expect(out.indexOf(".c0")).toBeLessThan(out.indexOf(".three"));
	});

	it("joins the pair a gathered layer block leaves side by side", () => {
		// The gather is what makes the two neighbors, so nothing else reads them
		// as adjacent — and the sheet would join them only on a second minify.
		const src = `@layer outer{${repeat(
			6000,
			(i) => `.f${i}{color:red}`
		)}@layer a{.w{color:teal}.x{color:lime}}@layer b{.m{color:#00f}}@layer a{.y{color:lime}.z{color:teal}}}`;
		// The outer block has to stream for the gather to be the one under test.
		expect(childCount(src)).toBe(0);
		const out = minify(src);
		expect(out).toContain(".x,.y{color:lime}");
		// Only the seam joins: the pair either side of it keeps its own block.
		expect(out).toContain(".w{color:teal}");
		expect(out).toContain(".z{color:teal}");
		expect(minify(out)).toBe(out);
	});

	it("leaves the pair at a gathered seam alone where it cannot join", () => {
		// The gather still runs; only the join at the seam is declined, so each
		// case reads as the two bodies side by side under one opener.
		const gathered = (/** @type {string} */ tail) => {
			const out = minify(
				`@layer outer{${repeat(6000, (i) => `.f${i}{color:red}`)}${tail}}`
			);
			return out.slice(out.indexOf("@layer a{"));
		};
		const lead = "@layer a{.p{color:teal}}.mid{margin:0}";
		// A control, so a case that stopped gathering reads apart from one that
		// stopped joining.
		expect(gathered(`${lead}@layer a{.q{color:teal}}`)).toBe(
			"@layer a{.p,.q{color:teal}}.mid{margin:0}}"
		);
		// Only a qualified rule lends its selectors.
		expect(gathered(`${lead}@layer a{@media print{.q{color:teal}}}`)).toBe(
			"@layer a{.p{color:teal}@media print{.q{color:teal}}}.mid{margin:0}}"
		);
		// One selector an engine cannot parse invalidates the list it joins.
		expect(gathered(`${lead}@layer a{.q:not(.r){color:teal}}`)).toBe(
			"@layer a{.p{color:teal}.q:not(.r){color:teal}}.mid{margin:0}}"
		);
		expect(
			gathered("@layer a{.p:not(.r){color:teal}}.mid{margin:0}@layer a{.q{color:teal}}")
		).toBe("@layer a{.p:not(.r){color:teal}.q{color:teal}}.mid{margin:0}}");
		// Two rules join on the block they share, which these do not.
		expect(gathered(`${lead}@layer a{.q{color:lime}}`)).toBe(
			"@layer a{.p{color:teal}.q{color:lime}}.mid{margin:0}}"
		);
		// A selector the grown list already carries would only be written twice.
		expect(
			gathered(
				"@layer a{.p{color:teal}.q{color:teal}}.mid{margin:0}@layer a{.q{color:teal}}"
			)
		).toBe("@layer a{.p,.q{color:teal}.q{color:teal}}.mid{margin:0}}");
	});

	it("drops a prefixed list a streamed block's rules cover between them", () => {
		// The list is held as the node its parent would skip, and a streamed parent
		// assembles no body — so it has to be held as a piece instead.
		const covered =
			fixture("css", "css-syntax-minify-vendor-prefixes-selectors-drops-a-prefixed-list-the-rules");
		const src = `@media screen{${BIG}${covered}}`;
		// The block has to stream for the hold to be the one under test.
		expect(childCount(src)).toBe(0);
		const out = minifyFor(src, ["firefox 120"]);
		expect(out).not.toContain("-moz-placeholder");
		// The rules covering the list are what has to outlive it.
		expect(out).toContain(
			".a::placeholder{color:red}.b::placeholder{color:#00f}"
		);
		// Nothing writes `.b::placeholder`, so the list is still the only rule
		// styling those elements and stays whichever way its block is written.
		const uncovered =
			fixture("css", "css-syntax-minify-vendor-prefixes-selectors-keeps-a-prefixed-list-no-rule-covers");
		expect(
			minifyFor(`@media screen{${BIG}${uncovered}}`, ["firefox 120"])
		).toContain("-moz-placeholder");
	});

	it("drops the second of two prefixed lists a streamed block covers", () => {
		// Each list is held as its own piece, so the one a closing child belongs to
		// is found by walking past the pieces held for the others.
		const lists =
			fixture("css", "css-syntax-minify-vendor-prefixes-selectors-keeps-a-prefixed-list-no-rule-covers-2") +
			".c::-moz-placeholder,.d::-moz-placeholder{opacity:0}" +
			".a::placeholder{color:red}.b::placeholder{color:#00f}" +
			".c::placeholder{color:#0f0}.d::placeholder{color:#ff0}";
		const src = `@media screen{${BIG}${lists}}`;
		expect(childCount(src)).toBe(0);
		const out = minifyFor(src, ["firefox 120"]);
		expect(out).not.toContain("-moz-placeholder");
		// The rules covering the lists are what has to outlive them.
		expect(out).toContain(
			".a::placeholder{color:red}.b::placeholder{color:#00f}.c::placeholder{color:#0f0}.d::placeholder{color:#ff0}"
		);
	});

	it("enters a streamed rule before its children and exits after them", () => {
		const seq = walk(`@media screen{${SMALL}}`, { recurseBlocks: true });
		expect(seq[0]).toBe("+AtRule|0|0");
		expect(seq[seq.length - 1]).toBe("-AtRule|0|0");
		const streamed = walk(`@media screen{${BIG}}`);
		expect(streamed[0]).toBe("+AtRule|0|0");
		expect(streamed[streamed.length - 1]).toBe("-AtRule|0|0");
	});

	it("keeps a descriptor opaque in a streamed body", () => {
		// The block outlives the call that entered its rule, so `@property` /
		// `@function` state is restored per frame rather than around one walk.
		const value = "rgb(255,0,0)0.50px";
		expect(minify(`@function --f(){${BIG}result:${value}}`)).toContain(
			`result:${value}`
		);
		expect(
			minify(
				`@property --x{syntax:"*";inherits:false;${BIG}initial-value:${value}}`
			)
		).toContain(`initial-value:${value}`);
	});

	it("visits a streamed block's children in source order", () => {
		// The collected walk emits every declaration and only then every child
		// rule; a streamed block emits each child as it finishes, so declarations
		// and child rules interleave the way the source has them.
		const src = `@media screen{${repeat(
			1800,
			(i) => `p${i}:v${i};${rule(i)}`
		)}}`;
		const kinds = walk(src)
			.filter(
				(e) => e.startsWith("+Declaration|") || e.startsWith("+QualifiedRule|")
			)
			.map((e) => e.slice(1, e.indexOf("|")));
		// A declaration of the block, then a rule, then that rule's own two
		// declarations — repeating, which only source order produces.
		expect(kinds.slice(0, 8)).toEqual([
			"Declaration",
			"QualifiedRule",
			"Declaration",
			"Declaration",
			"Declaration",
			"QualifiedRule",
			"Declaration",
			"Declaration"
		]);
	});

	it("indexes a streamed block's declarations and child rules apart", () => {
		// The collected walk numbers the two lists independently (see `_walkRule`),
		// so a streamed block has to as well — not one counter running across the
		// merged source order.
		const src = `@media screen{${repeat(
			1800,
			(i) => `p${i}:v${i};${rule(i)}`
		)}}`;
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					const parent = path.parent;
					if (parent !== null && path.type(parent) === NodeType.AtRule) {
						seen.push(`d${path.index}`);
					}
				},
				[NodeType.QualifiedRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => seen.push(`r${path.index}`)
			})
			.process(src, { mode: "minify" });
		expect(seen.slice(0, 6)).toEqual(["d0", "r0", "d1", "r1", "d2", "r2"]);
		expect(seen[seen.length - 1]).toBe("r1799");
	});

	it("enters nested streamed blocks outermost first", () => {
		// The inner block crosses the threshold first, so the outer rule has to be
		// entered on the way in — otherwise `@supports` would be entered before the
		// `@media` holding it.
		const seq = walk(`@media screen{@supports (display:grid){${BIG}}}`);
		expect(seq[0]).toBe("+AtRule|0|0");
		expect(seq.filter((e) => e.startsWith("+AtRule|"))[1]).toBe("+AtRule|0|14");
	});

	it("reads a streamed rule's body as an empty block, not as no block", () => {
		/** @type {(src: string) => unknown[]} */
		const body = (src) => {
			/** @type {unknown[]} */
			const seen = [];
			new SourceProcessor()
				.use({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						const block = path.rangeOf(Part.block) !== null;
						seen.push(block ? path.fieldCount(Field.declarations) : null);
						seen.push(block ? path.fieldCount(Field.rules) : null);
					}
				})
				.process(src, { mode: "minify" });
			return seen;
		};
		// A streamed rule hands its children to the visitors instead of collecting
		// them, so both lists read empty — but the block itself is still there,
		// which `null` (the block-less at-rules) would deny.
		expect(body(`@media screen{${BIG}}`)).toEqual([0, 0]);
		expect(body(`@media screen{${SMALL}}`)).toEqual([0, 4]);
		expect(body(fixture("css", "css-syntax-block-streaming-reads-a-streamed-rule-s-body-as-an-empty-block-not-as"))).toEqual([null, null]);
	});

	it("honours skipChildren() and recurseBlocks on a streamed rule", () => {
		/** @type {(opts: import("../../../lib/css/syntax-parser").CssProcessOptions, skip: boolean) => number} */
		const children = (opts, skip) => {
			let n = 0;
			new SourceProcessor()
				.use({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						if (skip) path.skipChildren();
					},
					[NodeType.QualifiedRule]: () => n++
				})
				.process(`@media screen{${BIG}}`, opts);
			return n;
		};
		expect(children({}, true)).toBe(0);
		expect(children({}, false)).toBe(1800);
		expect(children({ recurseBlocks: false }, false)).toBe(0);
	});

	it("prints a streamed block as the collected printer would", () => {
		// The fixture is already minimal, so the whole output is known: opener,
		// every child in source order, closer — and no `;` before the `}`.
		expect(minify(`@media screen{${BIG}}`)).toBe(`@media screen{${BIG}}`);
		expect(minify(`@media screen{@supports (display:grid){${BIG}}}`)).toBe(
			`@media screen{@supports (display:grid){${BIG}}}`
		);
		// Children printing one block join into a selector list, so the streamed
		// path has to reach the list a collected one does rather than the input.
		/** @type {(n: number) => string} */
		const nesting = (n) =>
			`.root{color:red;${repeat(n, (i) => `& .n${i}{color:red}`)}}`;
		/** @type {(n: number) => string} */
		const joined = (n) =>
			`.root{color:red;${Array.from({ length: n }, (_, i) => `& .n${i}`)
				.sort()
				.join(",")}{color:red}}`;
		expect(minify(nesting(1800))).toBe(joined(1800));
	});

	it("reads a streamed rule's prelude in terms of what encloses it", () => {
		// `from` is the `0%` a keyframe selector means only inside `@keyframes`, so the
		// opener has to be printed with the whole path bound, not just the rule. A block
		// per rule, so what is pinned is the prelude, not the sibling merge.
		const nested = repeat(3000, (i) => `& .x${i}{top:${i + 1}px}`);
		expect(
			childCount(`@keyframes k{from{${nested}}}`, NodeType.QualifiedRule)
		).toBe(0);
		expect(minify(`@keyframes k{from{${nested}}}`)).toBe(
			`@keyframes k{0%{${nested}}}`
		);
		// `to` is already shorter than the `100%` it names, and a `.from` selector
		// outside `@keyframes` is a class like any other.
		expect(minify(`@keyframes k{to{${nested}}}`)).toBe(
			`@keyframes k{to{${nested}}}`
		);
		expect(minify(`.from{${nested}}`)).toBe(`.from{${nested}}`);
	});

	it("falls back past the depth the frame table holds", () => {
		// Deeper than `_STREAM_MAX_DEPTH`, where a block is materialized instead of
		// streamed; the levels above still stream, so the two have to meet. `@media m0`
		// and not a feature query: the point here is the nesting, not the prelude.
		const depth = 70;
		const open = repeat(depth, (i) => `@media m${i}{`);
		const close = repeat(depth, () => "}");
		expect(minify(`${open}${BIG}${close}`)).toBe(`${open}${BIG}${close}`);
	});

	it("drops a streamed block that prints to nothing", () => {
		// The opener is held back until something inside prints, so a rule whose
		// every child minifies away is still dropped whole at its `}`. An empty
		// rule is only a few nodes, so it takes a lot of them to cross.
		const EMPTY = repeat(6000, (i) => `.e${i}{}`);
		expect(childCount(`@media a{${EMPTY}}`)).toBe(0);
		expect(minify(`@media a{${EMPTY}}`)).toBe("");
		expect(minify(`@media a{${EMPTY}@media b{${EMPTY}}}`)).toBe("");
		expect(minify(`@media a{${EMPTY}.keep{color:red}}`)).toBe(
			"@media a{.keep{color:red}}"
		);
		// A `@layer` block carries meaning even when empty, so it stays.
		expect(minify(`@layer a{${EMPTY}}`)).toBe("@layer a{}");
	});

	it("keeps only the last of a streamed block's identical declarations", () => {
		// Reached by taking the earlier one back out of the output, since a streamed
		// block cannot look ahead. The duplicate is 3000 child rules from its match, so
		// this is the whole block agreeing, not a run of adjacent declarations.
		const middle = repeat(3000, (i) => `& .m${i}{top:${i + 1}px}`);
		const src = `.root{color:red;${middle}color:red;}`;
		expect(childCount(src, NodeType.QualifiedRule)).toBe(0);
		expect(minify(src)).toBe(`.root{${middle}color:red}`);
	});

	it("takes back only its own output when it drops the last `;`", () => {
		// The `;` a `}` makes redundant is dropped by walking back over the pieces
		// the block emitted, past the empty one a later duplicate took back. What
		// stands before the block keeps its own separator.
		const mid = repeat(3000, (i) => `& .m${i}{top:${i + 1}px}`);
		const src = `.root{lead:1;${mid}dup:2;dup:2;}`;
		expect(childCount(src, NodeType.QualifiedRule)).toBe(0);
		expect(minify(src)).toBe(`.root{lead:1;${mid}dup:2}`);
	});

	it("writes a streamed block's children straight through when beautifying", () => {
		// A streamed block emits each child as it finishes rather than collecting
		// them, so the order it writes them in is the order they were parsed.
		const out = new SourceProcessor().process(
			`@media all{${BIG}.z1{left:0}.z2{left:0}}`,
			{ mode: "beautify" }
		).code;
		expect(out).toContain(".z1 {\nleft: 0;\n}\n.z2 {\nleft: 0;\n}");
	});

	it("declines to stream a block a longhand family could still merge in", () => {
		// The merge needs every declaration at once, so a block holding no child
		// rule is never streamed however far past the threshold it grows.
		const src = `.root{${repeat(
			20000,
			(i) => `--v${i}:${i};`
		)}margin-top:1px;margin-right:2px;margin-bottom:3px;margin-left:4px}`;
		/** @type {number | null} */
		let declared = null;
		let seen = false;
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					if (seen) return;
					seen = true;
					declared =
						path.rangeOf(Part.block) === null
							? null
							: path.fieldCount(Field.declarations);
				}
			})
			.process(src, { mode: "minify" });
		// Collected, so it still reports every declaration it holds — a streamed
		// block would report none, and the merge below would be lost with them.
		expect(declared).toBe(20004);
		expect(minify(src)).toContain("margin:1px 2px 3px 4px");
	});

	it("keeps the comments a streamed run carries through", () => {
		expect(minify(`/*! keep */@media a{${BIG}}/*! tail */`)).toBe(
			`/*! keep */@media a{${BIG}}/*! tail */`
		);
	});

	it("leaves no state behind for the next parse", () => {
		const src = fixture("css", "css-syntax-block-streaming-leaves-no-state-behind-for-the-next-parse");
		let seen = 0;
		let throwAt = -1;
		const sp = new SourceProcessor().use({
			[NodeType.QualifiedRule]: () => {
				if (++seen === throwAt) throw new Error("boom");
			}
		});
		const plain = walk(src);
		sp.process(`@media screen{${BIG}}`, {});
		expect(walk(src)).toEqual(plain);
		// Part-way through the streamed block, so the frame depth is unwound from
		// inside the walk rather than at the closing `}`.
		seen = 0;
		throwAt = 500;
		expect(() => sp.process(`@media screen{${BIG}}`, {})).toThrow("boom");
		throwAt = -1;
		expect(walk(src)).toEqual(plain);
	});
});

describe("CssSyntax — minify comment preservation", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("keeps a comment while also firing the Comment visitor", () => {
		/** @type {string[]} */
		const seen = [];
		const { code: out } = new SourceProcessor()
			.use({
				[NodeType.Comment]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => seen.push(path.source())
			})
			.process(fixture("css", "css-syntax-minify-comment-preservation-keeps-a-comment-while-also-firing-the"), { mode: "minify" });
		expect(out).toBe("/*! k */a{color:red}");
		expect(seen).toEqual(["/*! k */"]);
	});

	it("ignores `skip` while printing (every node is needed for serialization)", () => {
		// A prelude/type skip would drop selector or value nodes; printing must
		// override it so the minified output stays complete.
		const out = new SourceProcessor().process(fixture("css", "css-syntax-minify-comment-preservation-ignores-skip-while-printing-every-node-is"), {
			mode: "minify",
			skip: {
				selectorPrelude: true,
				types: buildSkipSet([NodeType.Ident])
			}
		}).code;
		expect(out).toBe(".a .b{color:red}");
	});
});

describe("CssSyntax — minify token-boundary safety", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("separates every junction that would read back as one token", () => {
		// One case per fusion rule; each right-hand side is a single token when the
		// space is removed (`/*` even opens a comment).
		const cases = [
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read"), "a{b:1/ *}"],
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-2"), "a{b:. 5}"],
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-3"), "a{b:+ 5}"],
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-4"), "a{b:# fff}"],
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-5"), "a{b:@ x}"],
			// The escape's own terminator is no longer needed once `y` follows it
			// inside the token, but the separator the comment stood for is.
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-6"), "a{b:x \\40y}"],
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-10"), "a{b:\\40  x}"],
			// Non-ASCII is an ident code point, so these would join into one ident.
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-7"), "a{b:\u00E9 \u00E9}"],
			// `<!` and `->` guard an accidental CDO / CDC.
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-8"), "a{b:< !x}"],
			[fixture("css", "css-syntax-minify-token-boundary-safety-separates-every-junction-that-would-read-9"), "a{b:x- >y}"]
		];
		for (const [src, expected] of cases) expect(min(src)).toBe(expected);
	});

	// An unterminated string only exists at EOF (a newline makes it a bad-string
	// instead), and there the stylesheet ends too — so a build never reaches this,
	// but `webpack.css.syntax` minifies whatever source it is handed.
	it("keeps an attribute value the tokenizer closed at EOF", () => {
		// So the output is a fixed point, where before it took a second pass to
		// reach one: the quote written back kept a transform from reading it.
		for (const source of [
			fixture("css", "css-syntax-minify-token-boundary-safety-keeps-an-attribute-value-the-tokenizer"),
			fixture("css", "css-syntax-minify-token-boundary-safety-keeps-an-attribute-value-the-tokenizer-2"),
			fixture("css", "css-syntax-minify-token-boundary-safety-keeps-an-attribute-value-the-tokenizer-3"),
			fixture("css", "css-syntax-minify-token-boundary-safety-keeps-an-attribute-value-the-tokenizer-4")
		]) {
			expect(min(min(source))).toBe(min(source));
		}
	});

	// Printed as written and left open, the `}` the rule ends on is read inside
	// what is open — in Chromium a custom property is then lost whole, and each
	// pass writes another `}`. So what the input left open is closed once.
	it("leaves a custom property's value the input ran out in as written", () => {
		// The engine keeps such a value as written, open. A `}` printed after it
		// would land inside, so none is: the input ended there, and so does this.
		const cases = [
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-2"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-2")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-3"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-3")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-4"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-4")],
			// §5.4.8 ends a block only on its own closer; `]` is a token in `(`.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-5"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-5")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-6"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-6")],
			// Read off the children: the string ends on the closer's character.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-7"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-7")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-8"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-8")],
			// A comment the input ran out in, kept, is left open with it; one that
			// only looks like it ends on a `)` does not close the function.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-9"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-9")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-10"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-10")],
			// What the minifier drops at the end still leaves the rest open.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-11"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-12")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-13"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-14")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-15"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-16")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-17"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-17")],
			// Closed, the value is the minifier's, and so is the rule's `}`.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-18"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-19")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-20"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-19")],
			// §4.3.7: an escape the input ran out of is a token the engine rewrites,
			// and writes back closed — as this does.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-21"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-22")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-23"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-24")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-25"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-25")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-26"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-27")],
			// Text the rule's block holds that is no declaration is closed: the
			// engine keeps none of it.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-28"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-29")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-30"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-31")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-32"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-33")],
			// A url is closed before it is folded, not instead.
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-34"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-35")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-36"), fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-a-block-s-start-and-end-only-on-a-2")],
			[fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-37"), fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-38")]
		];
		for (const [source, expected] of cases) {
			expect({ source, printed: min(source) }).toEqual({
				source,
				printed: expected
			});
		}
		// Left open, the value keeps the mappings it has closed.
		/**
		 * @param {string} sheet css source
		 * @returns {{ code: string, map: EXPECTED_ANY }} the printed sheet and its map
		 */
		const mapped = (sheet) =>
			new SourceProcessor().process(sheet, {
				mode: "minify",
				source: "s.css",
				content: sheet
			});
		const open = mapped(fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-41"));
		expect(open.code).toBe("a{color:red}b{--x:f(g");
		expect(open.map.mappings).toBe(
			mapped(fixture("css", "css-syntax-minify-token-boundary-safety-leaves-a-custom-property-s-value-the-42")).map.mappings
		);
	});

	it("consumes a CRLF pair as one escape terminator", () => {
		// An escape that has to stay writes its whole CRLF terminator as one space.
		expect(min(fixture("css", "css-syntax-minify-token-boundary-safety-consumes-a-crlf-pair-as-one-escape-8"))).toBe(".\\31 abc{color:red}");
	});

	it("parts a value the escape before it already ate the separator for", () => {
		// The terminator belongs to the identifier, so a value written after it
		// carries on that identifier instead of starting its own one.
		for (const digits of ["123456", "12345", "4"]) {
			const src = `a{b:\\${digits}\n\tc}`;
			const out = min(src);
			expect(out).toBe(`a{b:\\${digits}  c}`);
		}
		// A CRLF terminator is one terminator, so it needs the one separator too.
		expect(min(fixture("css", "css-syntax-minify-token-boundary-safety-parts-a-value-the-escape-before-it-7"))).toBe("a{b:\\31  c}");
	});
});

describe("CssSyntax — minify keeps input the grammar rejects", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("never materializes rejected input for a walk-only parse", () => {
		// `Raw` exists only for the printer — a plain parse still drops the input,
		// so consumers never see a node type they don't know.
		const rule = A.field(
			0,
			Field.rules,
			parseAStylesheet(fixture("css", "css-syntax-minify-keeps-input-the-grammar-rejects-never-materializes-rejected"))
		);
		expect(A.fieldCount(Field.declarations, rule)).toBe(1);
		expect(A.fieldCount(Field.rules, rule)).toBe(0);
	});
});

describe("CssSyntax — minify value-safety edge cases", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("parts an rgb()'s arguments on CSS whitespace and nothing else", () => {
		// Only tab, line feed, form feed, carriage return and space part one.
		// Anything else between two numbers leaves a declaration the engine
		// ignores, and rewriting it to a color would activate it.
		for (const code of [0x01, 0x0b, 0xa0, 0x2028]) {
			const between = String.fromCharCode(code);
			const css = `a{color:rgb(1${between}2 3 4)}`;
			expect(min(css)).toBe(css);
		}
	});

	it("does not leak the value context into the next parse after a visitor throw", () => {
		const processor = new SourceProcessor().use({
			[NodeType.Ident]: (
				/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
			) => {
				if (path.within(NodeType.Declaration)) throw new Error("boom");
			}
		});
		expect(() => processor.process(fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"))).toThrow("boom");
	});
});

describe("CssSyntax — the memo of which properties' order matters", () => {
	it("starts again once a sheet of made-up names fills it, and still folds", () => {
		// One longhand walked back past more names than the memo holds.
		const names = [];
		for (let i = 0; i < 33000; i++) names.push(`x${i}:1`);
		const css = `a{margin:0;${names.join(";")};margin-top:1px}`;
		/**
		 * @param {string} src css source
		 * @returns {string} the minified serialization
		 */
		const min = (src) =>
			new SourceProcessor().process(src, { mode: "minify" }).code;
		const first = min(css);
		expect(first.startsWith("a{margin:1px 0 0;x0:1;")).toBe(true);
		expect(first.endsWith(";x32999:1}")).toBe(true);
		expect(min(css)).toBe(first);
	});
});

describe("CssSyntax — minify transforms, in-process", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	/**
	 * @param {string} value a `transition-timing-function` value
	 * @returns {string} the minified value
	 */
	const easing = (value) =>
		min(`a{transition-timing-function:${value}}`).slice(
			"a{transition-timing-function:".length,
			-1
		);

	/**
	 * @param {string} value a `transform` value
	 * @returns {string} the minified value
	 */
	const transform = (value) =>
		min(`a{transform:${value}}`).slice("a{transform:".length, -1);

	// One input per entry in the reduction table, so a binding that stops firing
	// fails here rather than quietly declining to shorten anything.
	it("reduces each transform function that names a shorter one", () => {
		expect(transform("translate(5px,0)")).toBe("translate(5px)");
		expect(transform("translate(0,5px)")).toBe("translateY(5px)");
		expect(transform("translate3d(0,0,4px)")).toBe("translateZ(4px)");
		expect(transform("translate3d(1px,2px,0)")).toBe("translate(1px,2px)");
		expect(transform("scale(2,2)")).toBe("scale(2)");
		expect(transform("scale(2,1)")).toBe("scaleX(2)");
		expect(transform("scale(1,2)")).toBe("scaleY(2)");
		expect(transform("scale3d(2,3,1)")).toBe("scale(2,3)");
		expect(transform("scale3d(1,1,4)")).toBe("scaleZ(4)");
		expect(transform("rotateZ(45deg)")).toBe("rotate(45deg)");
		expect(transform("rotate3d(1,0,0,45deg)")).toBe("rotateX(45deg)");
		expect(transform("rotate3d(0,1,0,45deg)")).toBe("rotateY(45deg)");
		expect(transform("rotate3d(0,0,1,45deg)")).toBe("rotate(45deg)");
		// ...and the 2D matrix that leaves is a translation, which reduces again.
		expect(transform("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,4,5,0,1)")).toBe(
			"translate(4px,5px)"
		);
	});

	it("writes the named function a matrix says in fewer bytes", () => {
		// A matrix's own numbers are `px`, and each shape read back is exact.
		expect(transform("matrix(1,0,0,1,100,200)")).toBe("translate(100px,200px)");
		expect(transform("matrix(1,0,0,1,0,50)")).toBe("translateY(50px)");
		expect(transform("matrix(2,0,0,3,0,0)")).toBe("scale(2,3)");
		expect(transform("matrix(2,0,0,2,0,0)")).toBe("scale(2)");
		expect(transform("matrix(1,0,0,1,0,0)")).toBe("scale(1)");
		expect(transform("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,100,100,10,1)")).toBe(
			"translate3d(100px,100px,10px)"
		);
		expect(transform("matrix3d(2,0,0,0,0,3,0,0,0,0,4,0,0,0,0,1)")).toBe(
			"scale3d(2,3,4)"
		);
		// A rotation is rational only at a quarter turn, so no other angle comes
		// back out of a matrix — and a shear names none of these shapes at all.
		expect(transform("matrix(0,1,-1,0,0,0)")).toBe("rotate(90deg)");
		expect(transform("matrix(0,-1,1,0,0,0)")).toBe("rotate(270deg)");
		expect(transform("matrix(1.41421,1.41421,-1.16485,1.66358,100,200)")).toBe(
			"matrix(1.41421,1.41421,-1.16485,1.66358,100,200)"
		);
		expect(transform("matrix(1,0,1,1,0,0)")).toBe("matrix(1,0,1,1,0,0)");
		// A matrix takes `<number>` alone, so a unit is no matrix to read.
		expect(transform("matrix(1,0,0,1,10px,0)")).toBe("matrix(1,0,0,1,10px,0)");
		expect(transform("matrix(1,0,0,1,0)")).toBe("matrix(1,0,0,1,0)");
	});

	// One reduction uncovers the next, which is the loop's whole reason to exist.
	it("keeps reducing while each result names a shorter one still", () => {
		expect(transform("scale3d(1,1,1)")).toBe("scale(1)");
		expect(transform("translate3d(0,0,0)")).toBe("translateZ(0)");
	});

	// A `translate3d()`'s z is a `<length>`, so a percentage makes the whole
	// declaration invalid — shortening it away would revive what the engine drops.
	it("keeps a translate3d whose z offset is a percentage", () => {
		expect(transform("translate3d(1px,2px,0%)")).toBe(
			"translate3d(1px,2px,0%)"
		);
	});

	it("keeps a call the reduction does not name a shorter one for", () => {
		// The axis a 3D matrix would have to leave at the identity is not.
		expect(transform("matrix3d(1,0,0,0,0,1,0,0,0,0,2,0,4,5,0,1)")).toBe(
			"matrix3d(1,0,0,0,0,1,0,0,0,0,2,0,4,5,0,1)"
		);
		expect(transform("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,4,5,0,2)")).toBe(
			"matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,4,5,0,2)"
		);
		// A component count no reduction is stated for.
		expect(transform("translate(1px,2px,3px)")).toBe("translate(1px,2px,3px)");
		expect(transform("translate3d(0,0)")).toBe("translate3d(0,0)");
		expect(transform("scale3d(1,2)")).toBe("scale3d(1,2)");
		expect(transform("rotateZ(1deg,2deg)")).toBe("rotateZ(1deg,2deg)");
		expect(transform("rotate3d(0,0,1)")).toBe("rotate3d(0,0,1)");
		expect(transform("matrix3d(1,0,0,1)")).toBe("matrix3d(1,0,0,1)");
		// An axis none of the three spellings names.
		expect(transform("rotate3d(1,1,0,45deg)")).toBe("rotate3d(1,1,0,45deg)");
		// A function outside the table keeps whatever it was written as.
		expect(transform("var(--t)")).toBe("var(--t)");
		// An empty component is malformed, and a reduction would spell it away.
		expect(transform("translate(,)")).toBe("translate(,)");
	});

	it("rewrites cubic-bezier() to the keyword naming the same curve", () => {
		expect(easing("cubic-bezier(0,0,1,1)")).toBe("linear");
		expect(easing("cubic-bezier(.25,.1,.25,1)")).toBe("ease");
		expect(easing("cubic-bezier(.42,0,1,1)")).toBe("ease-in");
		expect(easing("cubic-bezier(0,0,.58,1)")).toBe("ease-out");
		expect(easing("cubic-bezier(.42,0,.58,1)")).toBe("ease-in-out");
	});

	it("keeps a cubic-bezier() no keyword names", () => {
		// Not four arguments, so not the form the equivalences are stated for.
		expect(easing("cubic-bezier(0,0,1)")).toBe("cubic-bezier(0,0,1)");
		expect(easing("cubic-bezier(0,0,1,1,1)")).toBe("cubic-bezier(0,0,1,1,1)");
		// A non-plain-number argument could be anything at computed-value time.
		expect(easing("cubic-bezier(0,0,1,x)")).toBe("cubic-bezier(0,0,1,x)");
		// A curve with no keyword of its own.
		expect(easing("cubic-bezier(.1,.2,.3,.4)")).toBe(
			"cubic-bezier(.1,.2,.3,.4)"
		);
	});

	it("rewrites steps() to its keyword, and drops the default position", () => {
		expect(easing("steps(1,start)")).toBe("step-start");
		expect(easing("steps(1,jump-start)")).toBe("step-start");
		expect(easing("steps(1,end)")).toBe("step-end");
		// `end` is the default, so only the position goes.
		expect(easing("steps(3,end)")).toBe("steps(3)");
		expect(easing("steps(3,jump-end)")).toBe("steps(3)");
		// `start` is not the default, so it stays.
		expect(easing("steps(2,start)")).toBe("steps(2,start)");
	});

	it("keeps a steps() outside those equivalences", () => {
		expect(easing("steps(2,jump-both)")).toBe("steps(2,jump-both)");
		expect(easing("steps(x,end)")).toBe("steps(x,end)");
		expect(easing("steps(2)")).toBe("steps(2)");
	});

	it("keeps url() quotes a url-token could not carry", () => {
		// A control code point, and an already-unquoted url.
		expect(min(fixture("css", "css-syntax-minify-transforms-in-process-keeps-url-quotes-a-url-token-could-not-4"))).toBe(
			'a{background:url("a\u0001b.png")}'
		);
	});

	it("folds a keyword the declaration before it does not take", () => {
		// A node is an index the printer hands back for reuse, so a sheet of this
		// shape gives `color` the index `font-family` held — and the memo below it.
		const sheet = [
			"html:lang(ko),",
			".lang-ko {",
			'  font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Sample Gothic", "Helvetica Neue", sans-serif;',
			"}",
			".btn.btn-clear {",
			"  background: transparent;",
			"  border: 0;",
			"  color: currentColor;",
			"}"
		].join("\n");
		expect(min(sheet)).toContain("color:currentcolor");
	});

});

describe("CssSyntax — the per-transform switches", () => {
	/**
	 * @param {string} src css source
	 * @param {import("../../../lib/css/syntax-parser").CssTransformOptions=} transforms which rewrites to make
	 * @returns {string} the minified serialization
	 */
	const min = (src, transforms) =>
		new SourceProcessor().process(src, { mode: "minify", transforms }).code;

	// The embedded-source renderer reads a data URL's payload, which is what the
	// percent-escapes hold — so it is offered the decoded one, and what it hands
	// back is quoted or not as `normalizeQuotes` says.
	describe("a rendered data URL", () => {
		const css = fixture("css", "css-syntax-the-per-transform-switches-writes-a-data-uri-s-escapes-as-the-bytes");
		/**
		 * @param {string} source the payload
		 * @returns {string} it, rewritten
		 */
		const renderEmbeddedSource = (source) =>
			source.replace("<svg>", "<svg id=r>");
		/**
		 * @param {import("../../../lib/css/syntax-parser").CssTransformOptions=} transforms which rewrites to make
		 * @returns {string} the minified serialization
		 */
		const render = (transforms) =>
			new SourceProcessor().process(css, {
				mode: "minify",
				renderEmbeddedSource,
				transforms
			}).code;

		it("reaches the renderer with the payload decoded", () => {
			expect(render()).toBe(
				"a{background:url(data:image/svg+xml,<svg\\ id=r></svg>)}"
			);
		});

		it("keeps the quotes round what it hands back with quotes off", () => {
			expect(render({ normalizeQuotes: false })).toBe(
				'a{background:url("data:image/svg+xml,<svg id=r></svg>")}'
			);
		});

	});

	// One option says which comments survive, in the six forms terser's
	// `format.comments` takes.
	describe("comments", () => {
		const css =
			fixture("css", "css-syntax-the-per-transform-switches-comments-absent-keeps-the-banners");
		const banners = "/*! banner *//* @license L */a{b:c}";
		const every =
			fixture("css", "css-syntax-the-per-transform-switches-comments-absent-keeps-the-banners");

		it.each([
			["absent keeps the banners", undefined, banners],
			['"some" keeps the banners', /** @type {const} */ ("some"), banners],
			["true keeps every comment", true, every],
			['"all" keeps every comment', /** @type {const} */ ("all"), every],
			["false keeps none", false, fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is")],
			["a string is read as a pattern", "banner", "/*! banner */a{b:c}"],
			["a RegExp keeps what it matches", /inert/, "/*inert*/a{b:c}"],
			[
				"a predicate keeps what it accepts",
				/** @type {(comment: string) => boolean} */ (
					(comment) => comment.includes("@license")
				),
				"/* @license L */a{b:c}"
			]
		])("%s", (_name, comments, expected) => {
			expect(min(css, { comments })).toBe(expected);
		});

		// The pragma names the source's own map, which minified text no longer
		// matches, so the banner levels drop it as terser drops `//#`; a selector
		// the author wrote decides it like any other comment.
		it.each([
			[undefined, false],
			[/** @type {const} */ ("some"), false],
			[/** @type {const} */ ("all"), true],
			[true, true],
			[false, false],
			[/nothing-matches/, false],
			[/** @type {(comment: string) => boolean} */ (() => false), false]
		])("source-map pragma with comments: %s", (comments, kept) => {
			const out = min(fixture("css", "css-syntax-the-per-transform-switches-comments-source-map-pragma-with-comments"), { comments });
			expect(out.includes("/*# sourceMappingURL=x.map */")).toBe(kept);
		});

		// A `g` flag would carry an index from one comment to the next.
		it("matches a global pattern from the start each time", () => {
			expect(min(fixture("css", "css-syntax-the-per-transform-switches-comments-matches-a-global-pattern-from-the"), { comments: /k\d/g })).toBe(
				"a{b:c}/*k1*/d{e:f}/*k2*/"
			);
		});
	});

});

describe("CssSyntax — print modes", () => {
	/**
	 * @param {string} src css source
	 * @param {import("../../../lib/util/SourceProcessor").PrintOptions["mode"]} mode print mode
	 * @returns {string} its serialization
	 */
	const print = (src, mode) =>
		new SourceProcessor().process(src, { mode }).code;

	it("prints nothing unless output is asked for", () => {
		expect(new SourceProcessor().process(fixture("css", "css-syntax-print-modes-prints-nothing-unless-output-is-asked-for"))).toBeUndefined();
	});

	it("beautifies to something that minifies back the same", () => {
		for (const src of [
			fixture("css", "css-syntax-print-modes-beautifies-to-something-that-minifies-back-the-same"),
			fixture("css", "css-syntax-print-modes-beautifies-to-something-that-minifies-back-the-same-3"),
			fixture("css", "css-syntax-print-modes-beautifies-to-something-that-minifies-back-the-same-5"),
			fixture("css", "css-syntax-print-modes-beautifies-to-something-that-minifies-back-the-same-7"),
			fixture("css", "css-syntax-print-modes-beautifies-to-something-that-minifies-back-the-same-9")
		]) {
			const minified = print(src, "minify");
			expect(print(print(src, "beautify"), "minify")).toBe(minified);
		}
	});
});

describe("CssSyntax minify — the value transforms' rejection paths", () => {
	/** @import { CssEnvironment } from "../../../lib/css/syntax-parser" */

	/**
	 * @param {string} css a stylesheet
	 * @param {CssEnvironment=} environment the target's CSS abilities
	 * @returns {string} its minified serialization
	 */
	const minify = (css, environment) =>
		new SourceProcessor().process(css, { mode: "minify", environment }).code;

	/**
	 * @param {string} value a declaration value
	 * @param {CssEnvironment=} environment the target's CSS abilities
	 * @returns {string} the value as it is printed back
	 */
	const value = (value, environment) => {
		const out = minify(`a{x:${value}}`, environment);
		return /** @type {RegExpExecArray} */ (/^a\{x:([\s\S]*)\}$/.exec(out))[1];
	};

	/**
	 * The same, with the length-unit rewrite on — off by default, so the cases
	 * that are about which unit a length prints in have to ask for it.
	 * @param {string} value a declaration value
	 * @returns {string} the value as it is printed back
	 */
	const converted = (value) => {
		const out = new SourceProcessor().process(`a{x:${value}}`, {
			mode: "minify",
			convertLengthUnits: true
		}).code;
		return /** @type {RegExpExecArray} */ (/^a\{x:([\s\S]*)\}$/.exec(out))[1];
	};

	describe("polar and Lab colors", () => {
		// Each conversion was checked against headless Chromium; these cases pin
		// the arguments the converter refuses rather than guesses at.
		it.each([
			["hsl(0,100%,50%)", "red"],
			["hsl(0 100% 50%)", "red"],
			["hsla(0,100%,50%,1)", "red"],
			["hwb(0 0% 100%)", "#000"],
			["lab(100% 0 0)", "#fff"],
			["oklab(1 0 0)", "#fff"],
			["oklab(40.101% .1147% .0453%)", "#484848"]
		])("converts %s", (input, expected) => {
			expect(value(input)).toBe(expected);
		});

		it.each([
			// a channel on a `.5` boundary: implementations round it both ways
			["hsl(134,50%,50%)"],
			["hwb(194 0% 0%)"],
			// past the sRGB gamut, so a hex would clip to a different color
			["lab(50% 100 -100)"],
			["oklch(90% .4 140)"],
			// within the margin a conversion through a matrix carries: an engine's
			// own transfer is a fitted curve rather than the spec's, so a channel
			// this close to a boundary is one it could round the other way
			["lab(20% 40 0)"],
			["lch(29.2345% 44.2 45deg)"],
			["oklch(70% .1 200)"],
			// a non-percentage saturation / lightness is not the grammar converted
			["hsl(0,1,.5)"],
			// a hue in a unit the converter does not read
			["hsl(.5turn,100%,50%)"],
			// out of range
			["hsl(0,150%,50%)"],
			// a substitution, so the arguments are unknown until computed
			["hsl(var(--h),100%,50%)"],
			// the wrong argument count
			["hsl(0,100%)"],
			["lab(50% 40)"],
			// an alpha out of range
			["hsl(0 100% 50% / 1.5)"]
		])("keeps %s", (input) => {
			expect(value(input).replace(/\s+/g, "")).toBe(input.replace(/\s+/g, ""));
		});

		it("keeps a partly transparent color when the target has no hex alpha", () => {
			expect(value("hsl(0 100% 50% / .8)", { browsers: ["chrome 50"] })).toBe(
				"hsl(0 100% 50% / .8)"
			);
			expect(value("rgba(255,0,0,.8)", { browsers: ["chrome 50"] })).toBe(
				"rgba(255,0,0,.8)"
			);
		});

		it("spells an alpha as hex when it does", () => {
			expect(value("hsl(0 100% 50% / .8)")).toBe("#f00c");
			// the author's own number, so no boundary guard — `rgba()` agrees
			expect(value("hsl(0 100% 50% / .5)")).toBe("#ff000080");
			expect(value("rgba(255,0,0,.2)")).toBe("#f003");
			expect(value("rgba(0,0,0,.5)")).toBe("#00000080");
		});

		it("drops an authored alpha that is fully opaque", () => {
			// `ff` is no alpha at all, so the color is spelled as an opaque one —
			// which is shorter and asks nothing of the target's hex-alpha support.
			expect(value("#ffffffff")).toBe("#fff");
			expect(value("#ffff")).toBe("#fff");
			expect(value("#FFFFFFFF")).toBe("#fff");
			expect(value("#000000ff")).toBe("#000");
			expect(value("#abcdefff")).toBe("#abcdef");
			// All the way to the shortest name, as any other opaque color is.
			expect(value("#ff0000ff")).toBe("red");
			// Even where the target reads no hex alpha, this form needing none.
			expect(value("#ffffffff", { browsers: ["chrome 50"] })).toBe("#fff");
			// A real alpha still collapses only as far as it may.
			expect(value("#11223344")).toBe("#1234");
			expect(value("#ffffffaa")).toBe("#fffa");
			expect(value("#fff0")).toBe("#fff0");
		});

		it("shortens a color in a substitution's fallback", () => {
			// The fallback is the property's value, not the function's own
			// argument, so a hash there is as much a color as one written in place.
			expect(value("var(--a,#ffffff)")).toBe("var(--a,#fff)");
			expect(value("var(--a,#ffffffff)")).toBe("var(--a,#fff)");
			expect(value("env(--a,#ffffff)")).toBe("env(--a,#fff)");
			expect(value("var(--a,var(--b,#ffffff))")).toBe("var(--a,var(--b,#fff))");
			// `paint()`'s arguments reach a worklet instead, and a function nothing
			// names is not known to take a color at all.
			expect(value("paint(w,#ffffff)")).toBe("paint(w,#ffffff)");
			expect(value("some-fn(#ffffff)")).toBe("some-fn(#ffffff)");
			expect(value("--my-fn(#ffffff)")).toBe("--my-fn(#ffffff)");
			// A `url()` fragment is an id reference, never a color.
			expect(value("url(#gradient)")).toBe("url(#gradient)");
		});
	});

	describe("rounding and unit conversion", () => {
		it.each([
			["33.33333333%", "33.3333333%"],
			// The shortest spelling that lands on every layout step the written one does.
			["10.1885002107%", "10.188500211%"],
			["1.0000001px", "1.0000001px"],
			["1.0000000001px", "1px"],
			["400ms", ".4s"],
			[".005s", "5ms"],
			// A zero time keeps a unit where a zero length drops one, so the shorter
			// of the two it can carry is still worth reaching for.
			["0ms", "0s"],
			["-0ms", "0s"],
			// A power of ten moves the point, where a double divides inexactly.
			["416.667ms", ".416667s"],
			["-1250ms", "-1.25s"]
		])("rewrites %s", (input, expected) => {
			expect(value(input)).toBe(expected);
		});

		it.each([
			["16px", "1pc"],
			["12pt", "1pc"],
			["10mm", "1cm"],
			["0.75pt", "1px"]
		])("rewrites %s with convertLengthUnits", (input, expected) => {
			expect(converted(input)).toBe(expected);
			expect(value(input)).toBe(input.replace("0.75", ".75"));
		});

		it.each([
			// an angle: `rotate()` amplifies a truncated digit through trig
			["33.33333333deg"],
			["1.5turn"],
			// past the magnitude the rounding was measured for
			["33333.33333px"],
			// no exact ratio to a shorter unit
			["1.3px"],
			// `q` is a conversion source, never a target
			["40Q"],
			// scientific notation is left alone
			["1e3px"],
			["1e-10s"],
			// a unit outside the absolute families
			["1.5em"],
			["50%"]
		])("keeps %s", (input) => {
			expect(value(input)).toBe(input);
		});

		it("leaves a `@supports` condition as written", () => {
			const out = new SourceProcessor().process(
				fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-rounding-and-unit-10"),
				{ mode: "minify", convertLengthUnits: true }
			).code;
			expect(out).toBe("@supports (width:16px){a{x:1pc}}");
		});

	});

	describe("a `@supports` condition", () => {
		/** @type {(condition: string) => string} */
		const condition = (text) =>
			minify(`@supports ${text}{a{color:red}}`).slice(10, -14);

		it.each([
			// comments and whitespace a condition does not need
			["( display : grid )", "(display:grid)"],
			["/* c */ (display:grid) /* d */", "(display:grid)"],
			["(display:grid)  and  (gap:1px)", "(display:grid) and (gap:1px)"],
			["(display: grid) or ( not ( display: flex ) )", "(display:grid) or (not (display:flex))"],
			["(display:/* c */grid)", "(display:grid)"],
			["(transform:translate( 1px , 2px ))", "(transform:translate(1px,2px))"],
			["font-tech( color-COLRv1 )", "font-tech(color-COLRv1)"],
			// a tested `!important`, spaced or not
			["(display:grid ! important)", "(display:grid!important)"],
			["(display:grid !important)", "(display:grid!important)"],
			["(--x: a !important)", "(--x:a!important)"],
			// a selector's combinators, at any depth
			["selector( .a  >  .b )", "selector(.a>.b)"],
			["selector(.a + .b ~ .c)", "selector(.a+.b~.c)"],
			["selector(:is( .a > .b ))", "selector(:is(.a>.b))"],
			["selector(a:has( > b ))", "selector(a:has(>b))"],
			["selector(.a >/* c */.b)", "selector(.a>.b)"],
			["selector(.a/* c */ > .b)", "selector(.a>.b)"],
			["selector(.a , .b)", "selector(.a,.b)"],
			// the selector under test, spaced but not rewritten
			['selector(a[ href = "x" ])', 'selector(a[href="x"])'],
			["selector(a:nth-child( 2n + 1 ))", "selector(a:nth-child(2n+1))"],
			["selector(:IS( .a > .b ))", "selector(:IS(.a>.b))"],
			// an escape spelling a plain name
			["(col\\6f r:r\\65 d)", "(color:red)"],
			["sel\\65 ctor(.\\61  > .b)", "selector(.a>.b)"]
		])("writes %s as %s", (input, expected) => {
			expect(condition(input)).toBe(expected);
		});

		it.each([
			// `not(` would be a function, and so an unknown condition
			["not (display:grid)"],
			["not(display:grid)"],
			["(display:grid) AND (gap:1px)"],
			// the author's own spacing, which no dropped comment decided
			["(display:grid)and (gap:1px)"],
			// a descendant combinator is the whitespace itself
			["selector(.a .b)"],
			// `|` is a namespace or a column, never trimmed
			["selector(.a || .b)"],
			["selector(ns | a)"],
			// the selector under test is not rewritten, only spaced
			["selector(*.a)"],
			["selector(:HOVER)"],
			["selector(a:nth-child(2n+1))"],
			["selector(a:nth-child(2n+0))"],
			["selector(a:NTH-CHILD(even))"],
			["selector(a:nth-of-type(odd))"],
			["SELECTOR(.a)"],
			['selector([href="x"])'],
			["selector(:IS(.a))"],
			["selector(::BEFORE)"],
			// `calc()` needs the space around `+`
			["(width:calc(1px + 2px))"],
			["(width:calc(1px+2px))"]
		])("keeps %s", (input) => {
			expect(condition(input)).toBe(input);
		});

		it.each([
			["(color:rgba(0,0,0,0.5))", "(color:rgba(0,0,0,.5))"],
			["(width:0.50PX)", "(width:.5px)"],
			["not (opacity:00.5)", "not (opacity:.5)"],
			// a written fraction keeps the number from reading as an integer
			["(z-index:1.0)", "(z-index:1.0)"],
			["(width:-0.0px)", "(width:-.0px)"],
			["(height:10.50%)", "(height:10.5%)"],
			// the sign is a token boundary, and the rest is not rewritten
			["(width:+0.5px)", "(width:+.5px)"],
			["(width:5E-1px)", "(width:5E-1px)"],
			["(width:16px)", "(width:16px)"],
			["selector(:nth-child(+2n+01))", "selector(:nth-child(+2n+01))"]
		])("spells the numbers of %s as %s", (input, expected) => {
			expect(condition(input)).toBe(expected);
		});

		it("keeps the comment a keyword's condition was parted from it by", () => {
			// WebKit reads `and`, `or` or `not` as invalid unless whitespace follows,
			// as it reads the source here, so a space in its place would make it read.
			expect(condition("(display:grid)/**/and/**/(gap:1px)")).toBe(
				"(display:grid)and/**/(gap:1px)"
			);
			expect(condition("((a:b) OR/**/(c:d)) and (e:f)")).toBe(
				"((a:b) OR/**/(c:d)) and (e:f)"
			);
			expect(condition("not/**/(display:grid)")).toBe("not/**/(display:grid)");
		});

		it("keeps the space that parts two tokens a trim would fuse", () => {
			// `<!--` is a CDO and `-->` a CDC, each one token, not the ones written.
			expect(condition("(--x: a < !--b)")).toBe("(--x:a< !--b)");
			expect(condition("(--x: a -- > b)")).toBe("(--x:a -- >b)");
		});

	});

	describe("scientific notation", () => {
		/** @type {(declaration: string) => string} */
		const declaration = (text) => minify(`a{${text}}`).slice(2, -1);

		it.each([
			// the plain spelling where it is no longer
			["opacity:0.2e1", "opacity:2"],
			["opacity:.5E0", "opacity:.5"],
			["line-height:2.5e0", "line-height:2.5"],
			["width:-0.5e1px", "width:-5px"],
			["width:+1e+2px", "width:100px"],
			["width:1e-3px", "width:.001px"],
			["font-weight:4e2", "font-weight:400"],
			["transform:rotate(1e1deg)", "transform:rotate(10deg)"],
			["transition:all 1e3ms", "transition:1s"],
			// else the exponent, on an integer mantissa
			["width:10E3px", "width:1e4px"],
			["width:1.5e-7px", "width:15e-8px"],
			["width:1e21px", "width:1e21px"],
			["width:1e999px", "width:1e999px"],
			["width:0.0e0px", "width:0"],
			["width:calc(1e3px + 1e-2%)", "width:calc(1e3px + .01%)"]
		])("writes %s as %s", (input, expected) => {
			expect(declaration(input)).toBe(expected);
		});

		it.each([
			// An exponent makes a `<number>`, which an `<integer>` does not take, so
			// a spelling that would be an integer keeps one.
			["z-index:0.2e1", "z-index:2e0"],
			["z-index:10E2", "z-index:1e3"],
			["z-index:1.5e1", "z-index:15e0"],
			["order:-1e0", "order:-1e0"],
			["z-index:0e3", "z-index:0e0"],
			["animation:x 1s steps(2e0)", "animation:x 1s steps(2e0)"]
		])("keeps %s a <number> as %s", (input, expected) => {
			expect(declaration(input)).toBe(expected);
		});

	});

	describe("unicode-range", () => {
		/** @type {(value: string) => string} */
		const range = (value) =>
			minify(`@font-face{unicode-range:${value}}`).slice(25, -1);

		it.each([
			["leading zeros carry nothing", "U+0025-00FF", "U+25-FF"],
			["a block is what `??` says", "U+1E00-1EFF", "U+1E??"],
			["and the whole low block", "U+0000-00FF", "U+??"],
			["zeros before a wildcard too", "U+00??", "U+??"],
			["mixed case is kept", "U+1e00-1EFF", "U+1e??"]
		])("%s: %s", (_name, input, expected) => {
			expect(range(input)).toBe(expected);
		});

		it.each([
			["the end is not F-aligned", "U+1E00-1EFE"],
			["it is already shortest", "U+0-7F"],
			["a single code point", "U+26"],
			["a wildcard that carries a digit", "U+4??"],
			["the full range", "U+0-10FFFF"],
			["the value is no urange at all", "auto"],
			["the token carries no digits", "U+"]
		])("keeps it where %s", (_name, value) => {
			expect(range(value)).toBe(value);
		});

		it("shortens each range of a list", () => {
			expect(range("U+0000-00FF,U+1E00-1EFF")).toBe("U+??,U+1E??");
		});
	});

	// Each case below is one a real stylesheet of the comparison corpus wrote,
	// and each is held to its own output as well: a second minify adds nothing.
	describe("what a wider corpus found", () => {
		/**
		 * @param {string} css a stylesheet
		 * @param {CssEnvironment=} environment the target's CSS abilities
		 * @returns {string} its minified serialization, checked to be settled
		 */
		const settled = (css, environment) => {
			const once = minify(css, environment);
			return once;
		};
		const legacy = { browsers: ["chrome 100", "firefox 100", "safari 15.4"] };

		it("shortens a number the same once the searches it keeps fill up", () => {
			const widths = Array.from(
				{ length: 5000 },
				(_, i) => `.a${i}{width:${(i + 1) / 7}em}`
			).join("");
			const once = minify(widths);
			expect(once).toContain(".a4999{width:714.2857143em}");
			expect(minify(widths)).toBe(once);
		});

		it.each([
			[
				"something between writes the family",
				fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-what-a-wider-corpus-found-43")
			],
			[
				"one side is `!important`",
				fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-what-a-wider-corpus-found-41")
			],
			[
				"a side holds two components",
				fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-what-a-wider-corpus-found-33")
			],
			[
				"a side is a bare number",
				fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-what-a-wider-corpus-found-35")
			],
			[
				"a side is a substitution",
				fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-what-a-wider-corpus-found-37")
			],
			[
				"a side is written twice",
				fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-what-a-wider-corpus-found-39")
			]
		])("keeps the joined sides apart where %s", (_name, css) => {
			const out = settled(css);
			expect(out).not.toMatch(/[{;](padding|margin):/);
		});

	});

	describe("a rule an identical later sibling makes dead", () => {

		it("drops it across a streamed block, written straight out", () => {
			let filler = "";
			for (let i = 0; i < 4000; i++) filler += `.f${i}{color:red}`;
			const out = minify(`@media all{.a{top:0}${filler}.a{top:0}}`);
			expect(out.match(/\.a\{top:0\}/g)).toHaveLength(1);
			// The surviving copy is the last one: an earlier one would be read where
			// the later is, which is what a rule between them can override.
			expect(out.endsWith(".a{top:0}}")).toBe(true);
		});

	});

	describe("a named layer block a later sibling opens again", () => {

		it("gathers past enough nodes to stream the block", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const out = minify(
				`@media all{@layer x{a{color:red}}${filler}@layer x{c{color:lime}}}`
			);
			expect(
				out.startsWith("@media all{@layer x{a{color:red}c{color:lime}}")
			).toBe(true);
			expect(out.endsWith(`${filler}}`)).toBe(true);
		});

		it("gathers past enough nodes to stream, but not past that layer again", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const css = `@media all{@layer x{a{color:red}}${filler}.y{@layer x{b{top:0}}}@layer x{c{color:lime}}}`;
			expect(minify(css)).toBe(css);
		});

		it("gathers past a string that only looks like it opens the layer", () => {
			// The gather reads a streamed node's printed text, where a `@layer` inside
			// a string is a value rather than an at-rule nothing may fold across.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const out = minify(
				`@media all{@layer x{a{color:red}}${filler}.b{content:"@layer x{"}@layer x{c{color:lime}}}`
			);
			expect(
				out.startsWith("@media all{@layer x{a{color:red}c{color:lime}}")
			).toBe(true);
		});

		it("joins the rules a streamed block writes side by side", () => {
			// A block over the threshold writes its children straight out rather than
			// assembling a body, which is where `_mergeAdjacentRules` would join them.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const block = "{color:red;outline:1px solid blue}";
			expect(
				minify(`@media all{${filler}a:hover${block}b:hover${block}}`)
			).toBe(`@media all{${filler}a:hover,b:hover${block}}`);
			// A declaration is read at its own place, so it parts the run — as it does
			// in a block whose body is assembled in one go.
			const parted = `.p{${filler}a:hover${block}q:2;b:hover${block}}`;
			expect(minify(parted)).toBe(parted);
		});

		it("gathers past a rule that writes a layer of its own", () => {
			// Only a write into the very same layer fixes where this one's rules go:
			// two layers that are not one are ordered where each was first named.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const out = minify(
				`@media all{@layer x{a{color:red}}${filler}.y{@layer q{b{top:0}}}@layer x{c{color:lime}}}`
			);
			expect(out.startsWith("@media all{@layer x{a{color:red}c{color:lime}}")).toBe(
				true
			);
		});

		it("gathers past a rule that writes a layer under it", () => {
			// A layer's own declarations outrank its sublayers whichever side of them
			// they are written, so writing into `x.sub` does not pin `x`.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const out = minify(
				`@media all{@layer x{a{color:red}}${filler}.y{@layer x.sub{b{top:0}}}@layer x{c{color:lime}}}`
			);
			expect(out.startsWith("@media all{@layer x{a{color:red}c{color:lime}}")).toBe(
				true
			);
		});

		it("gathers past a rule that writes the layer above it", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const out = minify(
				`@media all{@layer x.k{a{color:red}}${filler}.y{@layer x{b{top:0}}}@layer x.k{c{color:lime}}}`
			);
			expect(
				out.startsWith("@media all{@layer x.k{a{color:red}c{color:lime}}")
			).toBe(true);
		});

		it("gathers past a streamed block that writes another layer", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const out = minify(
				`@media all{@layer a{.x{color:red}}@layer a.b{${filler}}@layer a{.y{color:#00f}}}`
			);
			expect(
				out.startsWith("@media all{@layer a{.x{color:red}.y{color:#00f}}")
			).toBe(true);
			expect(out.endsWith(`@layer a.b{${filler}}}`)).toBe(true);
		});

		it("gathers past a streamed block of another layer at the sheet's own level", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const out = minify(
				`@layer a{.x{color:red}}@layer a.b{${filler}}@layer a{.y{color:#00f}}`
			);
			expect(out.startsWith("@layer a{.x{color:red}.y{color:#00f}}")).toBe(
				true
			);
			expect(out.endsWith(`@layer a.b{${filler}}`)).toBe(true);
		});

		it("gathers a block big enough to stream into the one before it", () => {
			// A block whose layer a sibling already opened is held rather than
			// streamed, so the gather still reads its body whole and all three land
			// in the block the layer was opened in, in the order they were written.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const css = `@media all{@layer a{.x{color:red}}@layer a{${filler}}@layer a{.y{color:#00f}}}`;
			expect(minify(css)).toBe(
				`@media all{@layer a{.x{color:red}${filler}.y{color:#00f}}}`
			);
		});

		it("holds a block big enough to stream whatever the one before it holds", () => {
			// Which blocks gather must not turn on what the first of them carries:
			// an empty block declares where the layer sits and gathers the same.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			expect(minify(`@layer u{@layer a{}@layer a{${filler}}}`)).toBe(
				`@layer u{@layer a{${filler}}}`
			);
		});

		it("gathers a run of blocks each big enough to stream", () => {
			let one = "";
			for (let i = 0; i < 17000; i++) one += `.f${i}{top:${i + 1}px}`;
			let two = "";
			for (let i = 0; i < 17000; i++) two += `.g${i}{left:${i + 1}px}`;
			expect(
				minify(`@layer u{@layer a{}@layer a{${one}}@layer a{${two}}}`)
			).toBe(`@layer u{@layer a{${one}${two}}}`);
		});

		it("reads the name of a block big enough to stream past a comment", () => {
			// The name is read off the source, where a comment stands wherever a
			// space may — and the name itself carries no whitespace.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			expect(
				minifyFor(`@layer u{@layer a{.q{top:0}}@layer /*c*/ a{${filler}}}`)
			).toBe(`@layer u{@layer a{.q{top:0}${filler}}}`);
			expect(
				minifyFor(`@layer u{@layer a.b{.q{top:0}}@layer a/*c*/.b{${filler}}}`)
			).toBe(`@layer u{@layer a.b{.q{top:0}${filler}}}`);
		});

		it("leaves a block big enough to stream where rules are not merged", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const css = `@layer u{@layer a{.q{top:0}}@layer a{${filler}}}`;
			expect(minifyForWith(css, ["chrome 120"], { mergeRules: false })).toBe(
				css
			);
		});

		it("leaves an anonymous block big enough to stream alone", () => {
			// `@layer {` is a layer of its own, so a second one gathers with nothing.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			expect(minify(`@layer u{@layer{}@layer{${filler}}}`)).toBe(
				`@layer u{@layer{}@layer{${filler}}}`
			);
		});

		it("leaves a block big enough to stream that names another layer", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			expect(
				minify(`@layer u{@layer a{.q{top:0}}@layer b{${filler}}}`)
			).toBe(`@layer u{@layer a{.q{top:0}}@layer b{${filler}}}`);
		});

		it("gathers a dotted layer a block big enough to stream repeats", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			expect(
				minify(`@layer u{@layer a.b.c{.q{top:0}}@layer a.b.c{${filler}}}`)
			).toBe(`@layer u{@layer a.b.c{.q{top:0}${filler}}}`);
		});

		it("gathers into a streamed block that is its layer's first at that depth", () => {
			// Nothing recorded the layer before the streamed block did, so the record
			// its `}` opens is the one the later block folds into.
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const css = `@media all{@layer a{${filler}}@layer a{.y{color:#00f}}}`;
			expect(minify(css)).toBe(`@media all{@layer a{${filler}.y{color:#00f}}}`);
		});

		it("gathers the same way for a block the sheet itself holds", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
			const css = `@layer a{.x{color:red}}@layer a{${filler}}@layer a{.y{color:#00f}}`;
			expect(minify(css)).toBe(
				`@layer a{.x{color:red}${filler}.y{color:#00f}}`
			);
		});

		it("joins the pair a top-level gather leaves at the seam", () => {
			// The gather is what makes the two neighbors, so the join has to be
			// offered here rather than left to a second pass over the output.
			const d = "{cursor:not-allowed;opacity:.2}";
			const css = `@layer a.b{.p{c:1}.chk${d}}@layer a.b.c{.q{c:2}}@layer a.b{.rad${d}.r{c:3}}`;
			const once = minify(css);
			expect(once).toBe(
				"@layer a.b{.p{c:1}.chk,.rad{cursor:not-allowed;opacity:.2}.r{c:3}}@layer a.b.c{.q{c:2}}"
			);
		});

	});

	describe("sibling rules printing the same block", () => {

		it("prints the whole sheet after a parse threw mid-print", () => {
			// The rule held back for a join is one per process, so a parse that threw
			// while holding one must not leave it for the next parse to write out.
			let seen = 0;
			expect(() =>
				new SourceProcessor()
					.use({
						[NodeType.QualifiedRule]: () => {
							if (++seen === 2) throw new Error("thrown mid-parse");
						}
					})
					.process(fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-sibling-rules-printing-95"), { mode: "minify" })
			).toThrow("thrown mid-parse");
		});
	});

	describe("box longhands merging across a gap", () => {

		describe("a longhand following an order-free shorthand", () => {

			it("folds across a legacy alias the target drops", () => {
				const css =
					fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-box-longhands-merging-41");
				const modern = { browsers: ["chrome 120", "firefox 120", "safari 17"] };
				// Read again, the output is what it already was.
				expect(minify(minify(css, modern), modern)).toBe(
					"a{animation:x.6s linear infinite}"
				);
			});

		});

	});

	describe("calc folding", () => {
		// A fold has to stay the value an engine would have computed, and a folded
		// expression is no longer there to be recomputed — so every step that
		// cannot be shown exact declines and leaves the expression written out.
		it.each([
			// Two units only layout can add.
			["calc(100% - 10px)"],
			["calc(1em + 2px)"],
			["calc(1px + 1deg)"],
			// A substitution could expand to anything.
			["calc(var(--x) + 1px)"],
			// Not arithmetic at all.
			["calc(1px + auto)"],
			["calc(1px +)"],
			["calc()"],
			// The grammar takes only a number on the right of a `/`, and a product
			// needs one plain number for the result to keep the units it had.
			["calc(2px*3px)"],
			["calc(1px/0)"],
			["calc(1e20px + 1px)"],
			["calc(1e308px*1e10)"],
			// A math function whose meaning is not written yet, so the sum inside it
			// folds but the call does not.
			["sqrt(4px)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it.each([
			// The fold is shortened the way an authored number is, measured against
			// its whole double: to the fewest digits that land on the same steps.
			["calc(1/3*1px)", ".333333334px"],
			["calc((6/14 - .375)*1em)", ".053571428em"],
			// ...less the double's last bits where they are noise past a short answer.
			["calc((6/10 - .375)*1em)", ".225em"],
			// ...and keeps its `calc()` where no shorter number lands alike: a third
			// and a seventh land on a step at some scale no decimal does.
			["calc(3px/1.1)", "calc(3px/1.1)"],
			["calc(100%/3)", "calc(100%/3)"],
			["calc(100%/7)", "calc(100%/7)"],
			["calc(123456px/1.1)", "calc(123456px/1.1)"],
			["calc(1turn/3)", "calc(1turn/3)"],
			["calc(90deg/7)", "calc(90deg/7)"],
			["calc(1e4px + 1px)", "10001px"]
		])("%s folds to %s", (expression, expected) => {
			expect(value(expression)).toBe(expected);
		});

		it("adds a sum of angle units in degrees", () => {
			expect(value("calc(1rad + 1deg)")).toBe("58.2957795deg");
			expect(value("calc(45deg + .125turn)")).toBe("90deg");
			expect(value("calc(100grad + 10deg)")).toBe("100deg");
			// A length beside an angle is no sum at all.
			expect(value("calc(1px + 1deg)")).toBe("calc(1px + 1deg)");
		});

		it("lands a sum in a unit it was written in, though no conversion targets it", () => {
			expect(value("calc(1q*4)")).toBe("4q");
		});

		it("folds through a parenthesized group and a nested calc()", () => {
			expect(value("calc((1px + 2px)*3)")).toBe("9px");
			expect(value("calc(calc(1px + 2px) + 3px)")).toBe("6px");
		});

		it("counts units fixed against each other in one term", () => {
			expect(value("calc(1in + 1px)")).toBe("97px");
			expect(value("calc(2.5cm + 5mm)")).toBe("3cm");
		});

		it("prints the term in whichever unit of its group spells it", () => {
			// No `px` count equals these, so reaching the answer through the group's
			// reference unit alone would leave every one of them written out.
			expect(converted("calc(1cm + 1mm)")).toBe("11mm");
			expect(converted("calc(1in + 1cm)")).toBe("3.54cm");
			expect(converted("calc(4.5cm + 0cm)")).toBe("45mm");
			// Where no unit of the group spells it exactly, the sum still lands in one
			// the expression was written with, at the precision every number is
			// written at.
			expect(value("calc(1px + 1cm)")).toBe("38.7952756px");
		});

		it("prints a sum two units deep as the sum it reduced to", () => {
			expect(value("calc((1em + 1px)*2)")).toBe("calc(2em + 2px)");
			expect(value("calc(2*(1em + 1px))")).toBe("calc(2em + 2px)");
			expect(value("calc((100% + 1px)/2)")).toBe("calc(50% + .5px)");
			expect(value("calc(1px + 2em + 3px)")).toBe("calc(4px + 2em)");
			// The terms keep the order they were first written, and a negative one
			// is the subtraction it is.
			expect(value("calc(1em - 2em + 1px)")).toBe("calc(-1em + 1px)");
			expect(value("calc(1px - calc(1em + 1px))")).toBe("calc(0px - 1em)");
		});

		it("keeps a zero term of a sum two units deep", () => {
			// Which units may be added to which is a type rule, so dropping the term
			// would turn an expression the engine rejects into one it accepts.
			expect(value("calc(1px + 1deg - 1deg)")).toBe("calc(1px + 0deg)");
			expect(value("calc((1em + 1px)*0)")).toBe("calc(0em + 0px)");
		});

		it("keeps them on a `steps()` count its position would reject", () => {
			// CSS Easing 2 puts the minimum at two under `jump-none` and one under
			// every other position, and the bare literal is rejected where the
			// `calc()` around the same value is clamped instead.
			expect(value("steps(calc(1),jump-none)")).toBe("steps(calc(1),jump-none)");
			expect(value("steps(calc(2),jump-none)")).toBe("steps(2,jump-none)");
			expect(value("steps(calc(1),jump-both)")).toBe("steps(1,jump-both)");
			// An omitted position is `end`, which takes one.
			expect(value("steps(calc(1))")).toBe("steps(1)");
			// Both names are read case-insensitively, so the guard still reads the
			// position a source spelled in capitals.
			expect(value("STEPS(calc(1),JUMP-NONE)")).toBe("steps(calc(1),JUMP-NONE)");
		});

		it("reads a `steps()` position it cannot name as the largest", () => {
			// An unknown spelling, and a substitution standing where the keyword
			// goes, could both resolve to `jump-none`, so the fold declines below
			// two rather than guess.
			expect(value("steps(calc(1),jump-sideways)")).toBe(
				"steps(calc(1),jump-sideways)"
			);
			expect(value("steps(calc(2),jump-sideways)")).toBe(
				"steps(2,jump-sideways)"
			);
			expect(value("steps(calc(1),var(--pos))")).toBe(
				"steps(calc(1),var(--pos))"
			);
			// A comment between the arguments is not the position.
			expect(value("steps(calc(1),/*c*/jump-none)")).toBe(
				"steps(calc(1),jump-none)"
			);
		});

		it("drives every `<step-position>` the table names", () => {
			// `steps(1, …)` has a keyword of its own at each end, which is what the
			// positions taking one count print as.
			expect(value("steps(calc(1),jump-start)")).toBe("step-start");
			expect(value("steps(calc(1),start)")).toBe("step-start");
			expect(value("steps(calc(1),jump-end)")).toBe("step-end");
			expect(value("steps(calc(1),end)")).toBe("step-end");
		});

	});

	describe("min(), max(), clamp(), abs(), sign() and hypot()", () => {
		it.each([
			// A percentage basis can be negative, and which of two is smaller then
			// depends on that sign — unlike scaling one, which is linear.
			["min(50%,60%)"],
			// Only layout knows which of these is smaller.
			["min(1em,2px)"],
			["min(100%,500px)"],
			["min(var(--x),1px)"],
			// The grammar says exactly three.
			["clamp(1px,2px)"],
			["clamp(1px,2px,3px,4px)"],
			// `calc-size()` leads with a basis, so it has no arity to read — and it
			// is now the only math function with no meaning written for it.
			["calc-size(auto,size)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it("picks across however many arguments the grammar allows", () => {
			expect(value("min(3px,2px,1px)")).toBe("1px");
			expect(value("max(1px,2px,3px,4px,5px)")).toBe("5px");
		});

		it("compares units fixed against each other", () => {
			expect(converted("min(1in,100px)")).toBe("6pc");
			expect(value("max(1s,500ms)")).toBe("1s");
		});

		it("clamps, with the lower bound winning a contradictory pair", () => {
			expect(value("clamp(1px,5px,3px)")).toBe("3px");
			expect(value("clamp(4px,1px,9px)")).toBe("4px");
		});

		it("keeps the parentheses on a negative, as calc() does", () => {
			expect(value("min(-5px,-2px)")).toBe("calc(-5px)");
		});

		it("drops a sign with abs(), whatever the unit scales by", () => {
			// Every length unit scales by a positive factor, so the coefficient's
			// sign is the value's even where the factor is not known here.
			expect(value("abs(-5px)")).toBe("5px");
			expect(value("abs(-1em)")).toBe("1em");
		});

		it("takes hypot()", () => {
			expect(value("hypot(3px,4px)")).toBe("5px");
			expect(value("hypot(6px,8px,0px)")).toBe("10px");
			// Irrational for most inputs, and written at the precision every number
			// is written at.
			expect(value("calc(hypot(1px,1px)*100)")).toBe("141.42135624px");
		});
	});

	describe("round(), mod() and rem()", () => {
		it("rounds to a step, by each of the grammar's strategies", () => {
			expect(value("round(5px,2px)")).toBe("6px");
			expect(value("round(nearest,5.5px,1px)")).toBe("6px");
			expect(value("round(up,4.5px,2px)")).toBe("6px");
			expect(value("round(down,5.5px,2px)")).toBe("4px");
			expect(value("round(to-zero,5.5px,2px)")).toBe("4px");
			// `down` is the floor, so a negative goes further from zero, and
			// `to-zero` truncates instead.
			expect(value("round(down,-4.5px,2px)")).toBe("calc(-6px)");
			expect(value("round(to-zero,-5.5px,2px)")).toBe("calc(-4px)");
		});

		it("splits mod() and rem() on whose sign the result takes", () => {
			expect(value("mod(-7px,3px)")).toBe("2px");
			expect(value("rem(-7px,3px)")).toBe("calc(-1px)");
			expect(value("mod(7px,-3px)")).toBe("calc(-2px)");
			expect(value("rem(7px,-3px)")).toBe("1px");
		});

		it.each([
			// Exactly on a step is where engines part company: these are step functions, so
			// an ulp in the engine's conversion moves the answer a whole step. Chromium reads
			// `round(down,10cm,2cm)` as `8cm` and `mod(10px,-2px)` as `-2px`.
			["round(4px,2px)"],
			["mod(10px,-2px)"],
			["rem(10px,2px)"],
			// A zero step is NaN, which engines render differently; a negative one
			// is not reasoned about here.
			["round(5px,0px)"],
			["round(5px,-2px)"],
			["mod(5px,0px)"],
			// Two units only layout can compare.
			["round(5em,2px)"],
			["mod(50%,20%)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it("keeps that unit through a fold in the argument too", () => {
			// A fold prints in whichever unit is shortest, which is the rewrite these
			// arguments refuse: Chromium reads `round(down,4.5cm,1.5cm)` as 113.386px
			// and `round(down,45mm,15mm)` as 170.079px.
			expect(value("round(down,calc(4.5cm),calc(1.5cm))")).toBe(
				"round(down,(4.5cm),(1.5cm))"
			);
			expect(value("round(down,min(4.5cm,9cm),1.5cm)")).toBe(
				"round(down,min(4.5cm,9cm),1.5cm)"
			);
			// Including a stepped function inside a stepped function.
			expect(value("round(down,round(down,10cm,3cm),1cm)")).toBe(
				"round(down,round(down,10cm,3cm),1cm)"
			);
			// The function's own result is not an argument of one, so it still folds.
			expect(value("round(5px,2px)")).toBe("6px");
		});

		it("keeps the unit a stepped argument was written with", () => {
			// `4.5cm` and `45mm` are the same length but not the same step: Chromium reads
			// `round(down,4.5cm,1.5cm)` as `3cm` and the `mm` spelling as `4.5cm`, so the
			// conversion that holds everywhere else is suppressed in here.
			expect(value("round(down,4.5cm,1.5cm)")).toBe("round(down,4.5cm,1.5cm)");
			// Outside one it still applies.
			expect(converted("4.5cm")).toBe("45mm");
		});
	});

	describe("sqrt(), pow(), log(), exp() and the trig functions", () => {
		it.each([
			// An irrational answer is written at the fewest digits that land on the
			// same layout steps, as any other number is.
			["calc(sqrt(2)*100px)", "141.42135624px"],
			["calc(pow(2,.5)*100px)", "141.42135624px"],
			["calc(exp(1)*100px)", "271.8281828px"],
			["calc(log(10)*100px)", "230.2585093px"],
			["calc(log(9,2)*100px)", "316.9925001px"],
			["calc(sin(30deg)*100px)", "50px"],
			["calc(sin(45deg)*100px)", "70.71067812px"],
			["calc(cos(50grad)*100px)", "70.71067812px"],
			// A bare number is radians (CSS Values 4 §10.6).
			["calc(sin(1)*100px)", "84.1470985px"],
			["calc(cos(1rad)*100px)", "54.0302306px"],
			// ...and the constants a calculation may name.
			["calc(pi*100px)", "314.1592654px"],
			["calc(e*100px)", "calc(e*100px)"]
		])("folds %s", (expression, folded) => {
			expect(value(expression)).toBe(folded);
		});

		it.each([
			// Tangent has an asymptote an odd quarter turn from zero, where there is
			// no value at all.
			["calc(tan(90deg)*1px)"],
			// An inverse function answers with an angle, and an angle is the one
			// thing the printer does not round — so only the arguments the table
			// states are taken.
			["asin(.5)"],
			["atan2(1,2)"],
			// Both zero is left to the engine.
			["atan2(0,0)"],
			// `infinity` and `NaN` are values no printed number spells.
			["calc(infinity*1px)"],
			["calc(nan*1px)"],
			// A trigonometric function takes an angle or a bare number, so a length
			// or a percentage is not one it can be read from.
			["calc(sin(1px)*1px)"],
			["calc(sin(1%)*1px)"],
			// An argument outside a function's domain has no answer to write.
			["calc(sqrt(-1)*1px)"],
			["calc(log(0)*1px)"],
			["calc(log(-1)*1px)"],
			// ...and base one names every power of itself.
			["calc(log(8,1)*1px)"],
			// An answer that overflows a double is not one either.
			["calc(pow(1e308,2)*1px)"],
			["calc(exp(1000)*1px)"],
			["hypot(15e307,15e307)"],
			["calc(1e308 + 1e308)"],
			["calc(1/1e-320)"],
			["calc(1px/0)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it("takes a root or a power that multiplies back exactly", () => {
			expect(value("calc(sqrt(4)*1px)")).toBe("2px");
			expect(value("calc(sqrt(2.25)*1px)")).toBe("1.5px");
			expect(value("calc(pow(2,3)*1px)")).toBe("8px");
			expect(value("calc(pow(2,-2)*1px)")).toBe(".25px");
			expect(value("calc(pow(2,0)*1px)")).toBe("1px");
		});

		it("takes a logarithm that lands on a whole power of its base", () => {
			expect(value("calc(log(8,2)*1px)")).toBe("3px");
			expect(value("calc(log(1,10)*1px)")).toBe("0");
			// A base of zero divides by an infinity, which is a number after all.
			expect(value("calc(log(8,0)*1px)")).toBe("0");
			expect(value("calc(exp(0)*1px)")).toBe("1px");
		});

		it("takes sine, cosine and tangent an eighth turn apart", () => {
			expect(value("calc(cos(0)*1px)")).toBe("1px");
			expect(value("calc(sin(90deg)*1px)")).toBe("1px");
			expect(value("calc(sin(.25turn)*1px)")).toBe("1px");
			expect(value("calc(cos(100grad)*1px)")).toBe("0");
			expect(value("calc(cos(180deg)*1px)")).toBe("calc(-1px)");
			expect(value("calc(tan(45deg)*1px)")).toBe("1px");
			expect(value("calc(tan(180deg)*1px)")).toBe("0");
			// Between them it is computed like every other irrational answer.
			expect(value("calc(tan(30deg)*1px)")).toBe(".5773503px");
		});

		it("answers the inverse functions in degrees", () => {
			expect(value("asin(1)")).toBe("90deg");
			expect(value("acos(0)")).toBe("90deg");
			expect(value("atan(1)")).toBe("45deg");
			expect(value("atan2(1,1)")).toBe("45deg");
			expect(value("atan2(0,-1)")).toBe("180deg");
			// A ratio of two lengths is a number, so it answers the same way.
			expect(value("atan2(1px,-1px)")).toBe("135deg");
			// Every other argument is left alone: an angle is not rounded, so an
			// inexact one would be written to seventeen digits.
			expect(value("atan(.3)")).toBe("atan(.3)");
		});

		it("prints a folded operand of an outer expression bare", () => {
			// No property judges it in here, so a fraction or a zero needs no
			// `calc()` of its own — which is what lets the outer fold go on.
			expect(value("calc(sin(0)*1px)")).toBe("0");
			expect(value("calc(1px*pow(2,3))")).toBe("8px");
			expect(value("min(sqrt(4)*1px,3px)")).toBe("2px");
		});
	});
});

describe("CssSyntax — convertLengthUnits", () => {
	/**
	 * @param {string} value a `width` value
	 * @param {boolean=} convertLengthUnits whether lengths may change unit
	 * @returns {string} the minified value
	 */
	const width = (value, convertLengthUnits = false) =>
		new SourceProcessor()
			.process(`a{width:${value}}`, { mode: "minify", convertLengthUnits })
			.code.slice("a{width:".length, -1);

	it("keeps a length in the unit it was written with by default", () => {
		expect(width("16px")).toBe("16px");
		expect(width("120px")).toBe("120px");
		expect(width("192px")).toBe("192px");
		expect(width("10mm")).toBe("10mm");
	});

	it("rewrites one into the shortest equal unit when asked", () => {
		expect(width("16px", true)).toBe("1pc");
		expect(width("120px", true)).toBe("90pt");
		expect(width("192px", true)).toBe("2in");
		expect(width("10mm", true)).toBe("1cm");
	});

	it("converts a time either way — only lengths are gated", () => {
		const duration = (/** @type {string} */ value) =>
			new SourceProcessor()
				.process(`a{transition-duration:${value}}`, { mode: "minify" })
				.code.slice("a{transition-duration:".length, -1);
		expect(duration("500ms")).toBe(".5s");
		expect(duration(".005s")).toBe("5ms");
	});

	it("still folds a sum into a unit the expression was written with", () => {
		// The fold is the win here, not the unit: printing `11mm` introduces no
		// unit the author did not write, where `1pc` for `16px` would.
		expect(width("calc(1cm + 1mm)")).toBe("11mm");
		expect(width("calc(2in - 1in)")).toBe("1in");
		expect(width("calc(1px + 15px)")).toBe("16px");
		expect(width("calc(1px + 15px)", true)).toBe("1pc");
	});

	it("lands a sum in a unit it was written with, gate or no gate", () => {
		// `1cm` is not a whole number of `px`, and `px` is all the gate leaves — so
		// the sum lands there, at the precision every number is written at.
		expect(width("calc(1cm + 1px)")).toBe("38.7952756px");
	});
});

describe("CssSyntax minify — vendor prefixes (at-rules)", () => {

	it("drops a prefixed spelling its twin makes dead past enough nodes to stream", () => {
		// Once the block streams, its children go straight out, so the twin is held
		// as the piece written rather than as the node its parent would assemble.
		let filler = "";
		for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
		const out = minifyFor(
			`@media all{::-webkit-input-placeholder{color:red}${filler}::placeholder{color:red}}`,
			["chrome 120"]
		);
		// The whole of it, not its ends: a filler rule the stream lost or reordered
		// in between is what this is here to catch.
		expect(out).toBe(`@media all{${filler}::placeholder{color:red}}`);
	});

});

describe("CssSyntax minify — the list a joined at-rule's seam leaves", () => {

	it("writes a seam a second pass would leave alone", () => {
		const once = minifyFor(
			fixture("css", "css-syntax-minify-the-list-a-joined-at-rule-s-seam-leaves-writes-a-seam-a-second")
		);
		expect(once).toBe(
			"@layer u{@starting-style{.modal-toggle:checked+.modal,.modal:target{opacity:0}}}"
		);
	});

	it("orders the list a distant at-rule's seam leaves", () => {
		const sheet =
			fixture("css", "css-syntax-minify-the-list-a-joined-at-rule-s-seam-leaves-orders-the-list-a");
		const once = new SourceProcessor().process(sheet, {
			mode: "minify",
			mergeDistantRules: true
		}).code;
		expect(once).toBe("@media print{.a,.b{color:red}}.q{left:0}");
	});

	it("orders the list a nested distant at-rule's seam leaves", () => {
		const sheet =
			fixture("css", "css-syntax-minify-the-list-a-joined-at-rule-s-seam-leaves-orders-the-list-a-5");
		const once = new SourceProcessor().process(sheet, {
			mode: "minify",
			mergeDistantRules: true
		}).code;
		expect(once).toBe("@media all{@media print{.a,.b{color:red}}.q{left:0}}");
	});

	it("orders the list a gathered block big enough to stream leaves", () => {
		let filler = "";
		for (let i = 0; i < 17000; i++) filler += `.f${i}{top:${i + 1}px}`;
		expect(minifyFor(`@layer a{.b{top:0}}@layer a{.a{top:0}${filler}}`)).toBe(
			`@layer a{.a,.b{top:0}${filler}}`
		);
	});

});

// The tokenizer's corpus through the other print mode: beautifying had none of
// its own, and it is what a consumer reads, so its output is snapshotted.
describe("CssSyntax — beautifying the parsing corpus", () => {
	const casesPath = path.resolve(__dirname, "../../configCases/css/parsing/cases");
	const cases = fs
		.readdirSync(casesPath)
		.filter((name) => name.endsWith(".css"))
		.map((name) => [
			name,
			fs.readFileSync(path.resolve(casesPath, name), "utf8")
		]);

	/**
	 * @param {string} src css source
	 * @param {import("../../../lib/util/SourceProcessor").PrintOptions["mode"]} mode print mode
	 * @returns {string} its serialization
	 */
	const print = (src, mode) =>
		new SourceProcessor().process(src, { mode }).code;

	it("has a corpus", () => {
		expect(cases.length).toBeGreaterThan(15);
	});

	for (const [name, code] of cases) {
		it(`should beautify "${name}"`, () => {
			const beautified = print(code, "beautify");
			expect(beautified).toMatchSnapshot();
			// The printer has to accept what it wrote: beautifying is a fixed point.
			expect(print(beautified, "beautify")).toBe(beautified);
		});
	}

	// Both modes read the same stylesheet, so minifying either form answers the
	// same — what `print modes` states over a handful, over every case here.
	for (const [name, code] of cases) {
		it(`should minify "${name}" the same from either form`, () => {
			expect(print(print(code, "beautify"), "minify")).toBe(
				print(code, "minify")
			);
		});
	}
});

describe("SourceProcessor — renderEmbeddedSource over a data: url", () => {
	/**
	 * @param {string} sheet the stylesheet
	 * @param {import("../../../lib/css/syntax-parser").EmbeddedSourceRenderer=} renderEmbeddedSource the renderer
	 * @returns {string} the minified stylesheet
	 */
	const minify = (sheet, renderEmbeddedSource) =>
		new SourceProcessor().process(sheet, {
			mode: "minify",
			renderEmbeddedSource
		}).code;

	/**
	 * @param {string} sheet the stylesheet
	 * @returns {[string, string][]} each payload offered, as `[type, source]`
	 */
	const offered = (sheet) => {
		/** @type {[string, string][]} */
		const seen = [];
		minify(sheet, (source, info) => {
			seen.push([info.type, source]);
			return source;
		});
		return seen;
	};

	const svgUrl =
		fixture("css", "source-processor-render-embedded-source-over-a-data-url-offers-an-svg-payload");
	const base64Url = `.a{background:url(data:image/svg+xml;base64,${Buffer.from(
		"<svg>  <rect/></svg>"
	).toString("base64")})}`;

	it("offers an svg payload, quoted or base64", () => {
		expect(offered(svgUrl)).toEqual([["svg", "<svg>  <rect/></svg>"]]);
		expect(offered(base64Url)).toEqual([["svg", "<svg>  <rect/></svg>"]]);
	});

	it("names the language its media type carries, and declines an unknown one", () => {
		expect(offered(fixture("css", "source-processor-render-embedded-source-over-a-data-url-names-the-language-its"))).toEqual(
			[["css", fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14")]]
		);
		expect(
			offered(fixture("css", "source-processor-render-embedded-source-over-a-data-url-names-the-language-its-2"))
		).toEqual([["json", '{"a":1}']]);
		// An image webpack has no notion of is never decoded.
		expect(
			offered(fixture("css", "source-processor-render-embedded-source-over-a-data-url-names-the-language-its-3"))
		).toEqual([]);
		expect(offered(fixture("css", "source-processor-render-embedded-source-over-a-data-url-names-the-language-its-4"))).toEqual([]);
	});

	it("offers every language `EMBEDDED_LANGUAGES` names, and prints each answer", () => {
		const { EMBEDDED_LANGUAGES } = require("../../../lib/util/dataURL");

		// One stylesheet reaching every language a media type can name.
		const sheet =
			'@import url("data:text/css,.inner {  color : red  }");' +
			'.svg{background:url("data:image/svg+xml,<svg>   <rect/>   </svg>")}' +
			'.html{background:url("data:text/html,<p>   x   </p>")}' +
			".json{background:url('data:application/json,{ \"a\" :  1 }')}" +
			'.js{background:url("data:text/javascript,var  a  =  1")}';

		// Every entry needs a live offer site behind it, and nothing may arrive
		// that the list does not name.
		expect([...new Set(offered(sheet).map(([type]) => type))].sort()).toEqual(
			[...EMBEDDED_LANGUAGES].sort()
		);

		// Being offered a payload is only half of minifying it.
		expect(minify(sheet, (source, { type }) => `/*${type}*/`)).toBe(
			"@import url(data:text/css,/*css*/);" +
				".svg{background:url(data:image/svg+xml,/*svg*/)}" +
				".html{background:url(data:text/html,/*html*/)}" +
				".json{background:url(data:application/json,/*json*/)}" +
				".js{background:url(data:text/javascript,/*javascript*/)}"
		);
	});

	it("rebuilds the url in the shortest form that parses back to it", () => {
		// A rebuilt url keeps its base64-ness, and loses quotes it no longer needs.
		expect(minify(svgUrl, (s) => s.replace(/\s+/g, ""))).toBe(
			".a{background:url(data:image/svg+xml,<svg><rect/></svg>)}"
		);
		expect(minify(base64Url, (s) => s.replace(/\s+/g, ""))).toBe(
			`.a{background:url(data:image/svg+xml;base64,${Buffer.from(
				"<svg><rect/></svg>"
			).toString("base64")})}`
		);
	});

	it("escapes only what would change what the url means", () => {
		expect(minify(svgUrl, () => "<svg>%#</svg>")).toBe(
			".a{background:url(data:image/svg+xml,<svg>%25%23</svg>)}"
		);
	});

	it("quotes and escapes a payload a url token cannot carry", () => {
		// A space or a quote would end the token, so the url takes quotes and the
		// delimiter inside it is escaped — otherwise the declaration is dropped.
		expect(minify(svgUrl, () => '<svg viewBox="0 0 2 2"/>')).toBe(
			'.a{background:url("data:image/svg+xml,<svg viewBox=\\"0 0 2 2\\"/>")}'
		);
	});

	it("keeps the stylesheet's own map coherent when the payload changes size", () => {
		// The url goes out as one piece, so the columns after it move with it —
		// rewriting a payload must not shift the mappings that follow.
		const sheet =
			fixture("css", "source-processor-render-embedded-source-over-a-data-url-keeps-the-stylesheet-s");
		/**
		 * @param {import("../../../lib/css/syntax-parser").EmbeddedSourceRenderer=} renderEmbeddedSource the renderer
		 * @returns {{ code: string, map: EXPECTED_ANY }} the printed sheet and its map
		 */
		const run = (renderEmbeddedSource) =>
			new SourceProcessor().process(sheet, {
				mode: "minify",
				source: "s.css",
				content: sheet,
				renderEmbeddedSource
			});
		const plain = run();
		const shrunk = run((source, info) =>
			info.type === "svg" ? source.replace(/\s+/g, "") : source
		);
		// Ten characters left the payload — eight of whitespace, plus the two quotes the
		// shorter url no longer needs — and the last mapping's generated column is the
		// only thing that moved, by exactly that much.
		expect(plain.code.length - shrunk.code.length).toBe(10);
		const columns = (/** @type {string} */ mappings) =>
			mappings.split(",").length;
		expect(columns(shrunk.map.mappings)).toBe(columns(plain.map.mappings));
		expect(shrunk.map.mappings).not.toBe(plain.map.mappings);
	});

	it("emits the url as written when the renderer answers with a non-string", () => {
		const untouched = minify(svgUrl);
		for (const answer of [undefined, null, 42]) {
			expect(minify(svgUrl, () => /** @type {EXPECTED_ANY} */ (answer))).toBe(
				untouched
			);
		}
	});

	it("emits the url as written when the renderer declines or throws", () => {
		for (const sheet of [svgUrl, base64Url]) {
			const untouched = minify(sheet);
			expect(minify(sheet, (s) => s)).toBe(untouched);
			expect(
				minify(sheet, () => {
					throw new Error("nope");
				})
			).toBe(untouched);
		}
	});
});

describe("CssSyntax minify — one stylesheet reaching every embedded site", () => {
	/**
	 * @param {string} payload the payload to encode
	 * @returns {string} it, base64-encoded
	 */
	const base64 = (payload) => Buffer.from(payload).toString("base64");

	const PAYLOADS = {
		css: "  .inner  {  color : red  ;  }  ",
		svg: "<svg xmlns='http://www.w3.org/2000/svg'>   <rect/>   </svg>",
		html: "<p>   x   </p><p>   y   ",
		json: '{ "a" :  1 , "b" : [ 1 , 2 ] }',
		javascript: "var   a   =   1  ;"
	};

	// Every site a stylesheet can embed a body at, each language reached twice —
	// once written out and once base64 — plus the two a renderer never sees.
	const STYLESHEET = `@import url("data:text/css,${PAYLOADS.css}") ;

.svg  { background : url("data:image/svg+xml,${PAYLOADS.svg}") ; }
.html { background : url("data:text/html,${PAYLOADS.html}") ; }
.json { background : url('data:application/json,${PAYLOADS.json}') ; }
.javascript { background : url("data:text/javascript,${
		PAYLOADS.javascript
	}") ; }

.svg-base64  { background : url(data:image/svg+xml;base64,${base64(
		PAYLOADS.svg
	)}) ; }
.css-base64  { background : url(data:text/css;base64,${base64(
		PAYLOADS.css
	)}) ; }
.html-base64 { background : url(data:text/html;base64,${base64(
		PAYLOADS.html
	)}) ; }
.json-base64 { background : url(data:application/json;base64,${base64(
		PAYLOADS.json
	)}) ; }
.javascript-base64 { background : url(data:text/javascript;base64,${base64(
		PAYLOADS.javascript
	)}) ; }

.png  { background : url("data:image/png;base64,iVBORw0KGgo=") ; }
.file { background : url("./img.png") ; }
`;

	/**
	 * @param {import("../../../lib/css/syntax-parser").EmbeddedSourceRenderer=} renderEmbeddedSource the renderer
	 * @returns {string} the minified stylesheet
	 */
	const minify = (renderEmbeddedSource) =>
		new SourceProcessor().process(STYLESHEET, {
			mode: "minify",
			renderEmbeddedSource
		}).code;

	it("offers each embedded body once, written out and base64 alike", () => {
		const { EMBEDDED_LANGUAGES } = require("../../../lib/util/dataURL");

		/** @type {[string, string][]} */
		const offered = [];

		minify((source, info) => {
			offered.push([info.type, source]);
			return source;
		});

		// A media type naming no language, and a url that is not a payload at all,
		// are never decoded — so neither reaches a renderer.
		expect(offered.map(([type]) => type)).toEqual([
			"css",
			"svg",
			"html",
			"json",
			"javascript",
			"svg",
			"css",
			"html",
			"json",
			"javascript"
		]);
		// Nothing arrives that `EMBEDDED_LANGUAGES` does not name, and every entry
		// it names has a live site behind it.
		expect([...new Set(offered.map(([type]) => type))].sort()).toEqual(
			[...EMBEDDED_LANGUAGES].sort()
		);
		// Base64 is a spelling of the url, not of the body: each language is handed
		// the same source both times.
		expect(offered.map(([, source]) => source)).toEqual(
			offered.map(
				([type]) => PAYLOADS[/** @type {keyof typeof PAYLOADS} */ (type)]
			)
		);
	});

	it("prints each answer back where it was asked for", () => {
		expect(minify((source, { type }) => `/*${type}*/`)).toMatchSnapshot();
	});

	it("leaves every embedded body as written when no renderer is passed", () => {
		// The stylesheet around them is minified; the bodies are not, webpack
		// having no minifier of its own to fall back to here.
		expect(minify()).toMatchSnapshot();
	});
});

describe("CssSyntax minify — a fallback for a color the target cannot read", () => {

	// A call that folds on what it is written over, over an origin the target
	// cannot read. Resolving the origin alone leaves the call itself standing,
	// which a second pass would then fold — so one pass has to settle both.
	it.each([
		["oklch", "rgb(from oklch(0.5 0.1 200) r g b)", "#00747a"],
		["lab", "rgb(from lab(50 20 30) r g b)", "#a16945"],
		["lch", "rgb(from lch(50 30 40) r g b)", "#a26757"],
		["oklab", "rgb(from oklab(0.5 0.05 0.1) r g b)", "#8f5305"],
		["hwb", "rgb(from hwb(194 0% 0%) r g b)", "#00c3ff"],
		["color()", "rgb(from color(display-p3 0.2 0.5 0.6) r g b)", "#00829c"],
		["color-mix()", "rgb(from color-mix(in oklch,red,blue) r g b)", "#ba00c2"],
		["a mix of its own", "color-mix(in oklch,oklch(0.7 0.1 20),red)", "#ed5d5a"],
		[
			"a mix against transparent",
			"color-mix(in srgb,oklch(63.7% .237 25.331) 50%,#0000)",
			"#fb2c3680"
		],
		["a call holding a call", "oklch(from red calc(l * 0.8) c h)", "#d00000"]
	])("settles a fallback written over %s", (_name, value, byte) => {
		const css = `a{color:${value}}`;
		const once = minifyFor(css, ["chrome 100", "firefox 100", "safari 15.4"]);
		expect(once.startsWith(`a{color:${byte};`)).toBe(true);
	});

});

describe("CssSyntax minify — the version each rewrite turns on at", () => {
	// One selection either side of the compat data's version, so an off-by-one
	// release fails. Chrome alone: every entry here has a version for it.
	it.each([
		["a hex alpha", fixture("css", "css-syntax-every-rewrite-has-a-switch-leaves-a-hex-alpha-where-lower-unsupported"), 62],
		[
			"a two-position color stop",
			fixture("css", "css-syntax-minify-the-version-each-rewrite-turns-on-at-rewrites-a-two-position"),
			72
		],
		["a multi-keyword `display`", fixture("css", "css-syntax-minify-lowering-a-spelling-the-target-cannot-read-writes-a-multi"), 115],
		["`system-ui`", fixture("css", "css-syntax-every-rewrite-has-a-switch-leaves-system-ui-where-lower-unsupported"), 56],
		["a `text-decoration` style", fixture("css", "css-syntax-minify-the-rest-of-the-target-s-abilities-writes-a-text-decoration-5"), 57],
		["...and its thickness", fixture("css", "css-syntax-minify-the-rest-of-the-target-s-abilities-writes-a-text-decoration-6"), 87],
		["a `color()`", fixture("css", "css-syntax-minify-the-predefined-color-spaces-keeps-one-it-cannot-pin-down-2"), 111],
		["`hwb()`", fixture("css", "css-syntax-minify-a-fallback-for-a-color-the-target-cannot-read-folds-only-the-2"), 101],
		["the Lab family", fixture("css", "css-syntax-minify-a-fallback-for-a-color-the-target-cannot-read-writes-the-color"), 111],
		["...and the Oklab one", fixture("css", "css-syntax-minify-the-version-each-rewrite-turns-on-at-rewrites-and-the-oklab"), 111],
		["the `inset` shorthand", fixture("css", "css-syntax-every-rewrite-has-a-switch-leaves-an-inset-where-lower-unsupported-is"), 87],
		["a media range", fixture("css", "css-syntax-minify-the-version-each-rewrite-turns-on-at-rewrites-a-media-range"), 104],
		["two-value `overflow`", fixture("css", "css-syntax-every-rewrite-has-a-switch-leaves-an-overflow-pair-where-lower"), 68],
		["a `place-*` shorthand", fixture("css", "css-syntax-every-rewrite-has-a-switch-leaves-a-place-items-where-lower"), 59]
	])("rewrites %s below Chrome %i and not at it", (_name, css, version) => {
		const below = minifyFor(css, [`chrome ${version - 1}`]);
		const at = minifyFor(css, [`chrome ${version}`]);
		expect(below).not.toBe(at);
		// At the version the feature arrived, the spelling is the author's own.
		expect(at).toBe(minifyFor(css));
	});

	it("writes `light-dark()` only between the two versions it needs", () => {
		const css = fixture("css", "css-syntax-minify-the-version-each-rewrite-turns-on-at-writes-light-dark-only");
		// ...and at the version the function itself arrived, there is nothing to
		// write another way.
		expect(minifyFor(css, ["chrome 122"])).not.toBe(css);
	});

});

describe("CssSyntax minify — light-dark()", () => {

	it("says which half a rule setting `color-scheme` takes", () => {
		// `only` narrows how the scheme is chosen, and `normal` is the light one.
		expect(
			minifyFor(fixture("css", "css-syntax-minify-light-dark-says-which-half-a-rule-setting-color-scheme-takes-3"), [
				"chrome 100"
			])
		).toContain("--webpack-light:;--webpack-dark:initial");
		expect(
			minifyFor(fixture("css", "css-syntax-minify-light-dark-says-which-half-a-rule-setting-color-scheme-takes-4"), [
				"chrome 100"
			])
		).toContain("--webpack-light:initial;--webpack-dark:}");
	});

});

describe("CssSyntax minify — a slot holding its own initial", () => {
	/**
	 * @param {string} css a stylesheet
	 * @returns {string} its minified serialization, with no target to answer for
	 */
	const minify = (css) => minifyFor(css);

	it("keeps a `text-decoration` a slot the target cannot read stands in", () => {
		// Taking the thickness out would bring the rest of the declaration back to
		// life on an engine that drops it whole, where the author wrote nothing.
		expect(
			minifyFor(fixture("css", "css-syntax-minify-a-slot-holding-its-own-initial-keeps-a-text-decoration-a-slot"), ["chrome 50"])
		).not.toContain("text-decoration:none}");
	});

});

describe("CssSyntax minify — nesting the target cannot read", () => {

	it("gives each prefix copy the scheme toggles of the rule it copies", () => {
		// An engine reading only the prefixed spelling reads only the copy, so the
		// copy has to switch `light-dark()` as the rule it copies does.
		const css = fixture("css", "css-syntax-minify-nesting-the-target-cannot-read-writes-a-hoisted-prefix-copy-2");
		const minified = minifyFor(css, ["safari 15"]);
		expect(minified).toBe(
			"a:-webkit-full-screen{color-scheme:light dark;--webpack-light:initial;--webpack-dark:}" +
				"a:fullscreen{color-scheme:light dark;--webpack-light:initial;--webpack-dark:}" +
				"@media (prefers-color-scheme:dark){" +
				"a:-webkit-full-screen{--webpack-light:;--webpack-dark:initial}" +
				"a:fullscreen{--webpack-light:;--webpack-dark:initial}}" +
				"b{color:var(--webpack-light,red)var(--webpack-dark,blue)}" +
				":where(:root){--webpack-light:initial;--webpack-dark:}"
		);
		// Hoisted, the copies share one query, and a rule with none keeps its own.
		const nested = minifyFor(
			fixture("css", "css-syntax-minify-nesting-the-target-cannot-read-gives-each-prefix-copy-the-4"),
			["safari 15"]
		);
		expect(nested).toBe(
			"a:-webkit-full-screen{color-scheme:light dark;--webpack-light:initial;--webpack-dark:}" +
				"a:fullscreen{color-scheme:light dark;--webpack-light:initial;--webpack-dark:}" +
				"@media (prefers-color-scheme:dark){" +
				"a:-webkit-full-screen{--webpack-light:;--webpack-dark:initial}" +
				"a:fullscreen{--webpack-light:;--webpack-dark:initial}}" +
				"a:hover{color-scheme:light dark;--webpack-light:initial;--webpack-dark:}" +
				"@media (prefers-color-scheme:dark){a:hover{--webpack-light:;--webpack-dark:initial}}" +
				"b{color:var(--webpack-light,red)var(--webpack-dark,blue)}" +
				":where(:root){--webpack-light:initial;--webpack-dark:}"
		);
	});

});

describe("CssSyntax minify — `declareCharset`", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {import("../../../lib/css/syntax-parser").CssProcessOptions=} options more options
	 * @returns {string} its minified serialization
	 */
	const declared = (css, options) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			declareCharset: true,
			...options
		}).code;

	it("maps the stylesheet past the `@charset` it opens with", () => {
		const css = fixture("css", "css-syntax-minify-declare-charset-writes-a-content-1-f600-with-the-character");
		const { map } = new SourceProcessor().process(css, {
			mode: "minify",
			declareCharset: true,
			source: "a.css",
			content: css
		});
		// Column 17, past `@charset "UTF-8";`, maps to the input's first byte.
		expect(JSON.stringify(map)).toContain('"mappings":"iBAAA"');
	});
});

describe("cssMinify export", () => {
	it("is the minifier itself, reachable from the public entry", () => {
		const webpack = require("../../..");

		expect(webpack.css.cssMinify).toBe(require("../../../lib/css/cssMinify"));
	});

	it("carries the minimizer contract minimizer-webpack-plugin dispatches on", () => {
		const webpack = require("../../..");

		const { cssMinify } = webpack.css;

		expect(cssMinify.getTypes()).toEqual(["css"]);
		expect(cssMinify.getEmbeddedTypes()).toContain("css");
		expect(cssMinify.supportsWorkerThreads()).toBe(true);
		expect(cssMinify.filter("a.css")).toBe(true);
		expect(cssMinify.filter("a.html")).toBe(false);
		// Last, so a `@charset` the print opens with stays the file's first bytes.
		expect(cssMinify.getBannerPosition()).toBe("end");
	});

	it("declares UTF-8 for a file of its own, not for a `style` attribute", async () => {
		const cssMinify = require("../../../lib/css/cssMinify");

		const sheet = await cssMinify({ "a.css": fixture("css", "css-syntax-minify-declare-charset-writes-a-content-1-f600-with-the-character") });
		expect(sheet.code).toBe('@charset "UTF-8";a{content:"\u{1F600}"}');
		const attribute = await cssMinify(
			{ "a.css": fixture("css", "css-syntax-minify-declare-charset-keeps-it-in-the-declarations-of-a-style") },
			undefined,
			{ as: "block-contents" }
		);
		expect(attribute.code).toBe('content:"\\1F600"');
	});

	it("minifies through the public entry", async () => {
		const webpack = require("../../..");

		const { cssMinify } = webpack.css;

		const { code } = await cssMinify({ "a.css": "a {\n\tcolor: red;\n}\n" });

		expect(code).toMatchInlineSnapshot('"a{color:red}"');
	});

	it("reads a Buffer input as UTF-8", async () => {
		const cssMinify = require("../../../lib/css/cssMinify");

		const { code } = await cssMinify({
			"a.css": Buffer.from(fixture("css", "css-minify-export-reads-a-buffer-input-as-utf-8"), "utf8")
		});

		expect(code).toBe('@charset "UTF-8";a:before{content:"é"}');
	});

	it("keeps the space before an SVG `data:` URL it minifies", async () => {
		const cssMinify = require("../../../lib/css/cssMinify");

		const { code } = await cssMinify(
			{
				"a.css":
					'.a{background:red url("data:image/svg+xml,<svg></svg>")}' +
					".b{background:no-repeat url(data:image/svg+xml,<svg></svg>)}"
			},
			undefined,
			{ svg: true }
		);

		expect(code).toBe(
			".a{background:red url(data:image/svg+xml,<svg/>)}" +
				".b{background:no-repeat url(data:image/svg+xml,<svg/>)}"
		);
	});

	describe("a caller's renderEmbeddedSource", () => {
		const sheet =
			'.a{background:url("data:image/svg+xml,<svg></svg>")}' +
			'.b{background:url("data:text/css,a { color : red }")}';

		it("prints what it answers, and leaves what it declines as written", async () => {
			const cssMinify = require("../../../lib/css/cssMinify");

			/** @type {string[]} */
			const asked = [];
			const { code } = await cssMinify({ "a.css": sheet }, undefined, {
				renderEmbeddedSource: (_source, { type }) => {
					asked.push(type);
					return type === "svg" ? "<svg id=x/>" : undefined;
				}
			});

			expect(asked).toEqual(["svg", "css"]);
			expect(code).toBe(
				".a{background:url(data:image/svg+xml,<svg\\ id=x/>)}" +
					'.b{background:url("data:text/css,a { color : red }")}'
			);
		});

		it("minifies an SVG it declines as the `.svg` assets are, under `svg`", async () => {
			const cssMinify = require("../../../lib/css/cssMinify");

			const { code } = await cssMinify({ "a.css": sheet }, undefined, {
				svg: true,
				renderEmbeddedSource: () => undefined
			});

			expect(code).toBe(
				".a{background:url(data:image/svg+xml,<svg/>)}" +
					'.b{background:url("data:text/css,a { color : red }")}'
			);
		});

		it("returns what it reports beside the code", async () => {
			const cssMinify = require("../../../lib/css/cssMinify");

			const result = await cssMinify({ "a.css": sheet }, undefined, {
				renderEmbeddedSource: (source, { type }) =>
					type === "svg" ? { code: source, warnings: ["w"] } : undefined
			});

			expect(result.warnings).toEqual(["w"]);
			expect(result.errors).toBeUndefined();
		});
	});

	it("keeps the comments `some` names while extracting others", async () => {
		const cssMinify = require("../../../lib/css/cssMinify");

		const result = await cssMinify(
			{ "a.css": fixture("css", "css-minify-export-keeps-the-comments-some-names-while-extracting-others") },
			undefined,
			{ extractComments: /foo/, comments: "some" }
		);

		expect(result.code).toBe("/*! keep */a{b:c}d{e:f}");
		expect(result.extractedComments).toEqual(["/* foo */"]);
	});

	describe("extractComments", () => {
		const sheet =
			"/*! one */a{color:red}/* plain */b{color:blue}/*! one */" +
			"/* @license two */c{margin:0}/*# sourceMappingURL=a.map */";

		/**
		 * @param {EXPECTED_ANY} extractComments the plugin's option
		 * @param {Record<string, EXPECTED_ANY>=} options `minimize.css`
		 * @returns {Promise<{ code: string, extractedComments?: string[] }>} what the minifier answers
		 */
		const run = async (extractComments, options = {}) => {
			const cssMinify = require("../../../lib/css/cssMinify");

			const { code, extractedComments } = await cssMinify(
				{ "a.css": sheet },
				undefined,
				options,
				extractComments
			);
			return { code, extractedComments };
		};

		it.each([
			// The plugin's default: a banner or license, once each, and the pragma stays.
			[
				true,
				"a{color:red}b{color:blue}c{margin:0}",
				["/*! one */", "/* @license two */"]
			],
			[
				{},
				"a{color:red}b{color:blue}c{margin:0}",
				["/*! one */", "/* @license two */"]
			],
			[
				/license/,
				"a{color:red}b{color:blue}c{margin:0}",
				["/* @license two */"]
			],
			[
				"^!",
				"a{color:red}b{color:blue}c{margin:0}",
				["/*! one */"]
			],
			[
				{ condition: "all" },
				"a{color:red}b{color:blue}c{margin:0}",
				[
					"/*! one */",
					"/* plain */",
					"/* @license two */",
					"/*# sourceMappingURL=a.map */"
				]
			],
			[
				{
					condition: (/** @type {{ value: string }} */ comment) =>
						comment.value.includes("two")
				},
				"a{color:red}b{color:blue}c{margin:0}",
				["/* @license two */"]
			],
			// Extracting with a condition nothing meets still leaves the rest out.
			[
				{ condition: false },
				"a{color:red}b{color:blue}c{margin:0}",
				undefined
			]
		])("takes out what %p names", async (extractComments, code, extracted) => {
			expect(await run(extractComments)).toEqual({
				code,
				extractedComments: extracted
			});
		});

		it.each([
			[
				true,
				"a{color:red}b{color:blue}c{margin:0}",
				["/*! one */", "/* @license two */"]
			],
			[
				"all",
				"a{color:red}b{color:blue}c{margin:0}",
				[
					"/*! one */",
					"/* plain */",
					"/* @license two */",
					"/*# sourceMappingURL=a.map */"
				]
			],
			[
				/license/,
				"a{color:red}b{color:blue}c{margin:0}",
				["/* @license two */"]
			],
			[
				(/** @type {{ value: string }} */ comment) =>
					comment.value.includes("one"),
				"a{color:red}b{color:blue}c{margin:0}",
				["/*! one */"]
			]
		])(
			"takes out what `minimize.css.extractComments: %p` names, over the plugin's",
			async (extractComments, code, extracted) => {
				expect(await run(false, { extractComments })).toEqual({
					code,
					extractedComments: extracted
				});
			}
		);

		it.each([
			["the plugin asks for none", false, {}],
			["the plugin states nothing", undefined, {}],
			["`minimize.css` asks for none", true, { extractComments: false }]
		])("leaves them in place where %s", async (_name, extractComments, options) => {
			expect(await run(extractComments, options)).toEqual({
				code: "/*! one */a{color:red}b{color:blue}/*! one *//* @license two */c{margin:0}",
				extractedComments: undefined
			});
		});

		// cspell:ignore licence
		it("hands a predicate the comment's text, line and column", async () => {
			const cssMinify = require("../../../lib/css/cssMinify");

			/** @type {{ value: string, line: number, col: number }[]} */
			const seen = [];
			await cssMinify(
				{ "a.css": fixture("css", "css-minify-export-extract-comments-hands-a-predicate-the-comment-s-text-line-and") },
				undefined,
				{
					extractComments: (
						/** @type {{ value: string, line: number, col: number }} */ comment
					) => {
						seen.push(comment);
						return false;
					}
				}
			);
			expect(seen).toEqual([
				{ value: "! a ", line: 1, col: 0 },
				{ value: " b ", line: 3, col: 1 },
				{ value: " c ", line: 4, col: 5 }
			]);
		});

		it("takes what terser's own `some` takes, bar IE's `@cc_on`", async () => {
			const cssMinify = require("../../../lib/css/cssMinify");

			const { code, extractedComments } = await cssMinify(
				{
					"a.css":
						"/**! three */a{color:red}/* @licence four */b{color:blue}" +
						"/* @cc_on */c{margin:0}/* plain */"
				},
				undefined,
				{},
				"some"
			);
			expect(code).toBe("a{color:red}b{color:blue}c{margin:0}");
			expect(extractedComments).toEqual(["/**! three */", "/* @licence four */"]);
		});

		it.each([
			[true, "/* plain */"],
			["all", "/* plain */"],
			[false, ""],
			["plain", "/* plain */"],
			[/plain/, "/* plain */"],
			[(/** @type {string} */ comment) => comment.includes("plain"), "/* plain */"]
		])("keeps what `comments: %p` keeps of the rest", async (comments, kept) => {
			const { code } = await run(true, { comments });
			expect(code).toContain(`a{color:red}${kept}b{color:blue}`);
			expect(code).not.toContain("/*! one */");
		});
	});
});

describe("SourceProcessor — mergeDistantRules", () => {
	/**
	 * @param {string} sheet the stylesheet
	 * @param {boolean=} mergeDistantRules whether to give a rule a later one's selectors
	 * @returns {string} the minified stylesheet
	 */
	const minify = (sheet, mergeDistantRules) =>
		new SourceProcessor().process(sheet, {
			mode: "minify",
			mergeDistantRules
		}).code;

	it("merges where the rule between touches nothing the block does", () => {
		expect(minify(fixture("css", "source-processor-merge-distant-rules-gives-an-earlier-rule-the-selectors-of-a"), true)).toContain(
			".a,.c"
		);
	});

	it("does not write a selector the list already carries", () => {
		expect(
			minify(fixture("css", "source-processor-merge-distant-rules-does-not-write-a-selector-the-list-already"), true)
		).not.toMatch(/\.a[^{]*,\.a/);
	});

	it("keeps a rule an identical later one would otherwise take back with it", () => {
		// The grown rule is keyed again by what it now says: left under the text it
		// went out as, a later copy of that text takes the whole rule back.
		const sheet =
			fixture("css", "source-processor-merge-distant-rules-keeps-a-rule-an-identical-later-one-would");
		expect(minify(sheet, true)).toContain(".c");
	});

	it("emits the rule it was holding exactly once", () => {
		// The merge returns early, so the held rule has to be let go with it.
		const out = minify(
			fixture("css", "source-processor-merge-distant-rules-emits-the-rule-it-was-holding-exactly-once"),
			true
		);
		expect(out.match(/margin:0/g)).toHaveLength(1);
	});

	it("leaves the source map pointing at what each rule came from", () => {
		const sheet = fixture("css", "source-processor-merge-distant-rules-leaves-the-source-map-pointing-at-what-each");
		const { code, map } = new SourceProcessor().process(sheet, {
			mode: "minify",
			mergeDistantRules: true,
			source: "in.css",
			content: sheet
		});
		expect(code).toBe(".a,.c{color:red}.b{margin:0}");
		expect(map).toBeDefined();
	});

	it("keeps every declaration the sheet had", () => {
		const sheet =
			fixture("css", "source-processor-merge-distant-rules-gathers-a-whole-run-into-the-first-of-them");
		const out = minify(sheet, true);
		for (const declaration of [fixture("css", "source-processor-merging-adjacent-style-writes-a-style-attribute-whose-4"), "margin:0", "padding:0"]) {
			expect(out).toContain(declaration);
		}
	});

});

// Every entry the tables hold has to stay a non-negative integer below 2**31, or
// a numbering scheme that outgrew it truncates each window silently.
describe("CssData — the version tables stay in their element type", () => {
	const {
		NEVER,
		getPrefixWindows,
		PREFIX_WINDOW_STARTS,
		getSupportProfiles
	} = require("../../../lib/css/data");

	it.each([
		["getPrefixWindows()", () => getPrefixWindows()],
		["getSupportProfiles()", () => getSupportProfiles()]
	])("%s holds versions the element type represents exactly", (_name, get) => {
		const table = get();
		expect(table).toBeInstanceOf(Uint32Array);
		let realMax = 0;
		for (const version of table) {
			expect(Number.isInteger(version)).toBe(true);
			expect(version).toBeGreaterThanOrEqual(0);
			if (version !== NEVER && version > realMax) realMax = version;
		}
		// The sentinel has to stay above every real version, or a still-prefixed
		// window would end before a browser that is in it.
		expect(realMax).toBeLessThan(NEVER);
	});

	it("keeps NEVER a small integer, and Safari TP below it", () => {
		expect(Number.isInteger(NEVER)).toBe(true);
		expect(NEVER).toBeLessThan(2 ** 31);
		// `_encodeBrowserVersion` reads Safari TP as `NEVER - 1`, which must still
		// be newer than any real version rather than a version of its own.
		expect(NEVER - 1).toBeGreaterThan(100 * 100000);
	});

	it("indexes the window table within its element type", () => {
		expect(PREFIX_WINDOW_STARTS).toBeInstanceOf(Uint16Array);
		for (const start of PREFIX_WINDOW_STARTS) {
			expect(start).toBeLessThanOrEqual(getPrefixWindows().length);
		}
		// The last start is the end of the last list, so it is the table's length.
		expect(PREFIX_WINDOW_STARTS[PREFIX_WINDOW_STARTS.length - 1]).toBe(
			getPrefixWindows().length
		);
	});
});

// A rewrite reached from inside another switch's block stops when that switch is
// turned off, which no test of either switch alone would notice.
describe("CssSyntax — the per-transform switches are independent", () => {
	const { SourceProcessor } = require("../../../lib/css/syntax");

	/**
	 * @param {string} src css source
	 * @param {import("../../../lib/css/syntax-parser").CssTransformOptions=} transforms which rewrites to make
	 * @returns {string} the minified serialization
	 */
	const min = (src, transforms) =>
		new SourceProcessor().process(src, { mode: "minify", transforms }).code;

	// One input per switch, which that switch alone rewrites.
	/** @type {Record<string, string>} */
	const PROBES = {
		comments: fixture("css", "css-syntax-the-per-transform-switches-are-independent-comments-is-the-only"),
		mergeLonghands: fixture("css", "css-syntax-the-per-transform-switches-are-independent-merge-longhands-is-the"),
		mergeRules: fixture("css", "css-syntax-the-per-transform-switches-are-independent-merge-rules-is-the-only"),
		normalizeQuotes: fixture("css", "css-syntax-the-per-transform-switches-are-independent-normalize-quotes-is-the"),
		reduceFunctions: fixture("css", "css-syntax-the-per-transform-switches-are-independent-reduce-functions-is-the"),
		removeDeadRules: fixture("css", "css-syntax-the-per-transform-switches-are-independent-remove-dead-rules-is-the"),
		shortenColors: fixture("css", "css-syntax-the-per-transform-switches-are-independent-shorten-colors-is-the-only"),
		shortenMediaQueries: fixture("css", "css-syntax-the-per-transform-switches-are-independent-shorten-media-queries-is"),
		shortenNumbers: fixture("css", "css-syntax-the-per-transform-switches-are-independent-shorten-numbers-is-the"),
		shortenSelectors: fixture("css", "css-syntax-the-per-transform-switches-are-independent-shorten-selectors-is-the"),
		shortenValues: fixture("css", "css-syntax-the-per-transform-switches-are-independent-shorten-values-is-the-only")
	};
	const NAMES = Object.keys(PROBES);
	/**
	 * @param {string} name a switch
	 * @returns {import("../../../lib/css/syntax-parser").CssTransformOptions} it turned off
	 */
	const turnOff = (name) => ({
		[name]: name === "comments" ? "all" : false
	});

	it.each(NAMES)("%s is the only switch that stops its own rewrite", (name) => {
		const probe = PROBES[name];
		// The probe has to isolate the switch, or the rows below prove nothing.
		expect(min(probe, turnOff(name))).not.toBe(min(probe));
	});

	it.each(NAMES)("%s keeps rewriting while any other switch is off", (name) => {
		const probe = PROBES[name];
		const expected = min(probe);
		for (const other of NAMES) {
			if (other === name) continue;
			// Named in the message so a failure says which pair coupled.
			expect({ [other]: min(probe, turnOff(other)) }).toEqual({
				[other]: expected
			});
		}
	});
});

describe("SourceProcessor — an at-rule named with CSS escapes", () => {
	/**
	 * @param {string} sheet the stylesheet
	 * @param {object=} options what the minifying print is asked for
	 * @returns {string} the minified stylesheet
	 */
	const minify = (sheet, options) =>
		new SourceProcessor().process(sheet, {
			mode: "minify",
			// The escape is echoed back, so each test reads which rule it named.
			transforms: { rewriteEscapes: false },
			...options
		}).code;

	// A run of hex escapes before a prelude the opener never matches: two
	// alternatives that could each take `\\6d` repartitioned it on every
	// backtrack, so 20 of them took minutes rather than the millisecond here.
	it("reads a run of escapes the opener rejects without backtracking", () => {
		const sheet = `@${"\\6d".repeat(20)} (x){.a{color:red}}`;
		const started = Date.now();
		expect(typeof minify(sheet)).toBe("string");
		expect(Date.now() - started).toBeLessThan(2000);
	});
});

describe("CssSyntax — recurseBlocks", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {boolean} recurseBlocks whether to walk into block bodies
	 * @returns {number} how many qualified rules the walk visited
	 */
	const visited = (css, recurseBlocks) => {
		let seen = 0;
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: () => {
					seen++;
				}
			})
			.process(css, { recurseBlocks });
		return seen;
	};

	it.each([
		["an at-rule body", fixture("css", "css-syntax-recurse-blocks-walks-an-at-rule-body-only-where-asked"), 1, 0],
		["a nested rule", fixture("css", "css-syntax-recurse-blocks-walks-a-nested-rule-only-where-asked"), 2, 1],
		["a layer holding both", fixture("css", "css-syntax-recurse-blocks-walks-a-layer-holding-both-only-where-asked"), 2, 0]
	])("walks %s only where asked", (_name, css, deep, shallow) => {
		expect(visited(css, true)).toBe(deep);
		expect(visited(css, false)).toBe(shallow);
	});

	it.each([
		["a declaration alone", fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14")],
		["an at-rule body", fixture("css", "css-syntax-recurse-blocks-walks-an-at-rule-body-only-where-asked")],
		["a nested rule", fixture("css", "css-syntax-recurse-blocks-walks-a-nested-rule-only-where-asked")],
		["a supports body", fixture("css", "css-syntax-recurse-blocks-prints-a-supports-body-whatever-it-is-set-to")],
		["a layer holding both", fixture("css", "css-syntax-recurse-blocks-walks-a-layer-holding-both-only-where-asked")]
	])("prints %s whatever it is set to", (_name, css) => {
		// A block is printed from its children, so printing needs every one of
		// them — which is why a writer reads this no differently than `skip`.
		const asked = new SourceProcessor().process(css, {
			mode: "minify",
			recurseBlocks: false
		}).code;
		expect(asked).toBe(
			new SourceProcessor().process(css, { mode: "minify" }).code
		);
	});
});

describe("CssSyntax minify — values a browser reads the same when omitted", () => {
	const settled = (/** @type {string} */ css) => {
		const once = minifyFor(css);
		return once;
	};

	it("leaves the pair a light-dark() lowering writes to that lowering", () => {
		const legacy = ["chrome 100", "firefox 100", "safari 15.4"];
		const css =
			fixture("css", "css-syntax-minify-values-a-browser-reads-the-same-when-omitted-leaves-the-pair-a");
		const once = minifyFor(css, legacy);
		expect(once).toContain(
			".b{color-scheme:light dark;--webpack-light:red;--webpack-light:initial;"
		);
	});

});

// Flexbox 2 added `flex-line-count`, a longhand neither `flex` nor `flex-flow`
// resets. Every flex property `mdn-data` names is pinned here, so the next one
// fails until someone checks which shorthand, if any, the spec puts it in.
describe("CssSyntax — the flex properties", () => {
	const { getShorthandLonghands } = require("../../../lib/css/data");

	const FLEX_SHORTHANDS = new Map([
		["flex", ["flex-basis", "flex-grow", "flex-shrink"]],
		["flex-flow", ["flex-direction", "flex-wrap"]]
	]);
	// The flex properties no shorthand sets, with a value each takes.
	const STANDALONE = new Map([["flex-line-count", "2"]]);

	it("knows every flex property mdn-data names", () => {
		const names = Object.keys(require("mdn-data/css/properties.json")).filter(
			(name) => name.startsWith("flex")
		);
		expect(names.sort()).toEqual(
			[
				...FLEX_SHORTHANDS.keys(),
				...[...FLEX_SHORTHANDS.values()].flat(),
				...STANDALONE.keys()
			].sort()
		);
	});

	it.each([...FLEX_SHORTHANDS])(
		"folds only its own longhands into %s",
		(shorthand, longhands) => {
			expect(
				[.../** @type {Set<string>} */ (getShorthandLonghands().get(shorthand))].sort()
			).toEqual(longhands);
		}
	);

	it.each([...STANDALONE.keys()])("puts %s in no shorthand", (property) => {
		for (const [, longhands] of getShorthandLonghands()) {
			expect(longhands.has(property)).toBe(false);
		}
	});

});

describe("CssSyntax minify — what a comparison with other minifiers found", () => {
	const settled = (/** @type {string} */ css) => {
		const once = minifyFor(css);
		return once;
	};

	describe("for a target", () => {
		const modern = ["chrome 130", "firefox 130", "safari 18"];

		it("drops a rule a join writes again, in the one pass", () => {
			// The two later rules join first; the joined one writes the first again.
			const css =
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target");
			const once = minifyFor(css, modern);
			expect(once).toBe(
				"@layer x{@supports (x:y){.s{color:blue}}.s{color:red;opacity:.8}}"
			);
		});

		it.each([
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-14"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-15")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-22"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-23")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-20"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-21")
			],
			// Either alone reads apart from the other, and so do two values.
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-9"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-9")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-12"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-12")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-10"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-11")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-18"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-19")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-16"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-17")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-13"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-13")
			],
			[
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-24"),
				fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-25")
			]
		])("writes %s as %s", (css, expected) => {
			const once = minifyFor(css, modern);
			expect(once).toBe(expected);
		});

		it("keeps the vendor test an older target needs", () => {
			const css = fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-7");
			expect(
				minifyFor(
					fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-for-a-target-8"),
					["safari 9"]
				)
			).toContain("-webkit-linear-gradient");
		});
	});

	it.each([
		// An area row with no size is an `auto` one, where `none` is no row at all.
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-7")],
		// One size per area string.
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-9")],
		// What the areas form cannot hold.
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-4")],
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-3")],
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-8")],
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-5")],
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-10")],
		// A write still read, a rule or a vendor property between.
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-6")],
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid-2")],
		[fixture("css", "css-syntax-minify-what-a-comparison-with-other-minifiers-found-keeps-a-grid")]
	])("keeps %s apart", (css) => {
		expect(settled(css)).not.toContain("grid-template:");
	});
});

describe("CssSyntax minify — joining rules whose values hold escapes", () => {
	/**
	 * @param {string} css source text
	 * @returns {string[]} each declaration's name, string and url, sorted
	 */
	const pieces = (css) => {
		/** @type {string[]} */
		const out = [];
		/**
		 * @param {string} kind what the piece is
		 * @returns {(path: import("../../../lib/css/syntax-parser").CssPath) => void} visitor collecting it
		 */
		const collect = (kind) => (path) => {
			out.push(
				`${kind}:${kind === "declaration" ? path.name() : path.value()}`
			);
		};
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: collect("declaration"),
				[NodeType.String]: collect("text"),
				[NodeType.Url]: collect("text")
			})
			.process(css);
		return out.sort();
	};

	it.each([
		"css-syntax-minify-joining-rules-whose-values-hold-escapes-joins-s-keeping-every",
		"css-syntax-minify-joining-rules-whose-values-hold-escapes-joins-s-keeping-every-2",
		"css-syntax-minify-joining-rules-whose-values-hold-escapes-joins-s-keeping-every-3",
		"css-syntax-minify-joining-rules-whose-values-hold-escapes-joins-s-keeping-every-4",
		"css-syntax-minify-joining-rules-whose-values-hold-escapes-joins-s-keeping-every-5"
	])("joins %s keeping every string whole", (name) => {
		const css = fixture("css", name);
		/**
		 * @param {boolean} reorderDeclarations whether declarations may move
		 * @returns {string} the minified output
		 */
		const minify = (reorderDeclarations) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(css, {
					mode: "minify",
					transforms: { reorderDeclarations }
				})
			).code;
		expect(pieces(minify(false))).toEqual(pieces(css));
		expect(pieces(minify(true))).toEqual(pieces(css));
	});
});

describe("CssSyntax minify — the same rewrite in every context", () => {
	const modern = ["chrome 130", "firefox 130", "safari 18"];
	const bodies = [
		"border:none",
		"border-block:none",
		"border-inline-start:none",
		"outline:none",
		"column-rule:medium none",
		"transform:translate(calc(0% + 1px),calc(0% - 2vw))",
		"transform:translateX(calc(1rem - 0%))",
		"transform:translateZ(calc(0% + 1px))",
		"transform:translate3d(calc(0% + 1px),0,calc(0% + 2px))",
		"color:#fff;color:var(--c)",
		"color:var(--a);color:var(--b)",
		"padding:1px;padding:env(safe-area-inset-top)",
		"width:10px;width:calc(var(--w)*2)",
		"color:red;color:if(style(--x:1):red;else:blue)",
		"position:relative;display:block;cursor:pointer;line-height:0",
		"gap:1px;grid:auto/auto",
		"margin-left:0;color:red;margin-inline-start:8px;display:block",
		"margin:0;padding:0;list-style:none;margin-left:-15px",
		"margin:0;margin-inline-start:2px;margin-left:3px",
		"grid-area:1/1;color:red;grid-row-start:2",
		"grid-column:span 2/3;grid-column-start:1"
	];
	/** @type {((body: string) => string)[]} */
	const contexts = [
		(body) => `@media (width>=600px){.a{${body}}}`,
		(body) => `@supports (display:grid){.a{${body}}}`,
		(body) => `@container card (width>=400px){.a{${body}}}`,
		(body) => `@layer base{.a{${body}}}`,
		(body) => `@scope (.card){.a{${body}}}`,
		(body) => `@starting-style{.a{${body}}}`,
		(body) => `.p{.a{${body}}}`,
		(body) => `.p{&:hover{${body}}}`,
		(body) => `.p{@media (width>=600px){${body}}}`,
		(body) => `@keyframes k{0%{${body}}}`
	];

	it.each(bodies)("rewrites %s alike wherever it stands", (body) => {
		const top = minifyFor(`.a{${body}}`, modern);
		const block = top.slice(top.indexOf("{"));
		for (const wrap of contexts) {
			const once = minifyFor(wrap(body), modern);
			expect(once).toContain(block);
		}
	});
});

describe("CssSyntax minify — what a modern target makes dead", () => {
	const MODERN = ["chrome 140", "firefox 140", "safari 26.2"];

	it("takes out a `text-decoration` fallback and its `-webkit-` twin", () => {
		// Safari 15 reads a style only through the prefixed spelling.
		expect(
			minifyFor(
				fixture("css", "css-syntax-minify-what-a-modern-target-makes-dead-takes-out-a-text-decoration-2"),
				["safari 15"]
			)
		).toContain("-webkit-text-decoration:underline dotted");
	});

});

describe("CssSyntax minify — a later value no engine reads keeps the one before it", () => {
	const MODERN = ["chrome 140", "firefox 140", "safari 26.2"];
	const FALLBACK = "a{background-image:linear-gradient(red,blue);";

	/**
	 * @param {string} css input stylesheet
	 * @returns {string} what `dropOverriddenDeclarations` prints with no target
	 */
	const dropOverridden = (css) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			dropOverriddenDeclarations: true
		}).code;

	it.each([
		["a line after a stop", "linear-gradient(red,to right,blue)"],
		["two colors in one stop", "linear-gradient(red transparent,blue)"],
		["a keyword after a color", "linear-gradient(red to,blue)"],
		["a unit no engine reads", "linear-gradient(red 10px,blue 2foo)"],
		["a word naming no color", "linear-gradient(bogus,blue)"],
		["two keyword colors in one stop", "linear-gradient(transparent currentcolor,blue)"],
		["an empty argument", "linear-gradient(red,blue,)"],
		["no color stop", "linear-gradient(to right)"],
		["amounts with no color", "linear-gradient(10px,20px)"],
		["a single stop", "linear-gradient(to right,red)"]
	])("keeps the fallback behind %s", (_, later) => {
		const css = `${FALLBACK}background-image:${later}}`;
		expect(minifyFor(css, MODERN)).toContain("linear-gradient(red,blue)");
		expect(dropOverridden(css)).toContain("linear-gradient(red,blue)");
	});

	it.each([
		["an important twin after it", fixture("css", "css-syntax-minify-a-later-value-no-engine-reads-keeps-the-one-before-it-drops-a-2")],
		["an important twin saying the same", fixture("css", "css-syntax-minify-a-later-value-no-engine-reads-keeps-the-one-before-it-drops-a-4")],
		["an important twin before a plain one", fixture("css", "css-syntax-minify-a-later-value-no-engine-reads-keeps-the-one-before-it-drops-a-3")]
	])("drops a vendor spelling behind %s", (_, css) => {
		expect(minifyFor(css, MODERN)).not.toContain("-moz-transform");
	});
});

describe("SourceProcessor — processAsync over a data: url", () => {
	/**
	 * @param {string} sheet the stylesheet
	 * @param {(source: string) => Promise<string | undefined>} renderEmbeddedSource the renderer
	 * @returns {Promise<string>} the minified stylesheet
	 */
	const minify = async (sheet, renderEmbeddedSource) =>
		(
			await new SourceProcessor().processAsync(sheet, {
				mode: "minify",
				renderEmbeddedSource
			})
		).code;
	const quoted = fixture("css", "source-processor-render-embedded-source-over-a-data-url-offers-an-svg-payload");
	const bare = fixture("css", "source-processor-process-async-over-a-data-url-rebuilds-a-quoted-url-around-the");

	it("rebuilds a quoted url around the answer", async () => {
		expect(await minify(quoted, async (source) => source.replace("  ", " "))).toBe(
			".a{background:url(data:image/svg+xml,<svg>\\ <rect/></svg>)}"
		);
		expect(await minify(bare, async () => "<svg/>")).toBe(
			".a{background:url(data:image/svg+xml,<svg/>)}"
		);
	});

	it("prints a url as written where the answer is none or the same", async () => {
		const out = fixture("css", "source-processor-render-embedded-source-over-a-data-url-offers-an-svg-payload");
		expect(await minify(quoted, async () => undefined)).toBe(out);
		expect(await minify(quoted, async (source) => source)).toBe(out);
		expect(await minify(bare, async () => undefined)).toBe(
			".a{background:url(data:image/svg+xml,<svg>%20%20</svg>)}"
		);
	});

	it("offers nothing for a url of two strings, which is no url", async () => {
		// Read as one string, the payload would run on past the first quote, and
		// the url rebuilt around the answer would be one where none was written.
		const css = fixture("css", "source-processor-process-async-over-a-data-url-offers-nothing-for-a-url-of-two");
		/** @type {string[]} */
		const offered = [];
		const render = (/** @type {string} */ source) => {
			offered.push(source);
			return `${source}<!---->`;
		};
		expect(await minify(css, async (source) => render(source))).toBe(css);
		expect(
			new SourceProcessor().process(css, {
				mode: "minify",
				renderEmbeddedSource: render
			}).code
		).toBe(css);
		expect(offered).toEqual([]);
	});

	it("offers nothing for a url that is no data URL or holds a CSS escape", async () => {
		/** @type {string[]} */
		const offered = [];
		const out = await minify(
			fixture("css", "source-processor-process-async-over-a-data-url-offers-nothing-for-a-url-that-is"),
			async (source) => {
				offered.push(source);
				return source;
			}
		);
		expect(offered).toEqual([]);
		expect(out).toBe(
			'.a{background:url("data:image/svg+xml,<svg>\\\\</svg>");b:url(x.png)}.b{background:url(x.png)}'
		);
	});
});

describe("CssSyntax minify — preludes and calls at their edges", () => {
	/**
	 * @param {string} css input stylesheet
	 * @param {import("../../../lib/css/syntax-parser").CssProcessOptions=} options extra options
	 * @returns {string} its minified serialization
	 */
	const minify = (css, options) =>
		new SourceProcessor().process(css, { mode: "minify", ...options }).code;

	it("rebuilds a shouted `URL()` around what the renderer answers", async () => {
		const css = fixture("css", "css-syntax-minify-preludes-and-calls-at-their-edges-rebuilds-a-shouted-url");
		const out = ".a{background:url(data:image/svg+xml,<svg/>)}";
		expect(
			minify(css, { renderEmbeddedSource: () => "<svg/>" })
		).toBe(out);
		expect(
			(
				await new SourceProcessor().processAsync(css, {
					mode: "minify",
					renderEmbeddedSource: async () => "<svg/>"
				})
			).code
		).toBe(out);
	});

});

describe("CssSyntax — the identifier and url helpers", () => {
	it.each([
		["a control character", "a\tb", "a\\9 b"],
		["a control character before a digit", "\t1", "\\9 1"],
		["a backslash before a control character", "a\\\tb", "a\\\\\\9 b"],
		["a dash before a digit", "-1a", "\\-1a"],
		["two dashes", "--x", "\\--x"],
		["a dash before a letter", "-a", "-a"],
		["a leading digit", "1a", "\\31 a"],
		["a control character no whitespace", "a\u0001b", "a\\1 b"],
		["a delete", "a\u007Fz", "a\\7Fz"],
		["a lone dash", "-", "\\-"]
	])("escapes %s", (_, name, out) => {
		expect(escapeIdentifier(name)).toBe(out);
	});

	it.each([
		["an astral escape", "\\1F600.png", "\u{1F600}.png"],
		["a zero escape", "a\\0 b", "a\uFFFDb"],
		["a surrogate escape", "\\D800 x", "\uFFFDx"],
		["an escape past the last code point", "\\110000 y", "\uFFFDy"],
		["a hex escape", "\\61 b", "ab"],
		["a character escape", "a\\(b", "a(b"]
	])("reads %s in a url as the code point it names", (_, url, out) => {
		expect(normalizeUrl(url, false)).toBe(out);
	});

	it("normalizes a url the way it is resolved", () => {
		expect(normalizeUrl("im\\\ng.png", true)).toBe("img.png");
		expect(normalizeUrl("im\\\ng.png", false)).toBe("im\ng.png");
		expect(normalizeUrl("  a.png\t", false)).toBe("a.png");
		expect(normalizeUrl("", false)).toBe("");
		expect(normalizeUrl("data:,%41", false)).toBe("data:,%41");
		expect(normalizeUrl("dir/%41.png", false)).toBe("dir/A.png");
		expect(normalizeUrl("d%41.png", false)).toBe("dA.png");
		expect(normalizeUrl("%E0%A4%A.png", false)).toBe("%E0%A4%A.png");
	});
});

describe("CssSyntax — the node accessors a print reads", () => {
	const syntaxParser = require("../../../lib/css/syntax-parser");

	it("numbers a declaration's property with its aliases resolved", () => {
		/** @type {number[]} */
		const ids = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					// Asked twice: the second read is the one remembered.
					const id = syntaxParser._propertyIdOf(path.node);
					expect(syntaxParser._propertyIdOf(path.node)).toBe(id);
					ids.push(id);
				}
			})
			.process(fixture("css", "css-syntax-the-node-accessors-a-print-reads-numbers-a-declaration-s-property"));
		expect(ids.slice(1, 3)).toEqual([-1, -2]);
		expect(ids[0]).toBeGreaterThanOrEqual(0);
		expect(ids[3]).toBe(ids[4]);
	});

	it("reads an at-rule without a block as having no rules and no bracket", () => {
		/** @type {unknown[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.AtRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					seen.push(
						syntaxParser._rulesOf(path.node),
						syntaxParser._blockTokenOf(path.node)
					);
				}
			})
			.process(fixture("css", "css-syntax-the-node-accessors-a-print-reads-reads-an-at-rule-without-a-block-as"));
		expect(seen).toEqual([null, ""]);
	});

});

describe("CssSyntax — skipChildren() and stop() while printing", () => {
	/** @type {(i: number) => string} */
	const rule = (i) => `.c${i}>d${i}:hover{color:#ff0000;margin:${i + 1}px}`;
	const BIG = Array.from({ length: 1800 }, (_, i) => rule(i)).join("");

	it.each([
		["a rule", NodeType.QualifiedRule, fixture("css", "css-syntax-skip-children-and-stop-while-printing-prints-all-a-rule-holds-and")],
		["a declaration", NodeType.Declaration, fixture("css", "css-syntax-skip-children-and-stop-while-printing-prints-all-a-declaration-holds")],
		["a function", NodeType.Function, fixture("css", "css-syntax-skip-children-and-stop-while-printing-prints-all-a-function-holds-and")],
		["a block", NodeType.SimpleBlock, fixture("css", "css-syntax-skip-children-and-stop-while-printing-prints-all-a-block-holds-and")],
		["an at-rule", NodeType.AtRule, fixture("css", "css-syntax-skip-children-and-stop-while-printing-prints-all-an-at-rule-holds-and")],
		["a streamed at-rule", NodeType.AtRule, `@media screen{${BIG}}`]
	])("prints all %s holds, and fires no visitor below it", (_, type, css) => {
		/** @type {string[]} */
		const log = [];
		const processor = new SourceProcessor().use({
			[type]: {
				enter: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					log.push("enter");
					path.skipChildren();
				},
				exit: () => log.push("exit")
			},
			[NodeType.Ident]: () => log.push("ident"),
			[NodeType.Hash]: () => log.push("hash"),
			[NodeType.Comment]: () => log.push("comment")
		});
		const printed = processor.process(css, { mode: "minify" }).code;
		expect(printed).toBe(
			new SourceProcessor().process(css, { mode: "minify" }).code
		);
		const printLog = log.splice(0);
		processor.process(css);
		// The print fires what the walk fires, and the visitors held back are
		// back for the next run.
		expect(printLog).toEqual(log);
		expect(log).toContain("exit");
		log.length = 0;
		processor.process(css, { mode: "minify" });
		expect(log).toEqual(printLog);
	});

	it("prints the whole stylesheet after stop()", () => {
		/** @type {string[]} */
		const log = [];
		const css = `a{b:1}${BIG}c{d:2}`;
		const processor = new SourceProcessor().use({
			[NodeType.Declaration]: (
				/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
			) => {
				log.push(path.name());
				path.stop();
			}
		});
		expect(processor.process(css, { mode: "minify" }).code).toBe(
			new SourceProcessor().process(css, { mode: "minify" }).code
		);
		expect(log).toEqual(["b"]);
		log.length = 0;
		processor.process(css);
		expect(log).toEqual(["b"]);
	});

	it("reads past the comments after a comment's visitor stops, printing or not", () => {
		const css = fixture("css", "css-syntax-skip-children-and-stop-while-printing-reads-past-the-comments-after-a");
		let fired = 0;
		const processor = new SourceProcessor().use({
			[NodeType.Comment]: (
				/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
			) => {
				fired++;
				path.stop();
			}
		});
		expect(processor.process(css, { mode: "minify" }).code).toBe("x{y:1}z{w:2}");
		processor.process(css);
		expect(fired).toBe(2);
	});

	it("ends a walk stopped inside a streamed rule once it closes", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					log.push(path.name());
					if (log.length === 3) path.stop();
				}
			})
			.process(`@media screen{${BIG}}a{z:1}`);
		expect(log).toEqual(["color", "margin", "color"]);
	});

	it("puts back the visitors a skip held when the print throws", () => {
		// A comment predicate runs as a streamed block is read, under the skip.
		/** @type {number[]} */
		const seen = [];
		const processor = new SourceProcessor().use({
			[NodeType.AtRule]: (
				/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
			) => path.skipChildren(),
			[NodeType.Declaration]: () => seen.push(1)
		});
		const big = Array.from({ length: 4000 }, (_, i) => rule(i)).join("");
		expect(() =>
			processor.process(`@media print{${big}/*x*/}`, {
				mode: "minify",
				transforms: {
					comments: (text) => {
						if (text.includes("x")) throw new Error("comment");
						return false;
					}
				}
			})
		).toThrow("comment");
		processor.process(fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is"));
		expect(seen).toEqual([1]);
	});

	it("passes on an error a visitor throws", () => {
		expect(() =>
			new SourceProcessor()
				.use({
					[NodeType.Declaration]: () => {
						throw new Error("visitor");
					}
				})
				.process(fixture("css", "css-syntax-nesting-and-error-recovery-rethrows-what-else-fails-a-parse-as-it-is"), { mode: "minify" })
		).toThrow("visitor");
	});
});

describe("CssSyntax — the options a print reads", () => {
	const syntaxParser = require("../../../lib/css/syntax-parser");

	it("picks the rewrite switches out of a minimizer's options", () => {
		expect(
			syntaxParser.pickTransforms(
				/** @type {import("../../../lib/css/syntax-parser").CssTransformOptions} */ ({
					foldCase: false,
					shortenNumbers: true,
					convertLengthUnits: true
				})
			)
		).toEqual({ foldCase: false, shortenNumbers: true });
		expect(syntaxParser.pickTransforms({})).toBeUndefined();
	});

	it("reads a prelude skip on a walk, and ignores it on a print", () => {
		/** @type {number[]} */
		const seen = [];
		const processor = new SourceProcessor().use({
			[NodeType.Ident]: () => seen.push(1)
		});
		const skip = { selectorPrelude: true, atRulePrelude: true };
		processor.process(fixture("css", "css-syntax-the-options-a-print-reads-reads-a-prelude-skip-on-a-walk-and-ignores"), { skip });
		expect(seen).toHaveLength(1);
		expect(processor.process(fixture("css", "css-syntax-the-options-a-print-reads-reads-a-prelude-skip-on-a-walk-and-ignores-2"), { mode: "minify", skip }).code).toBe(
			"a b{c:d}"
		);
	});

});

describe("CssSyntax — a value too long for the buffers a parse keeps", () => {
	it("prints it, and the next stylesheet after it", () => {
		const value = "x ".repeat(40000).trim();
		expect(minifyFor(`a{b:${value}}`)).toBe(`a{b:${value}}`);
	});
});

describe("CssSyntax minify — a call or a sub-rule named with an escape", () => {

	it("fires a comment visitor's exit", () => {
		/** @type {number[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.Comment]: {
					exit: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.push(path.type());
					}
				}
			})
			.process(fixture("css", "css-syntax-minify-a-call-or-a-sub-rule-named-with-an-escape-fires-a-comment"));
		expect(seen).toEqual([NodeType.Comment]);
	});

	it("keeps the space a hex escape needs after an escaped backslash", () => {
		expect(escapeIdentifier("\\\t")).toBe("\\\\\\9");
		expect(escapeIdentifier("\\\ta")).toBe("\\\\\\9 a");
	});
});

describe("CssSyntax minify — nesting lowered in a block too big to collect", () => {
	// Past `_STREAM_MIN_NODES` a block streams, its text going out before it
	// closes — where lowering writes its rules, once their parent is done.
	const TARGET = ["chrome 100"];
	const rules = Array.from(
		{ length: 4000 },
		(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
	);

	it("writes every rule against its parent", () => {
		const out = minifyFor(`.p{color:blue;${rules.join("")}}`, TARGET);
		expect(out).toBe(`.p{color:blue}${rules.map((rule) => `.p ${rule}`).join("")}`);
	});

	it("keeps the rules beside a long at-rule", () => {
		const prelude = Array.from({ length: 9000 }, (_, i) => `x${i}`).join(" ");
		expect(minifyFor(`.p{.a{x:1}@st ${prelude};.b{y:1}}`, TARGET)).toBe(
			`.p{@st ${prelude}}.p .a{x:1}.p .b{y:1}`
		);
	});

	it("keeps a rule the repeats of another follow", () => {
		expect(
			minifyFor(`.p{.a{x:1}.b{y:1}${".z{w:1}".repeat(4000)}}`, TARGET)
		).toBe(".p .a{x:1}.p .b{y:1}.p .z{w:1}");
	});
});

describe("CssSyntax minify — input around a block big enough to stream", () => {
	const BIG = Array.from(
		{ length: 1700 },
		(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
	).join("");
	const hash = (/** @type {string} */ text) =>
		require("crypto").createHash("sha1").update(text).digest("hex").slice(0, 16);

	// The whole output is pinned by its length, its digest and how it opens.
	it.each([
		["@supports (a:b){.p{@media print{display:-webkit-flex;display:flex}}${BIG}}", {"environment":{"browsers":["ie 9"]}}, 59640, "5fbd37571ad2871b", "@supports (a:b){.p{@media print{display:-ms-flexbox;display:"],
		["@layer x{@media print{@LAYER X{A{COLOR:C\\OLOR-MIX(IN SRGB,#123,RED)}}${BIG}a{b:c;b\\:c}}}", {"environment":{"browsers":["chrome 100"]}}, 59668, "de61e70d773e560c", "@layer x{@media print{@layer X{A{color:#88111a;color:color-m"],
		[".p{@supports (display:grid){@laye x{@layer x{}@layer x{@layer x,{}@laye x{@layer x{}@layer x{@layer x,{}}@media print{@media (width>=1px){:--h{b:c}}@custom-selector( :--h1}@media print{@media (width>=1px){:--h{b:c}}@custom-selector :--h1}${BIG}}", {"environment":{"browsers":["safari 15"]},"transforms":{"reduceFunctions":false},"convertApproximateColors":true}, 59802, "f700edac3df38205", ".p{@supports (display:grid){@laye x{@layer x{@layer x,{}@lay"],
		[".p{.a{x:1}@st(arting-style{y:2}.a{x:1}@starting-style{y:2}${BIG}}", {"environment":{"browsers":["chrome 100"]},"convertLengthUnits":true}, 59638, "716f750a890312f9", ".p{@st (arting-style{y:2}.a{x:1}@starting-style{y:2}.c0>d0{c"],
		["@layer x{@media print{@scope (.x){A{border-radius:1px;BORDER-RAD;iu(s:1px}}${BIG}}}", {"environment":{"browsers":["firefox 120"]},"transforms":{"removeDeadRules":false,"lowerUnsupported":false,"customMedia":true,"customSelectors":true},"rewriteCustomProperties":true}, 59654, "9236b96792fcc74d", "@layer x{@media print{@scope(.x){A{border-radius:1px;BORDER-"],
		["@layer x{b c{}${BIG}}", {}, 59583, "c2202a5dc1ee4bdc", "@layer x{.c0>d0{color:red;margin:1px}.c1>d1{color:red;margin"],
		[".p{)}}${BIG}@layer x{a{b:c}}d{e:f}@layer x{g{h:i}}}", {"environment":{"browsers":["chrome 60"]}}, 59607, "e387786e2ee3d1c9", ".p{)}}.c0>d0{color:red;margin:1px}.c1>d1{color:red;margin:2p"],
		[".p{a${BIG}}", {"environment":{"browsers":["safari 9"]}}, 59578, "1c7f659b996f096b", ".p{a.c0>d0{color:red;margin:1px}.c1>d1{color:red;margin:2px}"],
		["@media print{a{color:light-dark(color(display-p3 1 0 0),blue)}${BIG}}", {"environment":{"browsers":["firefox 40"]},"convertApproximateColors":true}, 59616, "6660d7cfebbb10af", "@media print{a{color:light-dark(red,blue)}.c0>d0{color:red;m"],
		[".q .r{${BIG}@supports ((displa}", {}, 59599, "42bdd3e044d317c6", ".q .r{.c0>d0{color:red;margin:1px}.c1>d1{color:red;margin:2p"],
		[".p{${BIG}.a{--x:1px (/*!k*}", {"environment":{"browsers":["safari 15"]}}, 64694, "d0372360dd4c3f18", ".p .c0>d0{color:red;margin:1px}.p .c1>d1{color:red;margin:2p"],
		["@layer x{A{border-radius:1px;BORDER-RAD;A{-webkit-border-radius:1px;BORDER-RAD;${BIG}a{b:c}a{border-radius:1pxa{b:c}}", {"environment":{"browsers":["safari 17"]}}, 66490, "c81f51de8c22ae4b", "@layer x{A{border-radius:1px;BORDER-RAD}A A{-webkit-border-r"],
		["@scope (.x){a{b:c}a{mara${BIG}}", {}, 59596, "3563243b1b3ccadb", "@scope(.x){a{b:c;mara.c0>d0{color:red;margin:1px}.c1>d1{colo"],
		["@layer x{a{b:c}op:auto;left:auto}op:auto;right:0;bottom:0;left:auto}op:auto;left:auto}op:auto;right:0;bottom:0;left:auto}a{b(:1}a{b:c}${BIG}a{color:light-dark(color(display-p3 1 0 0),blue)}}", {"environment":{"browsers":["chrome 40"]}}, 59759, "3185c126c5f98d93", "@layer x{a{b:c}op:auto;left:auto}op:auto;right:0;bottom:0;le"],
		["@media print{.p{a{b:c}@scope (.x){ {\ny/**/;\n}}a{b:c}${BIG}}}", {}, 59616, "d7c506afba0fc51b", "@media print{.p{@scope(.x){{y/**/}}a{b:c}.c0>d0{color:red;ma"],
		[".p{a{top:calc(1px + 1%);right:anchor(top);bottom:calc(1px + 1%);left:anchor(top)}${BIG}@media print{a{co}lor:color-mix(in srgb,#123,red)}a{co}lor:color-mix(in srgb,#123,blue)}}}", {"environment":{"browsers":["safari 15"]},"convertLengthUnits":true}, 59496, "26149d6072c50870", ".p{a{inset:calc(1px + 1%)anchor(top)}.c0>d0{color:red;margin"],
		[".p{@laye x{@layer x{}@layer x{@layer( x{}${BIG}{y/**/ z}}", {"environment":{"browsers":["opera 12"]}}, 59614, "dc0fe17fac5dcff0", ".p{@laye x{@layer x{@layer (x{}.c0>d0{color:red;margin:1px}."],
		["@layer x{a{b:c}a{b:c};a,b{c:1};b,b{c:1}a{b(:1}a{b:c}a{b:c}${BIG}a{top:calc(1px + 1%);right:anchor(top);bottom:calc(1px + 1%);left:anchor(top)}}", {"environment":{"browsers":["chrome 120"]}}, 59703, "d654154b94e244d7", "@layer x{a{b:c}a,b{c:1}b{c:1}a{b(:1}a{b:c}a{b:c}.c0>d0{color"],
		["@media print{.p{.a{x:}@st(arting-style{y:2}.a{x:1}@starting-style{y:2}}${BIG}}}", {"environment":{"browsers":["android 4.4"]}}, 59644, "c2f1c90198563afa", "@media print{.p{@st (arting-style{y:2}.a{x:1}@starting-style"]
	])("prints %j (%j)", (css, options, length, digest, head) => {
		const out = new SourceProcessor().process(css.replace("${BIG}", BIG), {
			...options,
			mode: "minify"
		}).code;
		expect(out.slice(0, 60)).toBe(head);
		expect(out).toHaveLength(length);
		expect(hash(out)).toBe(digest);
	});
});

describe("CssData — the names the printer's shape tables hold", () => {
	const data = require("../../../lib/css/data");

	it("open on two ASCII letters and are shorter than 31", () => {
		// The tables give each name the bit of its length under its first two
		// letters; a name past either would have neither.
		const names = [
			...data.getPrefixedProperties().keys(),
			...data.getPrefixedValues().keys(),
			...data.MERGE_LONGHANDS,
			"grid-row",
			"grid-column",
			"grid-template-rows",
			"grid-template-columns",
			"grid-template-areas"
		];
		for (const name of names) {
			expect(name).toMatch(/^[a-z]{2}/i);
			expect(name.length).toBeLessThan(31);
		}
	});

	it("give a function with an arity but `calc()` a fold", () => {
		for (const name of data.MATH_FUNCTION_ARITY.keys()) {
			if (name !== "calc") expect(data.MATH_FUNCTION_FOLD.has(name)).toBe(true);
		}
	});

});

describe("CssSyntax minify — blocks that stream inside another", () => {
	// Twice `_STREAM_MIN_NODES` and more, so each of these blocks streams.
	const BIG = Array.from(
		{ length: 4000 },
		(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
	).join("");
	const LONG = "x ".repeat(30000).trim();
	const hash = (/** @type {string} */ text) =>
		require("crypto").createHash("sha1").update(text).digest("hex").slice(0, 16);

	it.each([
		["@property --x{.q{${BIG}}}", {}, 144692, "59fd06d25e6daede"],
		["@function --f(){.q{${BIG}}}", {}, 144694, "b092683738b6867d"],
		["@font-feature-values F{.q{${BIG}}}", {}, 144701, "b94b5b8f205172a0"],
		["@media a{${BIG}}.r{${BIG}}", {}, 289360, "a66a99334bfa2299"],
		[".p{${BIG}.z{v:${LONG}}}", {}, 204682, "279e8109a89e4c9f"],
		[".p{${BIG}::-moz-placeholder{x:1}::-moz-selection{y:1}::placeholder{x:1}}", {"environment":{"browsers":["firefox 120"]}}, 144716, "1d2ce264fd88ffa4"],
		["@supports (a:b){@scope (.x){@layer l{}{}@scope (.x){@layer l{}{}${BIG}}", {"environment":{"browsers":["ie 9"]},"convertApproximateColors":true}, 144734, "8f15725eab59edf7"],
		["@supports (a:b){B,;A,B{C:}B,;B{C:1}B,;A,B{C:}B,;B{C:1}${BIG}}", {"environment":{"browsers":["opera 12"]},"mergeDistantRules":true}, 144705, "63b109aff6a8fd11"],
		["@layer x{@media print{${BIG}@layer x{.p{a{b:c}@layer l{}a{b:c}}}}}", {"environment":{"browsers":["safari 9"]},"transforms":{"removeDeadRules":false,"mergeLonghands":false,"foldCase":false,"customMedia":true,"customSelectors":true}}, 144727, "1651fef08b467925"],
		[fixture("css", "css-syntax-minify-input-left-open-invalid-or-unusual-printed-as-it-reads-prints-17"), {}, 10, "cec3bc4c3560c48d"],
		[fixture("css", "css-syntax-minify-input-left-open-invalid-or-unusual-printed-as-it-reads-prints-14"), {}, 10, "fe97e5e6b3af70a5"],
		[fixture("css", "css-syntax-minify-input-left-open-invalid-or-unusual-printed-as-it-reads-prints-7"), {}, 18, "410115e642a326b2"],
		["@media print{a{b:1}a{b${BIG}.a{--x:1px (/*!k*}", {}, 144713, "0f3f5b4bfa41cc69"],
		["@layer x{${BIG}a{b:c}a{a{b:{ba{b:{b}", {}, 144701, "c39937110f690f2b"],
		["@layer x{.p{@-webkit-keyframes k{}}${BIG}b,;a,b{c:1}b,;b{c:1}}", {"environment":{"browsers":["chrome 140","firefox 140","safari 26.2"]},"transforms":{"customSelectors":false,"rewriteEscapes":false,"mergeRules":false}}, 144729, "e8f008f21cc73857"],
		[fixture("css", "css-syntax-minify-input-left-open-invalid-or-unusual-printed-as-it-reads-prints-17"), {}, 10, "cec3bc4c3560c48d"],
		[fixture("css", "css-syntax-minify-input-left-open-invalid-or-unusual-printed-as-it-reads-prints-14"), {}, 10, "fe97e5e6b3af70a5"],
		[fixture("css", "css-syntax-minify-blocks-that-stream-inside-another-prints-a-b-c-a-b-x-a-b-c-a"), {"environment":{"browsers":["ie 9"]}}, 59, "47db0ac01e688f67"],
		[fixture("css", "css-syntax-minify-blocks-that-stream-inside-another-prints-p-supports"), {}, 16, "f2c987b3c1b993f3"],
		[fixture("css", "css-syntax-minify-input-left-open-invalid-or-unusual-printed-as-it-reads-prints"), {}, 17, "0cc191ab72c9ab47"],
		[fixture("css", "css-syntax-minify-input-left-open-invalid-or-unusual-printed-as-it-reads-prints-47"), {}, 8, "65fb9901efa5b933"],
		[fixture("css", "css-syntax-minify-blocks-that-stream-inside-another-prints-a-x-1-b-x-1-a-border"), {"environment":{"browsers":["chrome 40"]}}, 185, "dfc2b87db7d23c9b"]
	])("prints %j (%j)", (css, options, length, digest) => {
		const out = new SourceProcessor().process(
			css.split("${BIG}").join(BIG).replace("${LONG}", LONG),
			{ ...options, mode: "minify" }
		).code;
		expect(out).toHaveLength(length);
		expect(hash(out)).toBe(digest);
	});
});

describe("CssSyntax minify — a declaration list holding a block too big to collect", () => {
	it("composes the list whole, the big rule in its place", () => {
		const rules = Array.from(
			{ length: 4000 },
			(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
		).join("");
		// Streamed, the rule went out before the declarations, and the ids they
		// were held by were handed to it.
		const css = `a:b;.x{${rules}}c:d`;
		expect(
			new SourceProcessor().process(css, {
				mode: "minify",
				as: "block-contents"
			}).code
		).toBe(css);
	});
});

describe("CssSyntax minify — what a printed rule can still hit", () => {
	// Each reaches one guard of the printer the rest of the suite leaves alone.
	const BIG = Array.from(
		{ length: 4000 },
		(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
	).join("");
	it.each([
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-custom-media-x-false"),{"transforms":{"customMedia":true,"customSelectors":true},"environment":{"browsers":["chrome 120"]}},"@media not all{a{b:c}}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-is-a-b-before-x-y"),{},"a b:::before{x:y}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-is-a-b-x-y-2"),{},"a b:{x:y}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-before-x-y"),{},":::before{x:y}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-x-y"),{},":{x:y}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-is-a-b-x-y"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-is-a-b-x-y")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-media-width-1px-and"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-media-width-1px-and")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-media-width-1px-and-2"),{},"@media (1px<width<2px){a{b:c}}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-supports-webkit-bogus"),{"environment":{"browsers":["chrome 130"]}},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-supports-webkit-bogus")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-supports-a-b-n-x-y-z"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-supports-a-b-n-x-y-z")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-layer-x-a-b-c-layer-x"),{},"@layer x{a{b:c}d{e:f}}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-keyframes-k-100-a-b"),{},"@keyframes k{to{a:b}}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-margin-top-1px-2"),{},"a{margin:1px;padding:1px}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-moz-placeholder-b"),{"environment":{"browsers":["firefox 120"]}},".a::placeholder{color:red}.b::placeholder{color:#00f}.c::placeholder{color:#0f0}.d::placeholder{color:#ff0}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-margin-1px-margin"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-margin-1px-margin")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-text-decoration"),{"environment":{"browsers":["safari 12"]}},"a{text-decoration:underline;text-decoration-style:solid;text-decoration-color:red;text-decoration-thickness:1px}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-margin-top-1px-3"),{},"a{margin:1px!important}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-grid-template-rows"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-grid-template-rows")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-grid-column-1-color"),{},"a{color:red;grid-area:2/1}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-grid-row-grid"),{},"a{grid-column:1}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-x-1-2-as-block"),{"as":"block-contents"},"--x:(1,2"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-grid-area"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-grid-area")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-place-content-1px"),{"environment":{"browsers":["chrome 40"]}},"a{align-content:1px;justify-content:1px;justify-content:2px}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-transition-a-1s"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-transition-a-1s")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-text-decoration-2"),{},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-text-decoration-2")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-margin-top-1px"),{},"a{grid-area:1/2;margin:1px}"],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-display-webkit-box"),{"environment":{"browsers":["chrome 130"]}},fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-two-keyword-display-8")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-display-flex"),{"environment":{"browsers":["chrome 130"]}},fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-display-flex")],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-a-color-color-display"),{"environment":{"browsers":["chrome 60"]}},"a{color:red;color:color(display-p3 1 0 0);background:#0f0;background:color(display-p3 0 1 0)}"],
		[".p{${BIG}b{x:1}a{x:1}c:d}",{},".p{${BIG}a,b{x:1}c:d}"],
		[".p{${BIG}@layer x{{}}x{}@layer x{d{e:f}}}",{"environment":{"browsers":["chrome 80"]}},".p{${BIG}@layer x{d{e:f}}}"],
		["@-webkit-keyframes a{}.p{${BIG}::-webkit-input-placeholder{x:1}::placeholder{x:1}}",{"environment":{"browsers":["chrome 130"]}},"@-webkit-keyframes a{}.p{${BIG}::placeholder{x:1}}"],
		["@layer x{${BIG}}@layer x{a{b:c}}",{},"@layer x{${BIG}a{b:c}}"]
	])("prints %j (%j)", (css, options, out) => {
		expect(
			new SourceProcessor()
				.process(css.split("${BIG}").join(BIG), {
					.../** @type {EXPECTED_ANY} */ (options),
					mode: "minify"
				})
				.code.split(BIG)
				.join("${BIG}")
		).toBe(out);
	});
});

describe("CssSyntax minify — a gather that once printed a second pass's work", () => {
	const BIG = Array.from(
		{ length: 4000 },
		(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
	).join("");
	/**
	 * @param {string} css a stylesheet
	 * @returns {string} its minified serialization
	 */
	const once = (css) =>
		new SourceProcessor().process(css, { mode: "minify" }).code;

	it.each([
		// The pair a streamed block's gather joined at the seam is one list,
		// ordered and with a selector both named written once.
		[".p{${BIG}@layer x{a,c{x:1}}@layer x{a,b{x:1}}}", ".p{${BIG}@layer x{a,b,c{x:1}}}"],
		[".p{${BIG}@layer x{c{x:1}}@layer x{b{x:1}}@layer x{a{x:1}}}", ".p{${BIG}@layer x{a,b,c{x:1}}}"],
		// An empty block folded in adds nothing, so the next block still joins.
		[fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-layer-x"), fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-layer-x-2")],
		[fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-layer-x-3"), fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-layer-x-2")],
		[fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-q-layer"), fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-q-layer-2")],
		[fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-q-layer-3"), fixture("css", "css-syntax-minify-a-gather-that-once-printed-a-second-pass-s-work-prints-q-layer-2")]
	])("prints %j in one pass", (css, out) => {
		const printed = once(css.split("${BIG}").join(BIG));
		expect(printed.split(BIG).join("${BIG}")).toBe(out);
		expect(once(printed)).toBe(printed);
	});
});

describe("CssSyntax minify — one processor after another", () => {
	const BIG = Array.from(
		{ length: 4000 },
		(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
	).join("");
	/** @type {[string, object][]} */
	const runs = [
		[fixture("css", "css-syntax-minify-one-processor-after-another-prints-each-sheet-as-it-prints"), { environment: { browsers: ["chrome 100"] } }],
		[fixture("css", "css-syntax-minify-one-processor-after-another-prints-each-sheet-as-it-prints-2"), {}],
		[fixture("css", "css-syntax-minify-one-processor-after-another-prints-each-sheet-as-it-prints-3"), { mergeDistantRules: true }],
		[`@layer x{${BIG}c{x:1}}@layer x{b{x:1}}`, {}],
		[`.p{${BIG}@layer x{a,c{x:1}}@layer x{a,b{x:1}}}`, {}],
		[fixture("css", "source-processor-merge-distant-rules-gives-an-earlier-rule-the-selectors-of-a"), { mergeDistantRules: true }],
		[fixture("css", "css-syntax-minify-one-processor-after-another-prints-each-sheet-as-it-prints-4"), { environment: { browsers: ["chrome 100"] } }],
		[fixture("css", "css-syntax-minify-one-processor-after-another-prints-each-sheet-as-it-prints-5"), { environment: { browsers: ["chrome 130"] } }],
		[fixture("css", "css-syntax-minify-what-a-printed-rule-can-still-hit-prints-x-1-2-as-block"), { as: "block-contents" }]
	];
	/**
	 * @param {[string, object]} run a stylesheet and its options
	 * @returns {string} its minified serialization
	 */
	const print = ([css, options]) =>
		new SourceProcessor().process(css, { ...options, mode: "minify" }).code;

	it("prints each sheet as it prints alone, whatever ran before it", () => {
		const alone = runs.map(print);
		// Forwards, backwards, and each after every other: a leftover of one parse
		// would show as a difference in the next.
		expect(runs.map(print)).toEqual(alone);
		expect([...runs].reverse().map(print)).toEqual([...alone].reverse());
		for (let i = 0; i < runs.length; i++) {
			for (let j = 0; j < runs.length; j++) {
				print(runs[j]);
				expect(print(runs[i])).toBe(alone[i]);
			}
		}
	});
});

describe("CssSyntax — declaration ranks", () => {
	it("ranks the property every ranked alias stands for", () => {
		// The printer's order table reads a ranked alias's property by id.
		const { getDeclarationRanks, getPropertyAliases } = require("../../../lib/css/data");
		const ranks = getDeclarationRanks();
		const aliases = getPropertyAliases();
		expect(
			[...ranks.keys()].filter((name) => !ranks.has(aliases.get(name) || name))
		).toEqual([]);
	});
});

// The printer is what writes an edit out, so its own tests read every path
// an edit takes through it, as the parser tests read the walk that makes it.
describe("CssSyntax — printing what a visitor replaced or removed", () => {
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

	it("prints a replaced node holding a replaced one as its own replacement", () => {
		/** @type {import("../../../lib/css/syntax-parser").CssVisitorMap} */
		const visitors = {
			[NodeType.Hash]: (path) => path.replace("blue"),
			[NodeType.Declaration]: (path) => {
				if (path.name() === "color") path.replace("fill:red");
			}
		};
		expect(print(fixture("css", "css-syntax-printing-what-a-visitor-replaced-or-removed-prints-a-replaced-node"), visitors)).toBe(
			"a{fill:red;top:0}b{x:blue}"
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


describe("CssSyntax minify — output that reads back as its source", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("keeps the space between a math function's `/` and `*`", () => {
		expect(min(fixture("css", "css-syntax-minify-math-keeps-the-space-between-a-slash-and-a-star"))).toBe("a{width:calc(10px/ *2)}b{c:d}");
		expect(min(fixture("css", "css-syntax-minify-math-keeps-the-space-between-a-slash-and-a-star-2"))).toBe("@media (width:calc(10px/ *2)){a{b:c}}");
	});

	it("keeps the newline that ends a bad string in a custom property", () => {
		expect(min(fixture("css", "css-syntax-minify-custom-property-keeps-the-newline-that-ends-a-bad-string"))).toBe('a{--x:"abc\n;color:red}b{c:d}');
		expect(min(fixture("css", "css-syntax-minify-custom-property-keeps-the-newline-that-ends-a-bad-string-2"))).toBe('a{--x:f("abc\n y);color:red}b{c:d}');
		expect(min(fixture("css", "css-syntax-minify-custom-property-keeps-the-newline-that-ends-a-bad-string-3"))).toBe(
			'@property --x{syntax:"*";inherits:false;initial-value:"a\n;color:red}b{c:d}'
		);
	});

	it("keeps the space after an escaped comma or combinator", () => {
		expect(min(fixture("css", "css-syntax-minify-selector-keeps-the-space-after-an-escaped-comma"))).toBe(".a\\, .b{c:d}");
		expect(min(fixture("css", "css-syntax-minify-selector-keeps-the-space-after-an-escaped-comma-2"))).toBe(".a\\> .b{c:d}");
		expect(min(fixture("css", "css-syntax-minify-selector-keeps-the-space-after-an-escaped-comma-3"))).toBe("a{b:c\\, d}");
		// An escaped backslash escapes nothing after it.
		expect(min(fixture("css", "css-syntax-minify-selector-keeps-the-space-after-an-escaped-comma-4"))).toBe(".a\\\\,.b{c:d}");
	});

	it("keeps a `grid-template-areas` row ending on an escaped space", () => {
		expect(min(fixture("css", "css-syntax-minify-grid-template-areas-keeps-an-escaped-trailing-space"))).toBe('a{grid-template-areas:"a b\\ "}c{d:e}');
	});

	it("reads an escaped `{` in a layer name as part of the name", () => {
		expect(min(fixture("css", "css-syntax-minify-layer-reads-an-escaped-brace-as-part-of-the-name"))).toBe("@layer a\\{b{x{c:d}}@layer a\\{b.c{y{e:f}}");
		expect(min(fixture("css", "css-syntax-minify-layer-reads-an-escaped-brace-as-part-of-the-name-2"))).toBe("@layer a\\{b{x{c:d}y{e:f}}");
	});

	it("does not sort a selector starting with `@` to the front of a list", () => {
		expect(min(fixture("css", "css-syntax-minify-selector-list-keeps-a-part-starting-with-an-at-sign-in-place"))).toBe("b,@media screen{a{color:red}}");
		expect(min(fixture("css", "css-syntax-minify-selector-list-keeps-a-part-starting-with-an-at-sign-in-place-2"))).toBe('z,@import "x";a{b:c}');
	});

	it("keeps `@charset` for a non-ASCII answer an asynchronous renderer gives", async () => {
		const cssMinify = require("../../../lib/css/cssMinify");

		const svg = await cssMinify({ "a.css": fixture("css", "css-minify-export-declares-utf-8-for-a-non-ascii-svg-it-minifies") }, undefined, { svg: true });
		expect(svg.code).toBe('@charset "UTF-8";a{background:url(data:image/svg+xml,<svg>é</svg>)}');
		const source = fixture("css", "css-minify-export-declares-utf-8-for-a-non-ascii-svg-it-minifies-2");
		const answered = await cssMinify({ "a.css": source }, undefined, {
			renderEmbeddedSource: async () => "<svg>é</svg>"
		});
		expect(answered.code).toBe('@charset "UTF-8";a{background:url(data:image/svg+xml,<svg>é</svg>)}');
		// An ASCII answer still needs none.
		const ascii = await cssMinify({ "a.css": source }, undefined, {
			renderEmbeddedSource: async () => "<svg>y</svg>"
		});
		expect(ascii.code).toBe("a{background:url(data:image/svg+xml,<svg>y</svg>)}");
	});

	it("closes a custom property the input ran out in where a banner follows", async () => {
		const cssMinify = require("../../../lib/css/cssMinify");

		/**
		 * @param {string} name the fixture
		 * @returns {Promise<string>} the output, the banner the plugin appends included
		 */
		const withBanner = async (name) => {
			const result = await cssMinify({ "a.css": fixture("css", name) }, undefined, {}, true);
			expect(result.extractedComments).toEqual(["/*! keep */"]);
			return `${result.code}/*! banner */`;
		};
		expect(await withBanner("css-minify-export-closes-a-custom-property-the-input-ran-out-in-before-a-banner")).toBe('.b{--x:"foo"}/*! banner */');
		expect(await withBanner("css-minify-export-closes-a-custom-property-the-input-ran-out-in-before-a-banner-2")).toBe(".b{--x:{foo}}/*! banner */");
		// With no banner to follow, it stays open as the engine keeps it.
		expect(min(fixture("css", "css-minify-export-closes-a-custom-property-the-input-ran-out-in-before-a-banner"))).toBe('/*! keep */.b{--x:"foo');
	});
});
