"use strict";

// Both printers held to what an engine makes of their output, over `configCases`
// and `test/wpt` alike, through the one path in `helpers/syntaxEquivalence`.
// Nothing is compared as text where the engine can be asked instead. A third
// tier needs no engine and so reads the whole corpus: webpack's own parser is a
// DOM oracle, held to that corpus's expected trees by html5lib.spectest.js.

const path = require("path");
const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const {
	BOOLEAN_ATTRIBUTES,
	EMPTY_REMOVABLE_ATTRIBUTES,
	ENUMERATED_ATTRIBUTE_NAMES,
	ENUMERATED_KEYWORDS,
	REWRITABLE_ATTRIBUTES
} = require("../lib/html/data");
const {
	A,
	NS_MATHML,
	NS_SVG,
	NodeType,
	SourceProcessor: HtmlSourceProcessor,
	decodeEntities,
	parseHtml
} = require("../lib/html/syntax");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");
const launchChrome = require("./helpers/launchChrome");
const {
	buildCorpus,
	compareRules,
	conditionSignatures,
	installHelpers
} = require("./helpers/syntaxEquivalence");
const {
	browserCorpus,
	cssCorpus: wptCssCorpus,
	cssDeclarations,
	fullCorpus,
	hasCorpus,
	nameOf,
	readDocument
} = require("./helpers/wptCorpus");

/** @typedef {import("./helpers/syntaxEquivalence").Fixture} Fixture */
/** @typedef {import("./helpers/syntaxEquivalence").PageHelpers} PageHelpers */
/** @typedef {import("./helpers/syntaxEquivalence").Rule} Rule */

const CONFIG_CASES = path.join(__dirname, "configCases");
// How many documents go to the page at once — the wpt corpus is far larger than
// one `evaluate` argument should carry.
const BATCH = 150;
// What one file of declarations gets, and what one batch's CDP call gets with
// it. A file is a handful of values and the whole tier runs in milliseconds, so
// this is three orders above what any file needs: generous enough never to fail
// a slow runner, small enough that every file which hangs is named in one run
// rather than one per quarter hour.
// Enough for a file that gives up to then read its values one at a time.
const FILE_TIMEOUT = 180000;
// Below it, so a file that hangs is failed here rather than by jest — which is
// what lets the page be replaced before the next file runs.
const FILE_BUDGET = 20000;
// One value on the retry that follows, where naming it is the whole point. A
// declaration costs a millisecond, so this is three orders above what it needs.
const VALUE_BUDGET = 2000;

// Documents and stylesheets the printers are known to get wrong, per corpus.
// Each is a filed defect, not a tolerated one; every comparison matches its set
// exactly, so an entry outlives its defect by one run.
const FILED_CONFIG_CSS_DEFECTS = new Map([
	[
		"test/configCases/css/minimize-strings/style.css",
		"a bad-string stops swallowing the rules after it"
	],
	[
		"test/configCases/css/minimize-urls/style.css",
		"a bad-url stops swallowing the rules after it"
	],
	[
		"test/configCases/css/parsing/cases/bad-url-token.css",
		"a bad-url token stops swallowing the rules after it"
	],
	[
		// Not a printer defect: Chrome normalises an escaped custom property in a
		// declaration name but echoes the authored spelling inside `var()`, so the
		// shorter `\2d-two` the printer writes reads as different `cssText` from
		// `\2d\2d two` while naming the one property — both compute the same value.
		"test/configCases/css/escaped-names/style.module.css",
		"Chrome echoes the authored escape spelling inside `var()`"
	],
	[
		// Not a printer defect: Chrome drops `attr( name unit )` when a space sits
		// before the `)` and the type is a bare unit — `attr( name unit)`,
		// `attr(name  unit)`, `attr( name type(<length>) )` and `attr( name unit, )`
		// all parse. Trimming that space is right, and leaves the minified sheet
		// applying a declaration the engine threw away in the original.
		"test/configCases/css/minimize-lightningcss-values/style.css",
		"Chrome parses `attr( name unit )` and its trimmed form differently"
	]
]);

