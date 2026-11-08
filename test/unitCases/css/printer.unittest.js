"use strict";

const { fixture } = require("../../helpers/fixture");

// Each fixture's print under its option sets is in `invariants.unittest.js`'s
// snapshot; these hold visitors, renderers, maps, `cssMinify` and huge inputs.

const fs = require("fs");
const path = require("path");
const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	buildSkipSet,
	Field,
	NodeType,
	escapeIdentifier,
	normalizeUrl,
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
});

describe("CssSyntax — minify value-safety edge cases", () => {
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

describe("CssSyntax — the per-transform switches", () => {
	/**
	 * @param {string} src css source
	 * @param {import("../../../lib/css/syntax-parser").CssTransformOptions=} transforms which rewrites to make
	 * @returns {string} the minified serialization
	 */
	const min = (src, transforms) =>
		new SourceProcessor().process(src, { mode: "minify", transforms }).code;

	// One option says which comments survive, in the forms terser's
	// `format.comments` takes; the snapshot holds those JSON can spell.
	describe("comments", () => {
		const css =
			fixture("css", "css-syntax-the-per-transform-switches-comments-absent-keeps-the-banners");

		it.each([
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
			[/** @type {(comment: string) => boolean} */ (() => false), false]
		])("source-map pragma with comments: %s", (comments, kept) => {
			const out = min(fixture("css", "css-syntax-the-per-transform-switches-comments-source-map-pragma-with-comments"), { comments });
			expect(out.includes("/*# sourceMappingURL=x.map */")).toBe(kept);
		});
	});
});

describe("CssSyntax — print modes", () => {
	it("prints nothing unless output is asked for", () => {
		expect(new SourceProcessor().process(fixture("css", "css-syntax-print-modes-prints-nothing-unless-output-is-asked-for"))).toBeUndefined();
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

	// Each case below is one a real stylesheet of the comparison corpus wrote,
	// and each is held to its own output as well: a second minify adds nothing.
	describe("what a wider corpus found", () => {
		it("shortens a number the same once the searches it keeps fill up", () => {
			const widths = Array.from(
				{ length: 5000 },
				(_, i) => `.a${i}{width:${(i + 1) / 7}em}`
			).join("");
			const once = minify(widths);
			expect(once).toContain(".a4999{width:714.2857143em}");
			expect(minify(widths)).toBe(once);
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
});

describe("CssSyntax minify — `declareCharset`", () => {
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

	it("minifies through the public entry", async () => {
		const webpack = require("../../..");

		const { cssMinify } = webpack.css;

		const { code } = await cssMinify({ "a.css": "a {\n\tcolor: red;\n}\n" });

		expect(code).toMatchInlineSnapshot('"a{color:red}"');
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
			[
				{
					condition: (/** @type {{ value: string }} */ comment) =>
						comment.value.includes("two")
				},
				"a{color:red}b{color:blue}c{margin:0}",
				["/* @license two */"]
			]
		])("takes out what %p names", async (extractComments, code, extracted) => {
			expect(await run(extractComments)).toEqual({
				code,
				extractedComments: extracted
			});
		});

		it.each([
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

		it.each([
			[(/** @type {string} */ comment) => comment.includes("plain"), "/* plain */"]
		])("keeps what `comments: %p` keeps of the rest", async (comments, kept) => {
			const { code } = await run(true, { comments });
			expect(code).toContain(`a{color:red}${kept}b{color:blue}`);
			expect(code).not.toContain("/*! one */");
		});
	});
});

describe("SourceProcessor — mergeDistantRules", () => {
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
});

describe("CssSyntax — a value too long for the buffers a parse keeps", () => {
	it("prints it, and the next stylesheet after it", () => {
		const value = "x ".repeat(40000).trim();
		expect(minifyFor(`a{b:${value}}`)).toBe(`a{b:${value}}`);
	});
});

describe("CssSyntax minify — a call or a sub-rule named with an escape", () => {
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
		["@media print{a{b:1}a{b${BIG}.a{--x:1px (/*!k*}", {}, 144713, "0f3f5b4bfa41cc69"],
		["@layer x{${BIG}a{b:c}a{a{b:{ba{b:{b}", {}, 144701, "c39937110f690f2b"],
		["@layer x{.p{@-webkit-keyframes k{}}${BIG}b,;a,b{c:1}b,;b{c:1}}", {"environment":{"browsers":["chrome 140","firefox 140","safari 26.2"]},"transforms":{"customSelectors":false,"rewriteEscapes":false,"mergeRules":false}}, 144729, "e8f008f21cc73857"]
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
		[".p{${BIG}@layer x{c{x:1}}@layer x{b{x:1}}@layer x{a{x:1}}}", ".p{${BIG}@layer x{a,b,c{x:1}}}"]
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

