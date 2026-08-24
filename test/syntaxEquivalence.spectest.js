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
	installHelpers,
	numericallyEqual
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

/** @import { Fixture, PageHelpers } from "./helpers/syntaxEquivalence" */

const CONFIG_CASES = path.join(__dirname, "configCases");
// How many documents go to the page at once — the wpt corpus is far larger than
// one `evaluate` argument should carry.
const BATCH = 150;
// Documents one page parses before it is replaced. Each stays in memory until
// the page goes, and a page costs 58ms — so this trades one page per few
// hundred files against a renderer holding the whole corpus.
const PAGE_DOCUMENTS = 500;
// What one file gets, and what one batch's CDP call gets with it. A file is
// compared in milliseconds, so this is orders above what any needs: generous
// enough never to fail a slow runner, small enough that every file which hangs
// is named in one run rather than one per quarter hour.
const FILE_TIMEOUT = 180000;
// One declaration, bounded here rather than by jest — which is what lets the
// page be replaced before the next one runs. A declaration costs a
// millisecond, so this is three orders above what it needs.
const VALUE_BUDGET = 2000;

// Documents and stylesheets the printers are known to get wrong, per corpus.
// Each is a filed defect, not a tolerated one; every comparison matches its set
// exactly, so an entry outlives its defect by one run.
const FILED_CONFIG_CSS_DEFECTS = new Map();

const FILED_CONFIG_HTML_DEFECTS = new Map();

const FILED_WPT_HTML_DEFECTS = new Map([
	[
		"test/wpt/html/syntax/parsing/misnested-form-in-template.html",
		"not a printer defect: the form pointer is not set inside a `<template>`, which this test asserts and Chromium has not implemented — webpack prints the tree wpt expects"
	]
]);

const FILED_WPT_CSS_DEFECTS = new Map();

// The same, for what webpack's own parser sees over the whole corpus.
const FILED_WPT_TREE_DEFECTS = new Map();

// Declarations Chromium computes a different style from once printed, keyed by
// the value as written. A printer defect unless the reason says otherwise.
const FILED_WPT_VALUE_DEFECTS = new Map();

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
// A fixture names the minimizer options its own claim is about, so the engine
// is held to the option the file exists to cover.
const CSSOM_DIRECTIVE = /\/\*\s*cssom:([^*]*)\*\//;

/**
 * @param {string} source the stylesheet as written
 * @returns {string[]} the options its `cssom:` note names, empty when it has none
 */
const cssomDirective = (source) => {
	const found = CSSOM_DIRECTIVE.exec(source);
	return found === null
		? []
		: found[1]
				.trim()
				.split(/[\s,]+/)
				.filter(Boolean);
};

const minifyCss = (source) => {
	/** @type {{ mode: string, [k: string]: EXPECTED_ANY }} */
	const options = { mode: "minify" };
	for (const name of cssomDirective(source)) options[name] = true;
	return /** @type {{ code: string }} */ (
		new CssSourceProcessor().process(source, options)
	).code;
};

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

/**
 * @param {Fixture[]} sources pages, read once
 * @param {object} options extra print options
 * @returns {Fixture[]} the same pages, printed with them
 */
const variant = (sources, options) =>
	sources.map((one) => ({ ...one, min: minifyHtml(one.raw, options) }));

/**
 * Every corpus, built while jest collects — one test per fixture means the
 * names are needed before anything can be awaited.
 * @returns {Corpus[]} the corpora, `wpt` last and only when it is checked out
 */
const buildCorpora = () => {
	const configHtml = buildCorpus(CONFIG_CASES, ".html", (source) => source);
	const configCss = buildCorpus(CONFIG_CASES, ".css", minifyCss);
	/** @type {Corpus[]} */
	const built = [
		{
			label: "configCases",
			html: variant(configHtml, {}),
			// `removeImpliedTags` leaves out a tag the parser puts back, so it is
			// the one option whose whole claim is that the DOM does not notice.
			htmlAllImpliedTags: variant(configHtml, { removeImpliedTags: true }),
			htmlSmartTags: variant(configHtml, { removeImpliedTags: "smart" }),
			css: configCss,
			filedHtml: FILED_CONFIG_HTML_DEFECTS,
			filedCss: FILED_CONFIG_CSS_DEFECTS
		}
	];
	if (!hasCorpus()) return built;
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
	built.push({
		label: "wpt",
		html: variant(wptHtml, {}),
		htmlAllImpliedTags: variant(wptHtml, { removeImpliedTags: true }),
		htmlSmartTags: variant(wptHtml, { removeImpliedTags: "smart" }),
		css: wptCss,
		filedHtml: FILED_WPT_HTML_DEFECTS,
		filedCss: FILED_WPT_CSS_DEFECTS
	});
	return built;
};