const FILED_WPT_HTML_DEFECTS = new Map([
	[
		"test/wpt/html/syntax/parsing/misnested-form-in-template.html",
		"not a printer defect: the form pointer is not set inside a `<template>`, which this test asserts and Chromium has not implemented — webpack prints the tree wpt expects"
	],
	// Not yet traced to a cause: Chromium builds a different CSSOM from the
	// minified page for each of these, all of them `@scope` / `@layer` cascade
	// tests. Filed so the difference cannot grow silently.
	[
		"test/wpt/css/css-cascade/revert-layer-011.html",
		"Chromium builds a different CSSOM from the minified page"
	],
	[
		"test/wpt/css/css-cascade/scope-implicit-003-print.html",
		"Chromium builds a different CSSOM from the minified page"
	],
	[
		"test/wpt/css/css-cascade/scope-nesting.html",
		"Chromium builds a different CSSOM from the minified page"
	]
]);

const FILED_WPT_CSS_DEFECTS = new Map([
	[
		// The same defect as `font-family:"Lucida" Grande` below, reached from a
		// stylesheet: a quoted family beside a bare identifier matches no family
		// list, and unquoting it makes the engine read one name where it read none.
		"test/wpt/tools/wave/export/css/result.css",
		"unquoting a string makes an invalid family list parse"
	]
]);

// The same, for what webpack's own parser sees over the whole corpus.
const FILED_WPT_TREE_DEFECTS = new Map();

// Declarations Chromium computes a different style from once printed, keyed by
// the value as written. A printer defect unless the reason says otherwise.
const FILED_WPT_VALUE_DEFECTS = new Map([
	[
		'font-family:"Lucida" Grande, sans-serif',
		"unquoting a string makes an invalid family list parse"
	],
	["grid-row:1.0", "printing `1.0` as `1` makes an invalid <integer> parse"],
	[
		"grid-auto-flow:row dense column",
		"dropping `row` makes an invalid value parse"
	],
	["tab-size:0px", "dropping the unit turns a <length> into a <number>"],
	[
		"overflow-clip-margin:0px content-box",
		"dropping the unit changes what the engine computes"
	],
	[
		"overflow-clip-margin:calc(100px - 50px)",
		"not a printer defect: Chromium echoes the authored `calc()` in the computed value"
	],
	[
		"font-style:oblique calc(100deg)",
		"not a printer defect: Chromium echoes the authored `calc()` in the computed value"
	],
	[
		"animation-timing-function:steps(1, jump-start)",
		"not a printer defect: `step-start` is its own spelling, computed back verbatim"
	],
	[
		"animation-timing-function:steps(2, jump-start)",
		"not a printer defect: `start` and `jump-start` are one function, computed back verbatim"
	],
	[
		"transition-timing-function:steps(2, jump-start)",
		"not a printer defect: `start` and `jump-start` are one function, computed back verbatim"
	],
	[
		"list-style:disc radial-gradient(circle, #006, #00a 90%, #0000af 100%,white 100%) inside",
		"not a printer defect: an implied last stop is computed back as written"
	]
]);

/**
 * @param {string} source HTML
 * @param {object=} options extra print options
 * @returns {string} the same document, minified
 */
const minifyHtml = (source, options) =>
	/** @type {{ code: string }} */ (
		new HtmlSourceProcessor().process(source, { mode: "minify", ...options })
	).code;

/**
 * @param {string} source a stylesheet
 * @returns {string} the same stylesheet, minified
 */
const minifyCss = (source) =>
	/** @type {{ code: string }} */ (
		new CssSourceProcessor().process(source, { mode: "minify" })
	).code;

/**
 * One declaration's minified value — `a{…}` is the smallest rule carrying one.
 * @param {string} property the property name
 * @param {string} value the value as written
 * @returns {string} what the printer writes, "" when it dropped the declaration
 */
const minifyDeclaration = (property, value) => {
	const printed = minifyCss(`a{${property}:${value}}`);
	const open = printed.indexOf("{");
	if (open === -1) return "";
	const body = printed.slice(open + 1, printed.lastIndexOf("}"));
	const colon = body.indexOf(":");
	return colon === -1 ? "" : body.slice(colon + 1);
};

/**
 * @typedef {object} Corpus
 * @property {string} label what to call it in a test name
 * @property {Fixture[]} html every page
 * @property {Fixture[]} htmlAllImpliedTags the same, printed with `removeImpliedTags: true`
 * @property {Fixture[]} htmlSmartTags the same, printed with `removeImpliedTags: "smart"`
 * @property {Fixture[]} css every stylesheet
 * @property {Map<string, string>} filedHtml its filed DOM defects
 * @property {Map<string, string>} filedCss its filed stylesheet defects
 */

/** @type {Corpus[]} */
let corpora;
/** @type {Promise<void> | undefined} */
let building;

