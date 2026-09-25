"use strict";

const {
	SELECTOR_SUPPORTED_FROM,
	SUPPORTED_FROM
} = require("../../lib/css/data");
const { SourceProcessor } = require("../../lib/css/syntax");
const {
	gateFixtures,
	readSheet,
	readability,
	selectorKey,
	sheetConstructs,
	statedLowerings,
	targetBrowsers
} = require("../../tooling/css-readability");

const LEGACY = ["chrome 100", "firefox 100", "safari 15.4"];

/**
 * What the relation says about one printed stylesheet.
 * @param {string} source what the printer was handed
 * @param {string} printed what it wrote
 * @param {string[]=} browsers the target
 * @returns {string[]} each finding's kind
 */
const hold = (source, printed, browsers = LEGACY) =>
	readability({ source, printed, browsers }).map((report) => report.what);

/**
 * What the relation says about the printer's own output for one stylesheet.
 * @param {string} source what the printer is handed
 * @param {string[]=} browsers the target
 * @returns {string[]} each finding's kind
 */
const holdPrinted = (source, browsers = LEGACY) =>
	hold(
		source,
		new SourceProcessor().process(source, {
			mode: "minify",
			environment: { browsers }
		}).code,
		browsers
	);

describe("the readable relation", () => {
	describe("a lowering left undone", () => {
		it("names nesting a prefix copy kept, as webpack/webpack#22308 wrote it", () => {
			expect(
				hold(
					".n{&:fullscreen{top:0}}",
					".n{&:-webkit-full-screen{top:0}&:fullscreen{top:0}}"
				)
			).toEqual([
				"left nesting as a rule a vendor prefix rewrote, which a target without it cannot read"
			]);
		});

		it("names nesting an at-rule kept", () => {
			expect(
				hold("a{@media print{top:0}}", "a{@media print{top:0}}")
			).toEqual([
				"left nesting as an at-rule written in a style rule, which a target without it cannot read"
			]);
		});

		it("says nothing where the nesting was taken out", () => {
			expect(hold("a{&:hover{top:0}}", "a:hover{top:0}")).toEqual([]);
		});

		it("says nothing where the target reads no `:is()`, which the lowering needs", () => {
			const css = "a{&:hover{top:0}}";
			expect(hold(css, css, ["chrome 80"])).toEqual([]);
		});

		it("says nothing where the target reads nesting", () => {
			const css = "a{&:hover{top:0}}";
			expect(hold(css, css, ["chrome 130"])).toEqual([]);
		});

		it("names a media range left, by its bound", () => {
			expect(
				hold("@media (width<2px){a{top:0}}", "@media (width<2px){a{top:0}}")
			).toEqual([
				"left a media range with a strict bound, which a target without it cannot read"
			]);
		});
	});

	describe("a list the printer joined", () => {
		it("names prefix copies joined, as webpack/webpack#22308's first commit wrote them", () => {
			expect(
				hold(
					".n{&:fullscreen{top:0}}",
					".n:-webkit-full-screen,.n:fullscreen{top:0}"
				)
			).toEqual([
				"hoisting a prefix copy joined `.n:-webkit-full-screen` into a list, which firefox 100 drops whole with `.n:fullscreen`"
			]);
		});

		it("names siblings joined around a pseudo one browser drops", () => {
			expect(
				hold("main{:has(p){top:0}#baz{top:0}}", "main #baz,main :has(p){top:0}")
			).toEqual([
				"hoisting nested rules joined `main :has(p)` into a list, which chrome 100 drops whole with `main #baz`"
			]);
		});

		it("names rules merged around a pseudo one browser drops", () => {
			expect(
				hold("a:has(p){top:0}b{top:0}", "a:has(p),b{top:0}")
			).toEqual([
				"merging rules joined `a:has(p)` into a list, which chrome 100 drops whole with `b`"
			]);
		});

		it("says nothing of a list the source wrote", () => {
			const css = "a:has(p),b{top:0}";
			expect(hold(css, css)).toEqual([]);
		});

		it("says nothing of prefix copies written as rules of their own", () => {
			expect(
				hold(
					"a:fullscreen{top:0}",
					"a:-webkit-full-screen{top:0}a:fullscreen{top:0}"
				)
			).toEqual([]);
		});
	});

	describe("a construct the printer reached for", () => {
		it("names a shorthand the target cannot read, written over longhands it could", () => {
			expect(
				hold(
					"a{flex-grow:1;flex-shrink:1;flex-basis:auto}",
					"a{flex:auto}",
					["ie 11"]
				)
			).toEqual(["wrote value:flex auto, which ie 11 does not read"]);
		});

		it("names a spelling behind a gate the target is short of", () => {
			expect(
				hold("a{color:rgba(255,0,0,.5)}", "a{color:#ff000080}", ["ie 11"])
			).toEqual(["wrote feature:colorHexAlpha, which ie 11 does not read"]);
		});

		it("says nothing where the source was no more readable", () => {
			expect(
				hold(
					"a{text-decoration:underline dotted red 2px}",
					"a{text-decoration:underline;text-decoration-thickness:2px}",
					["chrome 86"]
				)
			).toEqual([]);
		});

		it("says nothing where the browser reads the property not at all", () => {
			expect(
				hold("a{view-transition-scope:initial}", "a{view-transition-scope:none}", [
					"firefox 100"
				])
			).toEqual([]);
		});

		it("says nothing of a spelling the source already asked for", () => {
			const css = "a{color:#ff000080}";
			expect(hold(css, css, ["ie 11"])).toEqual([]);
		});
	});

	it("narrows a repro to the construct that shows it, given the printer", () => {
		const print = (/** @type {string} */ css) =>
			new SourceProcessor().process(css, {
				mode: "minify",
				environment: { browsers: LEGACY }
			}).code;
		const source = "b{top:0}a{@media print{top:0}}c{top:1px}";
		const [report] = readability({
			source,
			printed: print(source),
			browsers: LEGACY,
			print
		});
		expect(report.repro).toBe(
			"    a{@media print{top:0}}\n      -> a{@media print{top:0}}"
		);
	});

	it("holds the printer's own output for a lowering it makes", () => {
		expect(holdPrinted("a{color:red;& b{color:blue}}")).toEqual([]);
		expect(holdPrinted("a,b{& c{top:0}}")).toEqual([]);
		expect(holdPrinted("a{color:light-dark(red,blue)}")).toEqual([]);
		expect(holdPrinted("@media (width<=2px){a{top:0}}")).toEqual([]);
	});
});