const corpora = buildCorpora();

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
	/** @type {import("puppeteer-core").Page | undefined} the corpus tiers' page */
	let page;
	/** @type {number} documents the current page has been asked to parse */
	let parsed = 0;

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

	/**
	 * The corpus tiers' page, replaced once it holds enough. Every document it
	 * parses stays in memory until it goes, and one page per test would cost more
	 * than the tests do: opening one takes 58ms, comparing one document takes far
	 * less.
	 * @param {number} documents how many it is about to parse
	 * @returns {Promise<import("puppeteer-core").Page>} the page to compare on
	 */
	const pageFor = async (documents) => {
		if (page === undefined || parsed + documents > PAGE_DOCUMENTS) {
			if (page !== undefined) await page.close();
			page = await freshPage();
			parsed = 0;
		}
		parsed += documents;
		return page;
	};

	beforeAll(async () => {
		browser = await launchChrome({ protocolTimeout: FILE_TIMEOUT });
		// The probing tiers set a property on one element and read it back, leaving
		// nothing behind, so they share a page — at 58ms to open one and 1ms to
		// call into it, a page per test would cost more than the tests do.
		probePage = await freshPage();
	}, 300000);

	afterAll(async () => {
		if (page) await page.close();
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
		// Both forms of every page, so the page is replaced before it holds more
		// documents than one should.
		const active = await pageFor(cases.length * 2);
		/** @type {{ name: string, why: string }[]} */
		const differences = [];
		for (let at = 0; at < cases.length; at += BATCH) {
			const collected = await active.evaluate(
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
				active,
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
					// Only an element's own shape carries a number the printer rounds;
					// everything else is text, compared exactly as it is written.
					const rounded = facet === "elements";
					const found = a.findIndex((entry, i) =>
						rounded ? !numericallyEqual(entry, b[i]) : entry !== b[i]
					);
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

	/**
	 * Every stylesheet in `cases`, compared as the engine parses it.
	 * @param {Fixture[]} cases the corpus
	 * @returns {Promise<{ name: string, why: string }[]>} what moved, per sheet
	 */
	const compareStylesheets = async (cases) => {
		const active = await pageFor(cases.length * 2);
		const collected = await inBatches(active, cases, (batch) =>
			active.evaluate((sheets) => {
				const { cssRules } = /** @type {{ __eq: PageHelpers }} */ (
					/** @type {unknown} */ (window)
				).__eq;
				return sheets.map((each) => ({
					name: each.name,
					before: cssRules(each.raw),
					after: cssRules(each.min)
				}));
			}, batch)
		);
		const signatures = await conditionSignatures(
			active,
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
		return differences;
	};

	/**
	 * What a fixture is expected to differ on: the file itself when a defect is
	 * filed against it, nothing otherwise. Filed both ways, so a defect that has
	 * been fixed fails too — which is what takes its entry back out.
	 * @param {Map<string, string>} filed the tier's filed defects
	 * @param {string} name the fixture
	 * @returns {string[]} what `differences` must name
	 */
	const expected = (filed, name) => (filed.has(name) ? [name] : []);

	/**
	 * The differences as the assertion names them, one with no filed defect
	 * carrying its reason: a log of files alone needs a second run to read.
	 * @param {{ name: string, why: string }[]} differences what differed
	 * @param {Map<string, string>} filed the tier's filed defects
	 * @returns {string[]} the names, each unexpected one carrying its reason
	 */
	const named = (differences, filed) =>
		differences.map((each) =>
			filed.has(each.name) ? each.name : `${each.name}: ${each.why}`
		);

	const describeCorpus = (at, label) => {
		describe(label, () => {
			if (at === 1 && !hasCorpus()) {
				it(NO_CORPUS, () => {
					// No-op: the corpus is an optional git submodule.
				});

				return;
			}
			const one = corpora[at];

			// One test per page, not per corpus: the file is what a defect is filed
			// against, so a failure names it without anything having to narrow it
			// down. Every part of the document the engine builds — the element tree,
			// the rendered text, the comments, the doctype, the CSS, JSON and script
			// bodies carried inside it, and the CSSOM of every stylesheet it carries
			// — must survive minification.
			for (const fixture of one.html) {
				it(
					`should build the same DOM and CSSOM from ${fixture.name}`,
					async () => {
						const differences = await comparePages([fixture], true);
						expect(named(differences, one.filedHtml)).toEqual(
							expected(one.filedHtml, fixture.name)
						);
					},
					FILE_TIMEOUT
				);
			}

			it.each([
				["true", (/** @type {Corpus} */ c) => c.htmlAllImpliedTags],
				["smart", (/** @type {Corpus} */ c) => c.htmlSmartTags]
			])(
				"should build the same DOM and CSSOM with removeImpliedTags %s",
				async (_mode, pick) => {
					// The tags this leaves out are the ones the parser puts back, so the
					// tree it builds — every element's depth in it, and the CSSOM of what
					// it carries — is untouched. Grouped: what these vary is the option,
					// not the file, and the tier above already names the file.
					const differences = await comparePages(pick(one), true);
					expect(differences.map((each) => each.name).sort()).toEqual(
						[...one.filedHtml.keys()].sort()
					);
				},
				1800000
			);

			// The same rules, in the same cascade order, under conditions the engine
			// answers alike, each computing to the same style.
			for (const fixture of one.css) {
				it(
					`should build the same CSSOM from ${fixture.name}`,
					async () => {
						const differences = await compareStylesheets([fixture]);
						expect(named(differences, one.filedCss)).toEqual(
							expected(one.filedCss, fixture.name)
						);
					},
					FILE_TIMEOUT
				);
			}

			// A `)` inside a quoted `url()` belongs to the address, so the scan for
			// the call's end must not stop there and read a color out of the rest.
			it(
				"reads no color out of a quoted url() body",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "quoted-url-fragment",
							raw: '.a{--u:url("assets/)#fff")}',
							min: '.a{--u:url("assets/)#ffffff")}'
						}
					]);
					expect(differences).toEqual([
						{
							name: "quoted-url-fragment",
							why: 'rule 0:  .a { --u:url("assets/)#fff") } vs  .a { --u:url("assets/)#ffffff") }'
						}
					]);
				},
				FILE_TIMEOUT
			);

			// The rules are read layer by layer, and an `@layer` statement is what
			// fixes those layers' order — so the same blocks written the other way
			// round under one are the same sheet, wherever each block stands.
			it(
				"should read blocks under one layer statement in its order",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "layer-statement",
							raw: "@layer reset,components;@layer components{.x{color:blue}}@layer reset{.x{color:red}}",
							min: "@layer reset,components;@layer reset{.x{color:red}}@layer components{.x{color:blue}}"
						}
					]);
					expect(differences).toEqual([]);
				},
				FILE_TIMEOUT
			);

			// A defect filed against a file no longer in the corpus is one nothing
			// would report, since the test that carried it is gone with the file.
			it("should file every defect against a fixture that is still there", () => {
				const html = new Set(one.html.map((each) => each.name));
				const css = new Set(one.css.map((each) => each.name));
				expect([
					...[...one.filedHtml.keys()].filter((name) => !html.has(name)),
					...[...one.filedCss.keys()].filter((name) => !css.has(name))
				]).toEqual([]);
			});
		});
	};

	describeCorpus(0, "configCases");
	describeCorpus(1, "wpt");

	// One test per declaration, not per file: the value is what a defect is filed
	// against, so the run names it without anything having to narrow it down.
	/** @type {{ name: string, property: string, key: string, raw: string, min: string }[]} */
	const declarations = [];
	/** @type {number} every declaration the corpus holds, compared or not */
	let declarationsRead = 0;
	for (const { property, value, name } of hasCorpus()
		? cssDeclarations()
		: []) {
		declarationsRead++;
		const min = minifyDeclaration(property, value);
		// A value the printer copied out is compared against itself, which the
		// engine answers the same way twice by construction. Three quarters of
		// the corpus is that, and reading one back is not free: the one value
		// that hangs Chrome is invalid CSS the printer never touched.
		if (min === value) continue;

		declarations.push({
			name,
			property,
			key: `${property}:${value}`,
			raw: value,
			min
		});
	}
	/** @type {Set<string>} every value that moved, filled as the files run */
	const movedValues = new Set();

	const compareValues = (cases) =>
		inBatches(probePage, cases, (batch) =>
			probePage.evaluate((each) => {
				const { canonical } = /** @type {{ __eq: PageHelpers }} */ (
					/** @type {unknown} */ (window)
				).__eq;
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
						// Under the one name the spec gives the value: the engine echoes
						// the spelling it was handed — `jump-start` beside `start`, a
						// gradient's implied last stop beside a written one — so without
						// this the tier reads a synonym as a change of meaning.
						out += `${name}:${canonical(
							computed.getPropertyValue(name)
						)}\u0000`;
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

	if (!hasCorpus()) {
		it(NO_CORPUS, () => {
			// No-op: the corpus is an optional git submodule.
		});
	} else {
		// The tier compares what the printer rewrites, so a printer that rewrote
		// nothing would leave it with no work and still pass. Bounds well under
		// today's 8,785 read and 2,198 compared, to fail on that rather than on
		// the corpus growing or the printer touching a few values more or less.
		it("should have a corpus the printer rewrites a share of", () => {
			expect(declarationsRead).toBeGreaterThan(5000);
			expect(declarations.length).toBeGreaterThan(1000);
		});
	}

	for (const one of declarations) {
		it(
			`should compute the same style from ${one.property}: ${one.raw} in ${one.name}`,
			async () => {
				for (const moved of await compareWithin([one], VALUE_BUDGET)) {
					movedValues.add(moved.key);
				}
			},
			FILE_TIMEOUT
		);
	}

	// Runs last, so every value has reported. Includes the values the spec
	// rejects: an invalid declaration moves nothing, so one whose printed form
	// does is one the printer brought to life.
	if (declarations.length > 0) {
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