/**
 * @param {Fixture[]} sources pages, read once
 * @param {object} options extra print options
 * @returns {Fixture[]} the same pages, printed with them
 */
const variant = (sources, options) =>
	sources.map((one) => ({ ...one, min: minifyHtml(one.raw, options) }));

/**
 * Build every corpus once, however many suites ask for them.
 * @returns {Promise<void>} when they are ready
 */
const buildCorpora = () => {
	if (building === undefined) {
		building = (async () => {
			const configHtml = await buildCorpus(
				CONFIG_CASES,
				".html",
				(source) => source
			);
			const configCss = await buildCorpus(CONFIG_CASES, ".css", minifyCss);
			corpora = [
				{
					label: "configCases",
					html: variant(configHtml, {}),
					// `removeImpliedTags` leaves out a tag the parser puts back, so it is
					// the one option whose whole claim is that the DOM does not notice.
					htmlAllImpliedTags: variant(configHtml, { removeImpliedTags: true }),
					htmlSmartTags: variant(configHtml, { removeImpliedTags: "smart" }),
					css: configCss,
					filedHtml: new Map(),
					filedCss: FILED_CONFIG_CSS_DEFECTS
				}
			];
			if (!hasCorpus()) return;
			/** @type {Fixture[]} */
			const wptHtml = [];
			for (const file of browserCorpus()) {
				const raw = readDocument(file);
				if (raw !== null) wptHtml.push({ name: nameOf(file), raw, min: raw });
			}
			/** @type {Fixture[]} */
			const wptCss = [];
			for (const file of wptCssCorpus()) {
				const raw = readDocument(file);
				if (raw !== null) {
					wptCss.push({ name: nameOf(file), raw, min: minifyCss(raw) });
				}
			}
			corpora.push({
				label: "wpt",
				html: variant(wptHtml, {}),
				htmlAllImpliedTags: variant(wptHtml, { removeImpliedTags: true }),
				htmlSmartTags: variant(wptHtml, { removeImpliedTags: "smart" }),
				css: wptCss,
				filedHtml: FILED_WPT_HTML_DEFECTS,
				filedCss: FILED_WPT_CSS_DEFECTS
			});
		})();
	}
	return building;
};

/**
 * Run `evaluate` over `items` in batches the page can hold.
 * @template TIn
 * @template TOut
 * @param {import("puppeteer-core").Page} page the page
 * @param {TIn[]} items everything to send
 * @param {(batch: TIn[]) => Promise<TOut[]>} evaluate what to run per batch
 * @returns {Promise<TOut[]>} every batch's results, in order
 */
const inBatches = async (page, items, evaluate) => {
	/** @type {TOut[]} */
	const out = [];
	for (let at = 0; at < items.length; at += BATCH) {
		out.push(...(await evaluate(items.slice(at, at + BATCH))));
	}
	return out;
};

// The corpus is an optional submodule, so a tier that cannot run reports that
// rather than reporting green.
const NO_CORPUS =
	"wpt submodule not initialized (run `git submodule update --init --depth 1 test/wpt`)";

expectNoDeprecations();

