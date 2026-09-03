"use strict";

// Both printers held to what an engine makes of their output, over `configCases`
// and `test/wpt` alike, through the one path in `helpers/syntaxEquivalence`.
// Nothing is compared as text where the engine can be asked instead. A third
// tier needs no engine and so reads the whole corpus: webpack's own parser is a
// DOM oracle, held to that corpus's expected trees by html5lib.spectest.js.

const path = require("path");
const {
	SourceProcessor: CssSourceProcessor,
	readToken
} = require("../lib/css/syntax");
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
	WPT,
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
// Keyed `"<mode> <document>"`, so filing one print mode leaves the other held.
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
 * @param {string} source HTML
 * @returns {string} the same document, beautified
 */
const beautifyHtml = (source) =>
	/** @type {{ code: string }} */ (
		new HtmlSourceProcessor().process(source, { mode: "beautify" })
	).code;

/** @type {[string, (source: string) => string][]} both printing modes */
const PRINT_MODES = [
	["minify", (source) => minifyHtml(source)],
	["beautify", beautifyHtml]
];

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
	// Read from the comments alone: the same text inside a string is a value the
	// fixture prints, not a note about how to minify it.
	for (let at = 0; at < source.length; at++) {
		const ch = source[at];
		if (ch === '"' || ch === "'") {
			for (at++; at < source.length; at++) {
				if (source[at] === "\\") at++;
				else if (source[at] === ch) break;
			}
			continue;
		}
		// `/*` inside an unquoted `url()` is part of the address, not a comment.
		if (/^url\(/i.test(source.slice(at, at + 4))) {
			at += 3;
			let quote = "";
			while (/[\t\n\f\r ]/.test(source[at + 1] || "")) at++;
			const opens = source[at + 1];
			if (opens === '"' || opens === "'") quote = opens;
			if (quote === "") {
				for (at += 1; at < source.length; at++) {
					if (source[at] === "\\") at++;
					else if (source[at] === ")") break;
				}
			}
			continue;
		}
		if (ch !== "/" || source[at + 1] !== "*") continue;
		const close = source.indexOf("*/", at + 2);
		const found = CSSOM_DIRECTIVE.exec(
			source.slice(at, close === -1 ? source.length : close + 2)
		);
		if (found !== null) {
			return found[1]
				.trim()
				.split(/[\s,]+/)
				.filter(Boolean);
		}
		if (close === -1) break;
		at = close + 1;
	}
	return [];
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

			// A `)` inside a quoted `url()` belongs to the address; one met after an
			// illegal quote ends the bad url, and the rest is a color again.
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

			// CSS Syntax 4.3.6: the quote is a parse error, and recovery ends the url
			// at the next `)`, so the hex after it is read as the color it is.
			it(
				"ends a bad url() at the paren its recovery reaches",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "bad-url-fragment",
							raw: '.a{--u:url(foo")#fff)}',
							min: '.a{--u:url(foo")#ffffff)}'
						}
					]);
					expect(differences).toEqual([]);
				},
				FILE_TIMEOUT
			);

			// CSS Syntax 4.2 counts five code points as whitespace, and U+00A0 is not
			// one: it opens no quoted body, so the quote after it ends a bad url.
			it(
				"skips no non-breaking space before a url() body",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "nbsp-url-fragment",
							raw: '.a{--u:url(\u00A0"foo)#fff")}',
							min: '.a{--u:url(\u00A0"foo)#ffffff")}'
						}
					]);
					expect(differences).toEqual([]);
				},
				FILE_TIMEOUT
			);

			// `/*` inside an unquoted `url()` is the address, so a fixture whose url
			// spells one out is naming no option.
			it("reads no cssom note out of a url() body", () => {
				expect(
					cssomDirective(
						"a{background:url(/*cssom:rewriteCustomProperties*/x)}"
					)
				).toEqual([]);
				expect(
					cssomDirective("/* cssom: rewriteCustomProperties */a{color:red}")
				).toEqual(["rewriteCustomProperties"]);
			});

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
				const { canonical, paintedColors } =
					/** @type {{ __eq: PageHelpers }} */ (/** @type {unknown} */ (window))
						.__eq;
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
						// Under the one name the spec gives the value, its colors painted:
						// the engine echoes the spelling it was handed — `jump-start`
						// beside `start`, the color `image()` carries — so without this
						// the tier reads a synonym as a change of meaning.
						out += `${name}:${paintedColors(
							canonical(computed.getPropertyValue(name))
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
// Both print modes run — beautifying is where the round-trip fallback lives, so
// the corpus is the only thing holding it to real documents.
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
		it(`should build the same tree from ${group} and its printed forms`, () => {
			/** @type {{ name: string, why: string }[]} */
			const differences = [];
			for (const file of files) {
				const source = readDocument(file);
				if (source === null) continue;
				const before = domShapeOf(source);
				for (const [mode, print] of PRINT_MODES) {
					const why = whatMoved(before, domShapeOf(print(source)));
					if (why === "") continue;
					// Keyed by mode too: a file filed for one says nothing about the
					// other, and exempting both hides half of what this tier catches.
					const name = `${mode} ${nameOf(file)}`;
					diverging.add(name);
					if (!FILED_WPT_TREE_DEFECTS.has(name)) {
						differences.push({ name, why });
					}
				}
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

// css-syntax §serialization lists the token pairs that re-tokenize when written
// together, so dropping the whitespace between them has to leave a separator.
describe("wpt css token adjacency", () => {
	const table = path.resolve(
		WPT,
		"css/css-syntax/serialize-consecutive-tokens.html"
	);

	/**
	 * @param {string} css a stylesheet
	 * @returns {string} its tokens, whitespace and comments dropped
	 */
	const significantTokens = (css) => {
		/** @type {string[]} */
		const out = [];
		for (let pos = 0; ;) {
			const token = readToken(
				css,
				pos,
				/** @type {import("../lib/css/syntax").MutableToken} */ ({})
			);
			if (token === undefined) break;
			pos = token.end;
			const text = css.slice(token.start, token.end);
			if (text.trim() === "" || text.startsWith("/*")) continue;
			out.push(`${token.type}:${text}`);
		}
		return out.join(" ");
	};

	if (!hasCorpus()) {
		it(NO_CORPUS, () => {
			// No-op: the corpus is an optional git submodule.
		});

		return;
	}

	const pairs = [
		...readDocument(table).matchAll(/testTokenPairs\("([^"]*)",\s*"([^"]*)"\)/g)
	].map((match) => [match[1], match[2]]);

	// The table is read out of a test file, so an extraction that silently found
	// nothing would report green over no cases at all.
	it("should read the table", () => {
		expect(pairs.length).toBeGreaterThan(50);
	});

	it("should keep every listed pair apart once minified", () => {
		/** @type {{ pair: string, minified: string }[]} */
		const fused = [];
		for (const [first, second] of pairs) {
			const source = `a{b:${first} ${second}}`;
			const minified = minifyCss(source);
			if (significantTokens(minified) !== significantTokens(source)) {
				fused.push({ pair: `${first} ${second}`, minified });
			}
		}
		expect(fused).toEqual([]);
	});
});

// What a lowering is held to: an engine that reads both spellings computes the
// same style from either. The engine here reads every modern spelling, so a
// fallback pair resolves to the author's own and a rewrite has to land on it.
// A lowering that changes the computed value on purpose names the properties it
// changes, with the reason — nothing is compared as text.
/**
 * @typedef {object} LoweringFixture
 * @property {string} name what it lowers
 * @property {string} css the stylesheet
 * @property {string[]} browsers the selection that turns the lowering on
 * @property {string} html the document the probes are read from
 * @property {[string, string][]} probes selector and the property to read
 * @property {string[]=} schemes the color schemes to read it under
 * @property {string[]=} directions the writing directions to read it under
 * @property {string[]=} differs properties this lowering changes on purpose
 * @property {string[]=} numeric properties whose value the rewrite reaches by arithmetic, held to `numericallyEqual` rather than to the same text
 * @property {string[]} produces text the rewrite leaves, so a comparison of two sheets neither of which was rewritten cannot pass for one
 * @property {string=} reference what the source means, where the engine reads no spelling of it — `:lang(en, fr)` is one Chromium has never taken, so the rewrite is held to the pair of rules that state the same thing rather than to an engine's reading of the original
 */
/** @type {LoweringFixture[]} */
const LOWERING_FIXTURES = [
	{
		name: "light-dark()",
		produces: [
			"var(--webpack-light,#aaa) var(--webpack-dark,#444)",
			":where(:root){--webpack-light:initial",
			"@media (prefers-color-scheme:dark){html{"
		],
		css:
			"html{color-scheme:light dark}html[dir=rtl]{color-scheme:dark}" +
			".panel{color-scheme:dark}" +
			"button{background-color:light-dark(#aaa,#444);color:light-dark(red,blue)}",
		browsers: ["chrome 100"],
		html: "<button id=b>x</button><div class=panel><button id=c>y</button></div>",
		probes: [
			["#b", "background-color"],
			["#b", "color"],
			["#c", "background-color"],
			["#c", "color"]
		],
		schemes: ["light", "dark"],
		directions: ["ltr", "rtl"]
	},
	{
		name: "light-dark() with no color-scheme, which is the light one",
		produces: ["var(--webpack-light,#aaa)", ":where(:root){"],
		css: "button{background-color:light-dark(#aaa,#444)}",
		browsers: ["chrome 100"],
		html: "<button id=b>x</button>",
		probes: [["#b", "background-color"]],
		schemes: ["light", "dark"]
	},
	{
		name: "a color the target cannot read, and the gamut rung before it",
		produces: ["color:#ff0704;color:color(display-p3"],
		css:
			"#b{color:oklch(.6322 .2577 29.23);background-color:lab(40% 56.6 39);" +
			"border-top-color:hwb(120 20% 30%);outline-color:color(a98-rgb .44091 .49971 .37408)}",
		browsers: ["safari 15"],
		html: "<button id=b>x</button>",
		probes: [
			["#b", "color"],
			["#b", "background-color"],
			["#b", "border-top-color"],
			["#b", "outline-color"]
		]
	},
	{
		name: "...and the same colors for a target that reads none of them",
		css:
			"#b{color:oklch(.6322 .2577 29.23);background-color:lab(40% 56.6 39);" +
			"border-top-color:hwb(120 20% 30%);outline-color:color(a98-rgb .44091 .49971 .37408)}",
		browsers: ["chrome 100"],
		produces: [
			"color:#ff0704;color:oklch(",
			"background-color:#b32323;background-color:lab(",
			"border-top-color:#33b333",
			"outline-color:#6a805d"
		],
		html: "<button id=b>x</button>",
		probes: [
			["#b", "color"],
			["#b", "background-color"],
			["#b", "border-top-color"],
			["#b", "outline-color"]
		]
	},
	{
		name: "a color-mix() and a relative color",
		produces: ["color:#706a43", "background-color:#669"],
		css:
			"#b{color:color-mix(in hsl,hsl(120deg 10% 20%) 25%,hsl(30deg 30% 40%));" +
			"background-color:rgb(from rebeccapurple r calc(g * 2) b)}",
		browsers: ["chrome 130"],
		html: "<button id=b>x</button>",
		probes: [
			["#b", "color"],
			["#b", "background-color"]
		]
	},
	{
		name: "a hex alpha, a media range and a two-position color stop",
		produces: [
			"rgba(123,255,255,.5)",
			"red 30%,red 40%",
			"(min-width:480px) and (max-width:768px)",
			"(min-width:1px)"
		],
		css:
			"#b{color:#7bffff80;background-image:linear-gradient(green,red 30% 40%,pink)}" +
			"@media (480px<=width<=768px){#b{outline-color:red}}" +
			"@media (width>=1px){#b{border-top-color:red}}",
		browsers: ["chrome 50"],
		html: "<button id=b>x</button>",
		probes: [
			["#b", "color"],
			["#b", "background-image"],
			["#b", "outline-color"],
			["#b", "border-top-color"]
		]
	},
	{
		name: "the shorthands the target does not have",
		produces: [
			"align-items:center;justify-items:start",
			"overflow-x:hidden;overflow-y:auto",
			"top:1px",
			"display:inline-flex",
			"text-decoration-thickness:2px"
		],
		css:
			"#b{place-items:center start;overflow:hidden auto;inset:1px 2px;" +
			"display:inline flex;text-decoration:underline 2px dotted red}",
		browsers: ["chrome 50"],
		html: "<button id=b>x</button>",
		probes: [
			["#b", "align-items"],
			["#b", "justify-items"],
			["#b", "overflow-x"],
			["#b", "overflow-y"],
			["#b", "top"],
			["#b", "left"],
			["#b", "display"],
			["#b", "text-decoration-line"],
			["#b", "text-decoration-style"],
			["#b", "text-decoration-color"],
			["#b", "text-decoration-thickness"]
		]
	},
	{
		name: "a matrix transform and a grid template",
		produces: ["translate(100px,200px)", '"foot ."'],
		css:
			"#b{transform:matrix(1,0,0,1,100,200)}" +
			'#c{display:grid;grid-template-areas:"head head" "foot ...."}',
		browsers: ["chrome 130"],
		html: "<button id=b>x</button><div id=c></div>",
		probes: [
			["#b", "transform"],
			["#c", "grid-template-areas"]
		]
	},
	{
		name: "a `:not()` holding a list the target does not take",
		css: "p:not(:first-child,.lead){color:rgb(4,5,6)}",
		browsers: ["firefox 80"],
		produces: [":not(:is(:first-child,.lead))"],
		html: "<div><p id=p1>a</p><p id=p2 class=lead>b</p><p id=p3>c</p></div>",
		probes: [
			["#p1", "color"],
			["#p2", "color"],
			["#p3", "color"]
		]
	},
	{
		name: "a `:lang()` holding one, which no Chromium has ever taken",
		css: "a:lang(en,fr){color:rgb(1,2,3)}",
		reference: "a:lang(en),a:lang(fr){color:rgb(1,2,3)}",
		browsers: ["firefox 80"],
		produces: [":is(:lang(en),:lang(fr))"],
		html: "<a id=en lang=en>x</a><a id=fr lang=fr>x</a><a id=de lang=de>x</a>",
		probes: [
			["#en", "color"],
			["#fr", "color"],
			["#de", "color"]
		]
	},
	{
		name: "a slot holding the value an unwritten one takes",
		css:
			"#b{background:0% 0% / auto repeat scroll padding-box border-box red;" +
			"border-left:currentcolor medium none;column-rule:medium none red;" +
			"outline:medium none currentcolor;text-decoration:none currentcolor solid auto}" +
			"#c{background:left top url(data:image/gif;base64,R0lGODlhAQABAAAAACw=)}" +
			"#d{mask:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=) border-box}",
		browsers: ["chrome 130"],
		produces: ["background:red", "border-left:none", "column-rule:red"],
		html: "<button id=b>x</button><div id=c></div><div id=d></div>",
		probes: [
			["#b", "background-position"],
			["#b", "background-size"],
			["#b", "background-repeat"],
			["#b", "background-attachment"],
			["#b", "background-origin"],
			["#b", "background-clip"],
			["#b", "background-color"],
			["#b", "background-image"],
			["#b", "border-left-width"],
			["#b", "border-left-style"],
			["#b", "border-left-color"],
			["#b", "column-rule-width"],
			["#b", "column-rule-style"],
			["#b", "column-rule-color"],
			["#b", "outline-width"],
			["#b", "outline-style"],
			["#b", "outline-color"],
			["#b", "text-decoration-line"],
			["#b", "text-decoration-style"],
			["#b", "text-decoration-color"],
			["#b", "text-decoration-thickness"],
			["#c", "background-position"],
			["#c", "background-image"],
			["#d", "mask-origin"],
			["#d", "mask-clip"],
			["#d", "mask-image"]
		]
	},
	{
		name: "a math function folded to the value it names",
		css:
			"#b{width:calc(sqrt(2)*100px);height:calc(sin(45deg)*100px);" +
			"margin-left:calc(.1px + .2px);margin-right:calc(100px/7);" +
			"padding-left:calc(pi*10px);padding-right:calc(exp(1)*10px);" +
			"border-top-width:calc(hypot(3px,4px));top:calc(1cm + 1px);" +
			"left:calc(log(8,2)*10px);right:calc(pow(2,10)*.01px)}",
		browsers: ["chrome 130"],
		produces: ["width:141.421px", "height:70.7107px", "margin-left:.3px"],
		html: '<button id=b style="position:absolute">x</button>',
		probes: [
			["#b", "width"],
			["#b", "height"],
			["#b", "margin-left"],
			["#b", "margin-right"],
			["#b", "padding-left"],
			["#b", "padding-right"],
			["#b", "border-top-width"],
			["#b", "top"],
			["#b", "left"],
			["#b", "right"]
		],
		// The engine computes the expression at full precision and serializes what
		// it computed; the printer writes the six significant digits a stylesheet
		// can observe. So these are held to `numericallyEqual` — the same relative
		// 1e-5 the rounding itself rests on, under Chromium's 1/64px layout grid —
		// rather than to the same text.
		numeric: [
			"width",
			"height",
			"margin-right",
			"padding-left",
			"padding-right",
			"top",
			"right"
		]
	},
	{
		name: "a color computed rather than painted, kept as it was written",
		// A gradient interpolates between its stops and a mix mixes its two, so the
		// byte an engine paints is not what either computes from. The probes read
		// the mixes; the gradient is here for the printer to leave alone.
		css:
			"#b{color:color-mix(in srgb,hsl(209.32 16.5% 53.41%) 20%,red);" +
			"background-color:color-mix(in hsl,#ff0 12%,#808080);" +
			"border-top-color:color-mix(in hwb,#ff0 12%,#808080);" +
			"outline-color:color-mix(in hsl,#ff0 12%,#000);" +
			"text-decoration-color:color-mix(in oklch,oklch(70% .3 30),oklch(50% .2 250));" +
			"background-image:linear-gradient(hsl(209.32 16.5% 53.41%),red)}",
		browsers: ["chrome 130"],
		produces: ["background-color:#8f8f71", "color:#e31b1f"],
		html: '<button id=b style="position:absolute">x</button>',
		probes: [
			["#b", "color"],
			["#b", "background-color"],
			["#b", "border-top-color"],
			["#b", "outline-color"],
			["#b", "text-decoration-color"],
			["#b", "background-image"]
		]
	},
	{
		name: "a color() converted only as far as the byte is the engine's own",
		css:
			"#b{color:color(srgb .2 .4 .6);" +
			"background-color:color(display-p3 .05 .06 .07);" +
			"border-top-color:color(a98-rgb .5 .5 .5);" +
			"outline-color:color(prophoto-rgb .5 .5 .5);" +
			"text-decoration-color:color(srgb-linear .2 .4 .6);" +
			"caret-color:color(display-p3 .6 .7 .8)}",
		browsers: ["chrome 130"],
		produces: ["color:#369", "background-color:#0c0f12"],
		html: '<button id=b style="position:absolute">x</button>',
		probes: [
			["#b", "color"],
			["#b", "background-color"],
			["#b", "border-top-color"],
			["#b", "outline-color"],
			["#b", "text-decoration-color"],
			["#b", "caret-color"]
		]
	},
	{
		name: "system-ui, which names each platform's own font instead",
		produces: ["-apple-system,BlinkMacSystemFont"],
		css: "#b{font-family:system-ui}#c{font:italic 700 12px/1.2 system-ui,serif}",
		browsers: ["chrome 50"],
		html: "<button id=b>x</button><button id=c>y</button>",
		probes: [
			["#b", "font-family"],
			["#c", "font-family"],
			["#c", "font-size"],
			["#c", "font-style"]
		],
		// The stack *is* the rewrite: `system-ui` leads it, so an engine reading
		// the keyword still takes it, and the rest is what one that does not reads.
		differs: ["font-family"]
	}
];

describe("a lowering computes as the spelling it replaces", () => {
	/** @type {import("puppeteer-core").Browser} */
	let browser;

	beforeAll(async () => {
		browser = await launchChrome({ protocolTimeout: FILE_TIMEOUT });
	}, 300000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	/**
	 * Every probe's computed value under one stylesheet.
	 * @param {import("puppeteer-core").Page} page the page to read from
	 * @param {string} css the stylesheet
	 * @param {string} html the document
	 * @param {[string, string][]} probes selector and property
	 * @returns {Promise<string[]>} the values, in the probes' order
	 */
	const readComputed = (page, css, html, probes) =>
		page.setContent(`<style>${css}</style>${html}`).then(() =>
			page.evaluate((asked) => {
				// A color is compared as painted rather than as text: the engine
				// keeps a mix at the precision it computed, while the printer writes
				// the byte it lands on — which is the trade every color rewrite here
				// already makes, and the pixel is what a reader sees of it.
				const canvas = document.createElement("canvas");
				const context = /** @type {CanvasRenderingContext2D} */ (
					canvas.getContext("2d", { willReadFrequently: true })
				);
				return asked.map(([selector, property]) => {
					const element = document.querySelector(selector);
					if (element === null) return "no such element";
					const value = getComputedStyle(element).getPropertyValue(property);
					context.fillStyle = "#000";
					context.fillStyle = value;
					// Anything the canvas does not read as one color keeps its text.
					if (context.fillStyle === "#000" && !/^#0{3,8}$/i.test(value)) {
						return value;
					}
					context.clearRect(0, 0, 1, 1);
					context.fillRect(0, 0, 1, 1);
					return [...context.getImageData(0, 0, 1, 1).data].join(",");
				});
			}, probes)
		);

	it.each(LOWERING_FIXTURES.map((fixture) => [fixture.name, fixture]))(
		"%s",
		async (_name, fixture) => {
			const lowered = new CssSourceProcessor().process(fixture.css, {
				mode: "minify",
				environment: { browsers: fixture.browsers }
			}).code;
			// The rewrite has to have happened, or the comparison proves nothing.
			for (const written of fixture.produces) {
				expect(lowered).toContain(written);
			}
			const asked = fixture.probes.filter(
				([, property]) => !(fixture.differs || []).includes(property)
			);
			const approximate = new Set(fixture.numeric || []);
			const page = await browser.newPage();
			try {
				for (const scheme of fixture.schemes || ["light"]) {
					await page.emulateMediaFeatures([
						{ name: "prefers-color-scheme", value: scheme }
					]);
					for (const direction of fixture.directions || ["ltr"]) {
						const html = `<script>document.documentElement.dir=${JSON.stringify(
							direction
						)}</script>${fixture.html}`;
						const before = await readComputed(
							page,
							fixture.reference || fixture.css,
							html,
							asked
						);
						const after = await readComputed(page, lowered, html, asked);
						// A probe the rewrite reaches by arithmetic is held to the
						// tolerance the rounding rests on; every other one to the byte.
						const held = after.map((value, at) =>
							approximate.has(asked[at][1]) &&
							numericallyEqual(before[at], value)
								? before[at]
								: value
						);
						expect({ scheme, direction, computed: held }).toEqual({
							scheme,
							direction,
							computed: before
						});
					}
				}
			} finally {
				await page.close();
			}
		},
		FILE_TIMEOUT
	);
});

// Every color spelling a stylesheet can hold, in the shapes a rewrite reads them
// through: a color of its own, one a mix or a relative reference computes with,
// and one nested a level deeper.
const COLOR_SPACES = [
	"srgb",
	"srgb-linear",
	"display-p3",
	"a98-rgb",
	"prophoto-rgb",
	"rec2020",
	"xyz",
	"xyz-d50",
	"xyz-d65"
];
const MIX_SPACES = [
	"srgb",
	"hsl",
	"hwb",
	"lab",
	"lch",
	"oklab",
	"oklch",
	"display-p3"
];
const RELATIVE_CHANNELS = {
	rgb: "r calc(g * 1.2) b",
	// A hue keyword substitutes as the number it names, so the arithmetic over
	// one is read in degrees — which these carry into the sweep.
	hsl: "calc(h + 40) s calc(l * .9)",
	hwb: "h w b",
	lab: "calc(l * 1.1) a b",
	lch: "l c calc(h * 2)",
	oklab: "l a calc(b * .8)",
	oklch: "calc(l * .95) c calc(h - 30)"
};
// The seed is what makes the corpus the same one every run; the count is what
// the browser reads back in one batch of a few seconds.
const COLOR_SAMPLES = 20000;

describe("a color rewrite paints as the color it replaced", () => {
	/** @type {import("puppeteer-core").Browser} */
	let browser;

	beforeAll(async () => {
		browser = await launchChrome({ protocolTimeout: FILE_TIMEOUT });
	}, FILE_TIMEOUT);

	afterAll(async () => {
		if (browser !== undefined) await browser.close();
	});

	/**
	 * One color, in a spelling drawn from the seeded sequence.
	 * @param {() => number} random the sequence
	 * @param {number} depth how many levels of mix or relative reference are left
	 * @returns {string} the color as written
	 */
	const spell = (random, depth) => {
		const number = (max, digits) => (random() * max).toFixed(digits);
		const pick = random();
		if (pick < 0.12) {
			return `#${Math.floor(random() * 0xffffff)
				.toString(16)
				.padStart(6, "0")}`;
		}
		if (pick < 0.2) {
			return `rgb(${number(255, 1)} ${number(255, 1)} ${number(255, 1)})`;
		}
		if (pick < 0.28) {
			return `hsl(${number(360, 2)} ${number(100, 2)}% ${number(100, 2)}%)`;
		}
		if (pick < 0.34) {
			return `hwb(${number(360, 2)} ${number(60, 2)}% ${number(60, 2)}%)`;
		}
		if (pick < 0.44) {
			return `lab(${number(100, 4)}% ${number(200, 4) - 100} ${number(200, 4) - 100})`;
		}
		if (pick < 0.54) {
			return `lch(${number(100, 4)}% ${number(140, 4)} ${number(360, 3)})`;
		}
		if (pick < 0.64) {
			return `oklab(${number(1, 6)} ${number(0.8, 6) - 0.4} ${number(0.8, 6) - 0.4})`;
		}
		if (pick < 0.74) {
			return `oklch(${number(1, 6)} ${number(0.4, 6)} ${number(360, 3)})`;
		}
		if (pick < 0.88) {
			const space = COLOR_SPACES[Math.floor(random() * COLOR_SPACES.length)];
			return `color(${space} ${number(1, 6)} ${number(1, 6)} ${number(1, 6)})`;
		}
		if (depth === 0) return "red";
		if (pick < 0.94) {
			const space = MIX_SPACES[Math.floor(random() * MIX_SPACES.length)];
			return `color-mix(in ${space}, ${spell(random, depth - 1)} ${number(
				100,
				1
			)}%, ${spell(random, depth - 1)})`;
		}
		const names = Object.keys(RELATIVE_CHANNELS);
		const fn = names[Math.floor(random() * names.length)];
		return `${fn}(from ${spell(random, depth - 1)} ${RELATIVE_CHANNELS[fn]})`;
	};

	it(
		"over every spelling, mix and relative reference",
		async () => {
			let seed = 1234567;
			const random = () => {
				// `Math.imul` and a mask, not the arithmetic the recurrence reads as:
				// the product passes 2^53, and the rounding collapses the sequence to
				// a few thousand values however many are drawn.
				seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
				return seed / 2147483648;
			};
			/** @type {[string, string][]} */
			const rewritten = [];
			for (let at = 0; at < COLOR_SAMPLES; at++) {
				const written = spell(random, 2);
				const minified = /^a\{color:([\s\S]*)\}$/.exec(
					new CssSourceProcessor().process(`a{color:${written}}`, {
						mode: "minify"
					}).code
				)[1];
				// Whitespace alone is no rewrite to hold to anything.
				if (minified !== written.replace(/,\s+/g, ",").replace(/\s+/g, " ")) {
					rewritten.push([written, minified]);
				}
			}
			// The corpus has to reach the rewrites, or this proves nothing.
			expect(rewritten.length).toBeGreaterThan(COLOR_SAMPLES / 10);
			const page = await browser.newPage();
			/** @type {string[]} */
			const differed = [];
			/**
			 * Whether a pair differs by no more than a number's last significant
			 * digit. The printer caps a number at six of them, which its own
			 * measurement covers for lengths and unitless numbers — six sit below
			 * what a stylesheet can observe. A color channel is quantized to a byte
			 * after a conversion, so an out-of-gamut chroma can still move it by one
			 * (`lch(1.8968% 125.4467 129.726)` paints 0,38,0 and its six-digit form
			 * 0,39,0). That cap is generic number printing, so narrowing it for
			 * colors is measured on its own rather than here; every other way a
			 * rewrite can move a color is still held to agreement.
			 * @param {string} before the color as written
			 * @param {string} after the color the printer wrote
			 * @returns {boolean} true when only a last digit moved
			 */
			const roundedOnly = (before, after) => {
				const shape = (text) => text.replace(/[\d.]+/g, "#");
				if (shape(before) !== shape(after)) return false;
				const ours = before.match(/[\d.]+/g) || [];
				const theirs = after.match(/[\d.]+/g) || [];
				return (
					ours.length === theirs.length &&
					ours.every(
						(num, at) =>
							Number(num).toPrecision(5) === Number(theirs[at]).toPrecision(5)
					)
				);
			};
			try {
				await page.setContent("<body></body>");
				const CHUNK = 300;
				for (let at = 0; at < rewritten.length; at += CHUNK) {
					const chunk = rewritten.slice(at, at + CHUNK);
					const painted = await page.evaluate((pairs) => {
						const canvas = document.createElement("canvas");
						const context = /** @type {CanvasRenderingContext2D} */ (
							canvas.getContext("2d", { willReadFrequently: true })
						);
						const paint = (color) => {
							// A color the canvas will not take keeps its text, so a pair
							// the engine reads differently is not read as agreement.
							context.fillStyle = "#010203";
							context.fillStyle = color;
							if (context.fillStyle === "#010203") return `unread:${color}`;
							context.clearRect(0, 0, 1, 1);
							context.fillRect(0, 0, 1, 1);
							return [...context.getImageData(0, 0, 1, 1).data].join(",");
						};
						return pairs.map(([before, after]) => [
							paint(before),
							paint(after)
						]);
					}, chunk);
					for (const [index, [before, after]] of painted.entries()) {
						if (before !== after && !roundedOnly(...chunk[index])) {
							differed.push(
								`${chunk[index][0]}\n  -> ${chunk[index][1]}\n  ${before} vs ${after}`
							);
						}
					}
				}
			} finally {
				await page.close();
			}
			expect({ rewrites: rewritten.length, differed }).toEqual({
				rewrites: rewritten.length,
				differed: []
			});
		},
		FILE_TIMEOUT
	);
});