describe("reading a target", () => {
	it("keeps the browsers the tables answer for, at each version named", () => {
		expect(
			targetBrowsers(["chrome 100", "ios_saf 15.2-15.3", "op_mini all", "kaios 3"])
		).toEqual([
			{ name: "chrome 100", slot: expect.any(Number), version: 10000000 },
			{ name: "ios_saf 15.2-15.3", slot: expect.any(Number), version: 1500002 }
		]);
	});

	it("states the lowerings the printer makes for it", () => {
		const names = (/** @type {string[]} */ browsers) =>
			statedLowerings(targetBrowsers(browsers)).map((one) => one.construct);
		expect(names(LEGACY)).toContain("feature:nesting");
		// No `:is()` to write the parent as, so nesting is kept as written.
		expect(names(["chrome 80"])).not.toContain("feature:nesting");
		expect(names(["chrome 130"])).not.toContain("feature:nesting");
	});
});

describe("reading a sheet", () => {
	it("reads a custom property's block as its value, not as a rule", () => {
		const sheet = readSheet("a{--x:{b:c};top:0}");
		expect(sheet.rules).toHaveLength(1);
		expect(sheet.declarations.map((one) => one.property)).toEqual([
			"--x",
			"top"
		]);
	});

	it("reads a declaration holding a block as nothing an engine keeps", () => {
		expect(
			sheetConstructs(readSheet("div{prop: {value}}")).has("feature:nesting")
		).toBe(false);
	});

	it("compares selectors by what they say", () => {
		expect(selectorKey("*:focus")).toBe(selectorKey(":focus"));
		expect(selectorKey("a::after")).toBe(selectorKey("a:after"));
		expect(selectorKey("a:-webkit-any(b)")).toBe(selectorKey("a:is(b)"));
		expect(selectorKey("[a='b'] > c")).toBe(selectorKey("[a=b]>c"));
	});
});

describe("the generated stylesheets", () => {
	/** @type {Set<string>} */
	const reached = new Set();
	for (const [, css] of gateFixtures()) {
		// What it asks for, and what the printer writes it as where every gate
		// is open, which is where a rewrite into a gated spelling shows.
		const printed = new SourceProcessor().process(css, { mode: "minify" }).code;
		for (const sheet of [css, printed]) {
			for (const [construct] of sheetConstructs(readSheet(sheet))) {
				reached.add(construct);
			}
		}
	}

	it("reach every gate the printer reads a target through", () => {
		// A gate a selector states is reached through the pseudo that states it.
		const THROUGH_PSEUDO = new Map([
			["isSelector", "pseudo::is"],
			["whereSelector", "pseudo::where"],
			["dirSelector", "pseudo::dir"]
		]);
		const missed = [...SUPPORTED_FROM.keys()].filter(
			(feature) =>
				!reached.has(`feature:${feature}`) &&
				!reached.has(/** @type {string} */ (THROUGH_PSEUDO.get(feature)))
		);
		expect(missed).toEqual([]);
	});

	it("reach every pseudo the printer knows who reads", () => {
		const missed = [...SELECTOR_SUPPORTED_FROM.keys()].filter(
			(pseudo) => !reached.has(`pseudo:${pseudo}`)
		);
		expect(missed).toEqual([]);
	});
});