describe("printer output in real Chrome", () => {
	/** @type {import("puppeteer-core").Browser} */
	let browser;
	/** @type {import("puppeteer-core").Page} */
	let page;

	/** @type {import("puppeteer-core").Page} the page the probing tiers share */
	let probePage;

	/** @returns {Promise<import("puppeteer-core").Page>} a page with the helpers */
	const freshPage = async () => {
		const opened = await browser.newPage();
		await opened.setContent(
			"<!doctype html><html><head></head><body></body></html>"
		);
		await opened.evaluate(installHelpers);
		return opened;
	};

	beforeAll(async () => {
		await buildCorpora();
		browser = await launchChrome({ protocolTimeout: FILE_TIMEOUT });
		// The probing tiers set a property on one element and read it back, leaving
		// nothing behind, so they share a page — at 58ms to open one and 1ms to
		// call into it, a page per test would cost more than the tests do.
		probePage = await freshPage();
	}, 300000);

	afterAll(async () => {
		if (probePage) await probePage.close();
		if (browser) await browser.close();
	});

	/**
	 * Every page in `cases`, compared as the engine builds it: the facets it
	 * reports, and the CSSOM of every stylesheet it carries. Batched — and the
	 * conditions are sampled per batch, since sampling every length named
	 * anywhere in the corpus against every condition in it grows with the
	 * product of the two.
	 * @param {Fixture[]} cases the corpus
	 * @param {boolean} withStyles whether to compare the CSSOM too
	 * @returns {Promise<{ name: string, why: string }[]>} what moved, per page
	 */
	const comparePages = async (cases, withStyles) => {
		/** @type {{ name: string, why: string }[]} */
		const differences = [];
		for (let at = 0; at < cases.length; at += BATCH) {
			const collected = await page.evaluate(
				(batch) => {
					const { htmlFacets } = /** @type {{ __eq: PageHelpers }} */ (
						/** @type {unknown} */ (window)
					).__eq;
					return batch.map((fixture) => ({
						name: fixture.name,
						before: htmlFacets(fixture.raw),
						after: htmlFacets(fixture.min)
					}));
				},
				cases.slice(at, at + BATCH)
			);
			const signatures = await conditionSignatures(
				page,
				collected.flatMap((each) => [
					...each.before.styles,
					...each.after.styles
				])
			);
			for (const { name, before, after } of collected) {
				let why = "";
				for (const facet of Object.keys(before.facets)) {
					const a = before.facets[facet];
					const b = after.facets[facet];
					// A comment renders nothing, so the minifier may drop one; the ones
					// it keeps must be unchanged and still in order.
					if (facet === "comments") {
						let from = 0;
						for (const comment of b) {
							const found = a.indexOf(comment, from);
							if (found === -1) {
								why = `comment is not one of the source's: ${comment}`;
								break;
							}
							from = found + 1;
						}
						if (why !== "") break;
						continue;
					}
					if (a.length !== b.length) {
						why = `${facet}: ${a.length} vs ${b.length}`;
						break;
					}
					const found = a.findIndex((entry, i) => entry !== b[i]);
					if (found !== -1) {
						why = `${facet} ${found}: ${a[found]} vs ${b[found]}`;
						break;
					}
				}
				if (withStyles) {
					if (why === "" && before.styles.length !== after.styles.length) {
						why = `styles: ${before.styles.length} vs ${after.styles.length}`;
					}
					for (let i = 0; why === "" && i < before.styles.length; i++) {
						const reason = compareRules(
							before.styles[i],
							after.styles[i],
							signatures
						);
						if (reason !== "") why = `style ${i}: ${reason}`;
					}
				}
				if (why !== "") differences.push({ name, why });
			}
		}
		return differences;
	};

	const describeCorpus = (at, label) => {
		describe(label, () => {
			// A page of its own per test: a tier that leaves thousands of parsed
			// documents behind must not be what makes the next one time out.
			beforeEach(async () => {
				page = await freshPage();
			}, 300000);

			afterEach(async () => {
				if (page) await page.close();
			});

			if (at === 1 && !hasCorpus()) {
				it(NO_CORPUS, () => {
					// No-op: the corpus is an optional git submodule.
				});

				return;
			}
			/** @returns {Corpus | undefined} the corpus, once built */
			const corpus = () => corpora[at];

			it("should build the same DOM and CSSOM from a page and its minified form", async () => {
				const one = corpus();
				if (one === undefined) return;
				// Every part of the document the engine builds — the element tree, the
				// rendered text, the comments, the doctype, the CSS, JSON and script
				// bodies carried inside it, and the CSSOM of every stylesheet it
				// carries — must survive minification.
				const differences = await comparePages(one.html, true);
				expect(differences.map((each) => each.name).sort()).toEqual(
					[...one.filedHtml.keys()].sort()
				);
			}, 1800000);

			it.each([
				["true", (/** @type {Corpus} */ c) => c.htmlAllImpliedTags],
				["smart", (/** @type {Corpus} */ c) => c.htmlSmartTags]
			])(
				"should build the same DOM and CSSOM with removeImpliedTags %s",
				async (_mode, pick) => {
					const one = corpus();
					if (one === undefined) return;
					// The tags this leaves out are the ones the parser puts back, so the
					// tree it builds — every element's depth in it, and the CSSOM of what
					// it carries — is untouched.
					const differences = await comparePages(pick(one), true);
					expect(differences.map((each) => each.name).sort()).toEqual(
						[...one.filedHtml.keys()].sort()
					);
				},
				1800000
			);

			it("should build the same CSSOM from a stylesheet and its minified form", async () => {
				const one = corpus();
				if (one === undefined) return;
				const collected = await inBatches(page, one.css, (batch) =>
					page.evaluate((cases) => {
						const { cssRules } = /** @type {{ __eq: PageHelpers }} */ (
							/** @type {unknown} */ (window)
						).__eq;
						return cases.map((each) => ({
							name: each.name,
							before: cssRules(each.raw),
							after: cssRules(each.min)
						}));
					}, batch)
				);
				const signatures = await conditionSignatures(
					page,
					collected.flatMap((each) => [each.before || [], each.after || []])
				);
				/** @type {{ name: string, why: string }[]} */
				const differences = [];
				for (const { name, before, after } of collected) {
					if (before === null || after === null) {
						differences.push({ name, why: "stylesheet did not parse" });
						continue;
					}
					const why = compareRules(before, after, signatures);
					if (why !== "") differences.push({ name, why });
				}
				// The same rules, in the same cascade order, under conditions the engine
				// answers alike, each computing to the same style. The comparison is
				// exact in both directions: a new difference fails, and so does a filed
				// one that has been fixed, which is what takes its entry back out.
				expect(differences.map((each) => each.name).sort()).toEqual(
					[...one.filedCss.keys()].sort()
				);
			}, 900000);
		});
	};

	describeCorpus(0, "configCases");
	describeCorpus(1, "wpt");

	// One test per wpt file rather than one for all 8,785 declarations: a file
	// that is slow or hangs then names itself, and the file is what a defect is
	// read from. Per spec area would be cheaper still and says too little — one
	// area timing out named 233 declarations at once and blamed all of them.
	/** @type {Map<string, { name: string, property: string, key: string, raw: string, min: string }[]>} */
	const declarationsByFile = new Map();
	for (const { property, value, name } of hasCorpus()
		? cssDeclarations()
		: []) {
		const one = {
			name,
			property,
			key: `${property}:${value}`,
			raw: value,
			min: minifyDeclaration(property, value)
		};
		const group = declarationsByFile.get(name);
		if (group === undefined) declarationsByFile.set(name, [one]);
		else group.push(one);
	}
	/** @type {Set<string>} every value that moved, filled as the files run */
	const movedValues = new Set();

	const compareValues = (cases) =>
		inBatches(probePage, cases, (batch) =>
			probePage.evaluate((each) => {
				const probe = document.createElement("div");
				document.body.append(probe);
				// Computed values, not `cssText`: `left bottom` and `0% 100%` are one
				// declaration the CSSOM serializes two ways, and only what the engine
				// resolves them to says whether the printer changed the meaning.
				const computed = getComputedStyle(probe);
				/**
				 * The longhands a value sets and what the engine computes for each. One
				 * assignment per form: the style recalculation is the expensive part, and
				 * anchor positioning makes one cost orders more than the rest.
				 * @param {string} property the property name
				 * @param {string} value the value to set
				 * @returns {string} each longhand it sets, with what it computes to
				 */
				const readBack = (property, value) => {
					probe.style.cssText = "";
					probe.style.cssText = `${property}:${value}`;
					/** @type {string[]} */
					const names = [];
					for (let at = 0; at < probe.style.length; at++) {
						names.push(probe.style.item(at));
					}
					names.sort();
					// Separated: run together, a difference that shifts across a property
					// boundary ("ab"+"c" against "a"+"bc") reads as equal.
					let out = "";
					for (const name of names) {
						out += `${name}:${computed.getPropertyValue(name)}\u0000`;
					}
					return out;
				};
				const out = [];
				for (const one of each) {
					// Each form read against its own longhands, the name included: a form
					// that sets a property the other does not — an invalid value the
					// printer brought to life, or a valid one it erased — differs by
					// that name alone. An erased declaration is read as the empty form
					// rather than skipped, so the engine says whether it mattered.
					if (
						readBack(one.property, one.raw) !== readBack(one.property, one.min)
					) {
						out.push({ name: one.name, key: one.key });
					}
				}
				// The page is shared, so what this tier appends it takes back out.
				probe.remove();
				return out;
			}, batch)
		);

	/**
	 * Declarations read within a budget, on a page the next read can still use.
	 * A value that hangs leaves the renderer mid-recalculation, so the page is
	 * replaced rather than reused — without that, one bad read times out every
	 * read behind it and the run ends on the job's budget with nothing named.
	 * @param {{ name: string, property: string, key: string, raw: string, min: string }[]} cases the declarations to read
	 * @param {number} budget milliseconds to allow
	 * @returns {Promise<{ name: string, key: string }[]>} what moved
	 */
	const compareWithin = async (cases, budget) => {
		/** @type {NodeJS.Timeout} */
		let expiry;
		const expired = new Promise((resolve, reject) => {
			expiry = setTimeout(() => {
				reject(new Error(`gave up after ${budget}ms`));
			}, budget);
		});
		try {
			return await Promise.race([compareValues(cases), expired]);
		} catch (err) {
			await probePage.close().catch(() => {});
			probePage = await freshPage();
			throw err;
		} finally {
			clearTimeout(expiry);
		}
	};

	/**
	 * One file's declarations, named individually when the file gives up. The
	 * file is what a defect is read from, but the value is what one is filed
	 * against, so a hang is retried one declaration at a time rather than
	 * leaving the whole file as the only thing the run can point at.
	 * @param {{ name: string, property: string, key: string, raw: string, min: string }[]} cases the file's declarations
	 * @returns {Promise<{ name: string, key: string }[]>} what moved
	 */
	const compareFile = async (cases) => {
		try {
			return await compareWithin(cases, FILE_BUDGET);
		} catch (err) {
			if (cases.length === 1) throw err;
			/** @type {{ name: string, key: string }[]} */
			const moved = [];
			/** @type {string[]} */
			const hung = [];
			for (const one of cases) {
				try {
					moved.push(...(await compareWithin([one], VALUE_BUDGET)));
				} catch (_) {
					hung.push(JSON.stringify(one.raw));
				}
			}
			// Nothing hung on its own: the file is merely slow read in one go,
			// which the values it just reported already covered.
			if (hung.length === 0) return moved;
			throw new Error(
				`gave up on ${cases[0].property} in ${cases[0].name} at ${hung.join(", ")}`,
				{ cause: err }
			);
		}
	};

	if (!hasCorpus()) {
		it(NO_CORPUS, () => {
			// No-op: the corpus is an optional git submodule.
		});
	}
	for (const [name, cases] of declarationsByFile) {
		it(
			`should compute the same style from a value in ${name} and its minified form`,
			async () => {
				for (const one of await compareFile(cases)) {
					movedValues.add(one.key);
				}
			},
			FILE_TIMEOUT
		);
	}

	// Runs last, so every file has reported what moved. Includes the values the
	// spec rejects: an invalid declaration moves nothing, so one whose printed
	// form does is one the printer brought to life.
	if (declarationsByFile.size > 0) {
		it("should still diverge on every filed value defect", () => {
			expect([...movedValues].sort()).toEqual(
				[...FILED_WPT_VALUE_DEFECTS.keys()].sort()
			);
		});
	}

	it("should only fold enumerated values the engine folds too", async () => {
		// The printer lower-cases a value in `ENUMERATED_KEYWORDS`. That is
		// unobservable exactly where the IDL member is "limited to only known
		// values", so it hands back one spelling whichever was written — which no
		// dataset states, and `target` / `<textarea wrap>` reflect verbatim. The
		// corpus only covers the entries a fixture happens to carry; this covers
		// every one of them.
		/** @type {Record<string, Record<string, string[]>>} */
		const table = {};
		for (const [element, attributes] of Object.entries(ENUMERATED_KEYWORDS)) {
			table[element] = {};
			for (const [attribute, keywords] of Object.entries(attributes)) {
				table[element][attribute] = [...keywords];
			}
		}
		const unfolded = await probePage.evaluate((cases) => {
			/**
			 * @param {string} element tag name
			 * @param {string} attribute attribute name
			 * @param {string} value the value to set
			 * @returns {[string | undefined, string]} the IDL member and what it reads back
			 */
			const readBack = (element, attribute, value) => {
				const { probeReflection } = /** @type {{ __eq: PageHelpers }} */ (
					/** @type {unknown} */ (window)
				).__eq;
				const [property, reflected] = probeReflection(
					element,
					attribute,
					value
				);
				// By value: a token list reflects as a fresh object per probe, so two
				// spellings of one value would never compare equal as themselves.
				return [property, String(reflected)];
			};
			/** @type {string[]} */
			const out = [];
			for (const [element, attributes] of Object.entries(cases)) {
				for (const [attribute, keywords] of Object.entries(attributes)) {
					for (const keyword of keywords) {
						// A keyword with no lower case to fold cannot be respelled.
						if (keyword === keyword.toUpperCase()) continue;
						// A global attribute is read on an element that reflects it; one
						// no element does (`referrerpolicy` on a `<div>`) is inert there.
						const on = element === "*" ? "a" : element;
						const [property, folded] = readBack(on, attribute, keyword);
						if (property === undefined) continue;
						const [, written] = readBack(on, attribute, keyword.toUpperCase());
						if (written !== folded) {
							out.push(
								`${element} ${attribute}=${keyword}: ${JSON.stringify(
									written
								)} vs ${JSON.stringify(folded)}`
							);
						}
					}
				}
			}
			return out;
		}, table);
		expect(unfolded).toEqual([]);
	}, 600000);

	it("should only drop an empty attribute the engine reads back as absent", async () => {
		// `removeEmptyAttributes` drops each of these when its value is empty. That
		// is unobservable only where the IDL member reads the same as with no
		// attribute at all — which is why an event handler is not in the table:
		// an empty body still compiles, so it reads back a function, not null.
		// A global is read on `<a>`, as every one of them was before the table
		// carried a scope; a scoped one on each element it names.
		/** @type {[string, string[]][]} */
		const probes = [];
		for (const [name, on] of EMPTY_REMOVABLE_ATTRIBUTES) {
			probes.push([name, on === null ? ["a"] : [...on]]);
		}
		const observable = await probePage.evaluate((pairs) => {
			/**
			 * @param {string} tagName the element to read it on
			 * @param {string} attribute the attribute name
			 * @param {boolean} set whether to give it the empty value
			 * @returns {[string | undefined, unknown]} the IDL member and its value
			 */
			const readBack = (tagName, attribute, set) => {
				const { probeReflection } = /** @type {{ __eq: PageHelpers }} */ (
					/** @type {unknown} */ (window)
				).__eq;
				const [property, reflected] = probeReflection(
					tagName,
					attribute,
					set ? "" : null
				);
				return [property, String(reflected)];
			};
			/** @type {string[]} */
			const out = [];
			for (const [name, elements] of pairs) {
				for (const tagName of elements) {
					const [property, empty] = readBack(tagName, name, true);
					if (property === undefined) continue;
					const [, absent] = readBack(tagName, name, false);
					if (empty !== absent) {
						out.push(`${tagName}[${name}]: ${empty} vs ${absent}`);
					}
				}
			}
			return out;
		}, probes);
		expect(observable).toEqual([]);
	}, 600000);
});

const NS_PREFIX = { [NS_SVG]: "svg ", [NS_MATHML]: "math " };
// Whitespace inside these is data or is rendered verbatim, so it is not text to
// collapse; a `<style>` body is CSS, held to the CSSOM comparison above instead.
const VERBATIM_TEXT = new Set(["pre", "textarea", "script", "style"]);
const ASCII_WHITESPACE = /[ \t\n\f\r]+/g;

/**
 * @param {string} name an attribute name
 * @returns {boolean} whether the printer may write it differently
 */
const isRewritable = (name) =>
	REWRITABLE_ATTRIBUTES.has(name) ||
	BOOLEAN_ATTRIBUTES.has(name) ||
	ENUMERATED_ATTRIBUTE_NAMES.has(name) ||
	EMPTY_REMOVABLE_ATTRIBUTES.has(name);

/**
 * @typedef {object} DomShape
 * @property {string[]} elements each element as `depth|namespace tag|attributes`
 * @property {string[]} text the rendered text each element holds itself
 */

/**
 * What an engine builds a document into, less what a minifier may change: a
 * comment it may drop, and a whitespace run it may collapse to one space. An
 * attribute the printer is free to rewrite carries its name only — whether it
 * still means the same is what IDL reflection answers, in the tier above —
 * and every other one carries its value. CSS is not compared here at all: two
 * spellings of one stylesheet differ as text (a selector list reordered) while
 * building the same CSSOM, which only an engine can say, so every stylesheet a
 * page carries is compared in the tier above instead.
 * @param {string} source the document
 * @returns {DomShape} its shape
 */
const domShapeOf = (source) => {
	const document = parseHtml(source, 0, {});
	/** @type {string[]} */
	const elements = [];
	/** @type {string[]} */
	const text = [];
	/**
	 * @param {number} node the subtree root
	 * @param {number} depth how deep its children sit
	 * @param {boolean} renders whether text here reaches the page
	 */
	const walk = (node, depth, renders) => {
		for (
			let child = A.firstChild(node);
			child !== 0;
			child = A.nextSibling(child)
		) {
			if (A.type(child) !== NodeType.Element) continue;
			const tag = A.tagName(child);
			const namespace =
				/** @type {Record<number, string>} */ (NS_PREFIX)[A.namespace(child)] ||
				"";
			const written = [...A.attributes(child)]
				.map((attribute) => {
					const name = attribute.serializedName || attribute.name;
					// The printer may rewrite these — a boolean written bare, an
					// enumerated value folded, a `style` re-printed, a `srcset` given
					// different spacing. Whether it still reflects the same is what IDL
					// reflection answers, in the tier above, so here only the name is
					// compared.
					if (isRewritable(name)) return name;
					// The value as the DOM holds it: `&lt;` and a literal `<` are one
					// attribute written two ways.
					return `${name}=${decodeEntities(attribute.value, true)}`;
				})
				.sort();
			elements.push(`${depth}|${namespace}${tag}|${written.join(" ")}`);
			// Whitespace between two `<head>` children renders nothing, so only text
			// that reaches the page is compared.
			const inPage = renders || (namespace === "" && tag === "body");
			if (inPage && !VERBATIM_TEXT.has(tag)) {
				let own = "";
				for (let t = A.firstChild(child); t !== 0; t = A.nextSibling(t)) {
					if (A.type(t) === NodeType.Text) own += A.data(t);
				}
				text.push(own.replace(ASCII_WHITESPACE, " "));
			}
			const content = A.templateContent(child);
			if (content !== 0) walk(content, depth + 1, true);
			walk(child, depth + 1, inPage);
		}
	};
	walk(document, 0, false);
	return { elements, text };
};

/**
 * @param {DomShape} before the source document's shape
 * @param {DomShape} after the minified document's shape
 * @returns {string} what moved, or "" when nothing did
 */
const whatMoved = (before, after) => {
	for (const facet of /** @type {("elements" | "text")[]} */ ([
		"elements",
		"text"
	])) {
		const a = before[facet];
		const b = after[facet];
		if (a.length !== b.length) return `${facet}: ${a.length} vs ${b.length}`;
		const at = a.findIndex((entry, i) => entry !== b[i]);
		if (at !== -1) {
			return `${facet} ${at}: ${JSON.stringify(a[at])} vs ${JSON.stringify(
				b[at]
			)}`;
		}
	}
	return "";
};

// The whole wpt corpus, with no engine: webpack's parser answers for the DOM,
// which the tree-construction suite holds to this corpus's own expected trees.
// One test per spec area rather than per document — 49k test names report
// nothing a failing list does not, and the list shows every document at once.
describe("wpt tree stability", () => {
	/** @type {Map<string, string[]>} the corpus, by wpt spec area */
	const byGroup = new Map();
	for (const file of hasCorpus() ? fullCorpus() : []) {
		const group = nameOf(file).split("/").slice(2, 4).join("/");
		const files = byGroup.get(group);
		if (files === undefined) byGroup.set(group, [file]);
		else files.push(file);
	}
	/** @type {Set<string>} every document that moved, filled as the groups run */
	const diverging = new Set();

	if (!hasCorpus()) {
		it(NO_CORPUS, () => {
			// No-op: the corpus is an optional git submodule.
		});

		return;
	}

	it("has a corpus", () => {
		expect([...byGroup.values()].flat().length).toBeGreaterThan(1000);
	});

	// One test per spec area rather than per document: 49k test names report
	// nothing a failing list does not. Each area does its own parsing, so a slow
	// one is named by its own timing rather than hidden in a corpus-wide pass.
	for (const [group, files] of byGroup) {
		it(`should build the same tree from ${group} and its minified form`, () => {
			/** @type {{ name: string, why: string }[]} */
			const differences = [];
			for (const file of files) {
				const source = readDocument(file);
				if (source === null) continue;
				const why = whatMoved(
					domShapeOf(source),
					domShapeOf(minifyHtml(source))
				);
				if (why === "") continue;
				const name = nameOf(file);
				diverging.add(name);
				if (!FILED_WPT_TREE_DEFECTS.has(name)) differences.push({ name, why });
			}
			expect(differences).toEqual([]);
		}, 600000);
	}

	// Runs last, so every group has reported what moved.
	it("should still diverge on every filed defect", () => {
		expect(
			[...FILED_WPT_TREE_DEFECTS.keys()].filter((name) => !diverging.has(name))
		).toEqual([]);
	});
});
