"use strict";

// Both printers held to what an engine makes of their output, over `configCases`
// and `test/wpt` alike, through the one path in `helpers/syntaxEquivalence`.
// Nothing is compared as text where the engine can be asked instead. A third
// tier needs no engine and so reads the whole corpus: webpack's own parser is a
// DOM oracle, held to that corpus's expected trees by html5lib.spectest.js.

const path = require("path");
// The comparison has to know which family names are keywords, and the table
// that says so is generated rather than written twice.
const { GENERIC_FONT_FAMILIES } = require("../../lib/css/data");
const {
	SourceProcessor: CssSourceProcessor,
	readToken
} = require("../../lib/css/syntax");
const {
	BOOLEAN_ATTRIBUTES,
	EMPTY_REMOVABLE_ATTRIBUTES,
	ENUMERATED_ATTRIBUTE_NAMES,
	ENUMERATED_KEYWORDS,
	REWRITABLE_ATTRIBUTES
} = require("../../lib/html/data");
const {
	A,
	NS_MATHML,
	NS_SVG,
	NodeType,
	SourceProcessor: HtmlSourceProcessor,
	decodeEntities,
	parseHtml
} = require("../../lib/html/syntax");
const expectNoDeprecations = require("../helpers/expectNoDeprecations");
const launchBrowser = require("../helpers/launchBrowser");

// Which engine the comparisons are held against. `EQUIVALENCE_BROWSER` points
// the same corpus at Gecko or at WebKit; anything else is Blink.
const ENGINES = new Set(["chrome", "firefox", "webkit"]);
const ENGINE = ENGINES.has(String(process.env.EQUIVALENCE_BROWSER))
	? String(process.env.EQUIVALENCE_BROWSER)
	: "chrome";

// Only Chromium answers the media-emulation calls: they are CDP, and playwright
// offers no `color-gamut` either. Elsewhere the signature carries what no
// viewport varies as text.
const EMULATES_MEDIA = ENGINE === "chrome";

// WHY: The printer caps a number at six significant digits, so a computed value
// that differs past the sixth is the engine's own serialization rather than
// anything the printer wrote — WebKit reads 38.7953px where Blink reads
// 38.795277px for the one declaration. Chromium, whose serialization the
// fixtures were measured against, stays held to the byte.
/**
 * A computed declaration with every number read at the precision the printer
 * writes, where the engine serializes to fewer digits than Chromium.
 * @param {string} line one `property:value` line
 * @returns {string} it, at the printed precision
 */
const atPrintedPrecision = (line) =>
	ENGINE === "chrome"
		? line
		: line.replace(/\d+\.\d+/g, (number) =>
				String(Number(Number(number).toPrecision(6)))
			);

// A filed reason opening `<engine> only:` names the engines that have it, comma
// separated where a file is filed by more than one for different causes.
const ENGINE_ONLY_REGEXP = /^([a-z]+(?:, [a-z]+)*) only:/;

/**
 * A tier's filed defects as they stand in this engine. A reason opening
 * `<engine> only:` names the engine that has it, and the entry is dropped
 * elsewhere — the exactness check would otherwise fail on a defect the engine
 * being run does not have.
 * @param {Map<string, string>} filed every filed defect of a tier
 * @returns {Map<string, string>} the ones this engine has
 */
const forEngine = (filed) =>
	new Map(
		[...filed].filter(([, why]) => {
			const named = ENGINE_ONLY_REGEXP.exec(why);
			return named === null || named[1].split(", ").includes(ENGINE);
		})
	);

/**
 * `page.evaluate` for a result nested deeper than three levels. Gecko's
 * WebDriver BiDi truncates a deeper structure to `null` where Chromium's CDP
 * returns it whole, and puppeteer exposes no depth to raise, so the page hands
 * back text and the depth is carried by JSON rather than by the protocol.
 * @template T, A
 * @param {import("puppeteer-core").Page} page the page to ask
 * @param {(arg: A) => T} fn what to run in it
 * @param {A} arg its argument
 * @returns {Promise<T>} the result, at full depth
 */
const evaluateDeep = async (page, fn, arg) =>
	JSON.parse(
		await page.evaluate(
			// eslint-disable-next-line no-new-func
			(source, each) => JSON.stringify(new Function(`return (${source})`)()(each)),
			fn.toString(),
			arg
		)
	);

const {
	benchmarkDocuments,
	benchmarkStylesheets,
	buildCorpus,
	compareRules,
	conditionSignatures,
	installHelpers,
	numericallyEqual
} = require("../helpers/syntaxEquivalence");
const {
	WPT,
	browserCorpus,
	cssCorpus: wptCssCorpus,
	cssDeclarations,
	fullCorpus,
	hasCorpus,
	nameOf,
	readDocument
} = require("../helpers/wptCorpus");

/** @import { Fixture, PageHelpers } from "../helpers/syntaxEquivalence" */

const CONFIG_CASES = path.join(__dirname, "../configCases");
// How many documents go to the page at once — the wpt corpus is far larger than
// one `evaluate` argument should carry.
const BATCH = 150;
// Documents one page parses before it is replaced. Each stays in memory until
// the page goes, and a page costs 58ms — so this trades one page per few
// hundred files against a renderer holding the whole corpus.
const PAGE_DOCUMENTS = 500;
// What one file gets, and what one batch's CDP call gets with it. A file compares
// in milliseconds, so this is orders above what any needs — generous enough never
// to fail a slow runner, small enough that every hanging file is named in one run.
const FILE_TIMEOUT = 180000;
// One declaration, bounded here rather than by jest — which is what lets the
// page be replaced before the next one runs. A declaration costs a
// millisecond, so this is three orders above what it needs.
const VALUE_BUDGET = 2000;
// The custom property a value is held in to be read back through `var()`. Any
// name does: it is unregistered, so the engine keeps whatever tokens it is
// given and resolves them where the substitution stands.
const CUSTOM_PROPERTY = "--webpack-probe";

// Documents and stylesheets the printers are known to get wrong, per corpus.
// Each is a filed defect, not a tolerated one; every comparison matches its set
// exactly, so an entry outlives its defect by one run.
const FILED_CONFIG_CSS_DEFECTS = new Map([
	[
		"test/configCases/css/minimize-values/style.css",
		"firefox, webkit only: not a printer defect — Gecko echoes a `calc()` inside a `var()` fallback as written where Blink folds it as it parses, so both spellings read alike there. Measured in Firefox 156: `width:var(--foo,calc(10px + 10px))` reads back whole, while both engines compute `20px`. WebKit drops a `shape-image-threshold` the others keep, which shifts every rule index after it"
	],
	[
		"test/configCases/css/minimize-cssnano-custom-properties/style.css",
		"firefox only: the `calc()` in a `var()` fallback again — see `minimize-values`"
	],
	[
		"test/configCases/css/minify-modern-longhands/style.css",
		"firefox only: `font-synthesis-position: initial` computes `auto` in Gecko where the table names `none`, which Blink cannot see because it does not implement the property. A printer defect, fixed separately"
	]
]);

const FILED_CONFIG_HTML_DEFECTS = new Map([
	[
		"test/configCases/html/attribute-tables/page.html",
		"firefox, webkit only: not a printer defect — an IDL attribute the engine does not implement falls back to the attribute as written, so a normalization reads as a difference. Measured in Firefox 156: `writingSuggestions` and `blocking` both read `undefined` where Chrome 147 reflects `false` and `render`; WebKit reads `autofocus`, `enterkeyhint` and `inputmode` apart from Blink the same way"
	],
	[
		"test/configCases/html/minimize-round-trip/cases/reflected.html",
		"firefox only: the unimplemented `blocking` IDL again — see `attribute-tables`"
	],
	[
		"test/configCases/html/minimize-transforms/page.html",
		"firefox only: the unimplemented `blocking` IDL again — see `attribute-tables`"
	]
]);

const FILED_BENCHMARK_CSS_DEFECTS = new Map([
	["Fomantic-UI 2", "webkit only: not a printer defect — WebKit lays out in units of a sixty-fourth of a pixel, so a width the others compute whole lands one step below it. Measured in the first WebKit run: `112px` against `111.984375px`, which is `112 - 1/64`"],
	["Foundation 6", "webkit only: the sixty-fourth of a pixel again — see `Fomantic-UI 2`"],
	["Radix Themes 3 (components)", "webkit only: the sixty-fourth of a pixel again — see `Fomantic-UI 2`"],
	["Semantic UI 2", "webkit only: the sixty-fourth of a pixel again — see `Fomantic-UI 2`"],
	["Tailwind 4 + daisyUI 5", "webkit only: the sixty-fourth of a pixel again — see `Fomantic-UI 2`"]
]);

const FILED_BENCHMARK_HTML_DEFECTS = new Map();

const FILED_WPT_HTML_DEFECTS = new Map([
	[
		"test/wpt/html/syntax/parsing/misnested-form-in-template.html",
		"chrome only: not a printer defect — the form pointer is not set inside a `<template>`, which this test asserts and Chromium has not implemented while Gecko has, so webpack prints the tree wpt expects and only Chromium disagrees"
	]
]);

const FILED_WPT_CSS_DEFECTS = new Map();

// The same, for what webpack's own parser sees over the whole corpus.
// Keyed `"<mode> <document>"`, so filing one print mode leaves the other held.
const FILED_WPT_TREE_DEFECTS = new Map();

// Color rewrites one engine paints differently from the color they replaced,
// keyed by the color as written.
const FILED_COLOR_REWRITES = new Map([
	[
		"color-mix(in hsl, hwb(322.26 56.57% 49.83%) 7.3%, oklch(0.280497 0.052616 353.043))",
		"firefox only: a printer defect, not yet decided — the fold matches what Chromium computes and Gecko lands six units away in blue, which is past the byte the quantization explains. Measured in Firefox 156: the source paints 68,35,56 and the `#442332` it is printed as paints 68,35,50; Chrome 147 paints 68,35,50 for both"
	]
]);

// Enumerated values the printer lower-cases that one engine does not read
// case-insensitively, keyed as the check reports them.
const FILED_ENUMERATED_FOLDS = new Map([
	['img fetchpriority=high: "auto" vs "high"', "webkit only: WebKit reflects no `fetchpriority`, so `high` and `low` both read `auto` and lower-casing one cannot be told from folding it away"],
	['img fetchpriority=low: "auto" vs "low"', "webkit only: the unreflected `fetchpriority` again — see `img fetchpriority=high`"],
	['link fetchpriority=high: "auto" vs "high"', "webkit only: the unreflected `fetchpriority` again — see `img fetchpriority=high`"],
	['link fetchpriority=low: "auto" vs "low"', "webkit only: the unreflected `fetchpriority` again — see `img fetchpriority=high`"],
	['script fetchpriority=high: "auto" vs "high"', "webkit only: the unreflected `fetchpriority` again — see `img fetchpriority=high`"],
	['script fetchpriority=low: "auto" vs "low"', "webkit only: the unreflected `fetchpriority` again — see `img fetchpriority=high`"],
	[
		'* spellcheck=true: "false" vs "true"',
		"firefox only: a printer defect, not yet decided — HTML makes an enumerated attribute ASCII case-insensitive and Gecko does not read `spellcheck` that way, so lower-casing it turns spellchecking on where the page had it off. Measured in Firefox 156: `spellcheck=\"TRUE\"` reflects `false` and `spellcheck=\"true\"` reflects `true`; Chrome 147 reflects `true` for both"
	]
]);

// Declarations an engine computes a different style from once printed, keyed by
// the value as written — and by `var(…):` before it where the value was read
// through a custom property. A printer defect unless the reason says otherwise.
const FILED_WPT_VALUE_DEFECTS = new Map([
	[
		"-webkit-perspective:calc(1000)",
		"firefox only: a printer defect, fixed separately — dropping the `calc()` from a unitless number brings a dead declaration to life. Measured in Firefox 156: `calc(1000)` computes `none` while the `1000` it is printed as computes `1000px`; Chrome 147 reads both as `1000px`, which is why it cannot see this"
	],
	[
		"-webkit-perspective:calc(25)",
		"firefox only: the unitless `calc()` again — see `calc(1000)`"
	],
	[
		"shape-image-threshold:50%",
		"webkit only: WebKit reads a `shape-image-threshold` percentage as the number it means and the others keep the percentage, so a spelling neither reads differently still reads as a difference"
	],
	[
		"shape-image-threshold:300%",
		"webkit only: the `shape-image-threshold` percentage again \u2014 see `50%`"
	],
	[
		"shape-image-threshold:-100%",
		"webkit only: the `shape-image-threshold` percentage again \u2014 see `50%`"
	],
	[
		"background-image:paint( mypaint",
		"webkit only: WebKit implements no CSS Painting API, so a `paint()` image is dropped rather than echoed and the two spellings both read as absent"
	],
	[
		"background-image:paint(mypaint ",
		"webkit only: the unimplemented `paint()` again \u2014 see `paint( mypaint`"
	],
	[
		"font-family:\"New Century Schoolbook\", serif",
		"firefox only: not a printer defect — Gecko carries the source's quoting into the computed family where Blink drops it, so unquoting a name neither engine reads differently still reads as a difference there"
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
			filedHtml: forEngine(FILED_CONFIG_HTML_DEFECTS),
			filedCss: forEngine(FILED_CONFIG_CSS_DEFECTS)
		}
	];
	// Real projects, where `configCases` and wpt are both written to exercise a
	// rule rather than to ship.
	const benchHtml = benchmarkDocuments((source) => source);
	const benchCss = benchmarkStylesheets(minifyCss);
	if (benchHtml.length > 0 || benchCss.length > 0) {
		built.push({
			label: "benchmark corpus",
			html: variant(benchHtml, {}),
			htmlAllImpliedTags: variant(benchHtml, { removeImpliedTags: true }),
			htmlSmartTags: variant(benchHtml, { removeImpliedTags: "smart" }),
			css: benchCss,
			filedHtml: forEngine(FILED_BENCHMARK_HTML_DEFECTS),
			filedCss: forEngine(FILED_BENCHMARK_CSS_DEFECTS)
		});
	}
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
		filedHtml: forEngine(FILED_WPT_HTML_DEFECTS),
		filedCss: forEngine(FILED_WPT_CSS_DEFECTS)
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

const NO_BENCHMARK_CORPUS =
	"comparison caches not built (run `yarn benchmark:css-tools` / `yarn benchmark:html-tools`)";

expectNoDeprecations();

describe(`printer output in real ${ENGINE}`, () => {
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
		await opened.evaluate(installHelpers, [...GENERIC_FONT_FAMILIES]);
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
		browser = await launchBrowser({
			browser: ENGINE,
			protocolTimeout: FILE_TIMEOUT
		});
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
			const collected = await evaluateDeep(
				active,
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
			evaluateDeep(
				active,
				(sheets) => {
					const { cssRules } = /** @type {{ __eq: PageHelpers }} */ (
						/** @type {unknown} */ (window)
					).__eq;
					return sheets.map((each) => ({
						name: each.name,
						before: cssRules(each.raw),
						after: cssRules(each.min)
					}));
				},
				batch
			)
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

	/**
	 * @param {number} at which of the built corpora to describe
	 * @returns {void}
	 */
	const describeCorpus = (at) => {
		const one = corpora[at];

		describe(one.label, () => {
			// One test per page, not per corpus: the file is what a defect is filed against,
			// so a failure names it with nothing left to narrow down. Every part of the
			// document the engine builds must survive minification.
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
					// The tags this leaves out are the ones the parser puts back, so the tree it
					// builds — every element's depth, and the CSSOM of what it carries — is untouched.
					// Grouped: these vary the option, not the file, which the tier above names.
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

			// WHY: `compatMode` is a function of the doctype alone — measured in
			// Chrome 147, any two that read back as the same doctype compute the same
			// mode — so with none it reports what the engine defaults a parsed document
			// to, which WebKit and Blink answer differently. Only the doctype is the
			// printer's to keep, so a page carrying one is still held to its effect.
			it(
				"reads quirks mode off the doctype rather than off the parse",
				async () => {
					const differences = await comparePages(
						[
							{
								name: "doctype-absent",
								raw: '<p class="a">a<b>b<i>c</p>d</i>e</b>f',
								min: "<p class=a>a<b>b<i>c</p>d</i>e</b>f"
							},
							{
								name: "doctype-dropped",
								raw: "<!DOCTYPE html><p>x</p>",
								min: "<p>x</p>"
							},
							{
								name: "doctype-shortened",
								raw: '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><p>x</p>',
								min: '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><p>x</p>'
							}
						],
						false
					);
					expect(differences).toEqual([
						{ name: "doctype-dropped", why: "document: 2 vs 1" },
						{
							name: "doctype-shortened",
							why: "document 0: html|-//W3C//DTD HTML 4.01 Transitional//EN|http://www.w3.org/TR/html4/loose.dtd vs html|-//W3C//DTD HTML 4.01 Transitional//EN|"
						}
					]);
				},
				FILE_TIMEOUT
			);

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

			// A pixel ends in a channel, so the pixel a color paints has to be parted
			// from a name code point after it, which the `)` it replaced parted.
			it(
				"parts a painted color from the token written against it",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "color-then-name-token",
							raw: ".a{--s:oklch(0% 0 0) calc(1px)}",
							min: ".a{--s:oklch(0% 0 0)calc(1px)}"
						},
						{
							name: "color-then-non-ascii-name",
							raw: ".a{--s:oklch(0% 0 0) \u00E9}",
							min: ".a{--s:oklch(0% 0 0)\u00E9}"
						}
					]);
					expect(differences).toEqual([]);
				},
				FILE_TIMEOUT
			);

			// CSS Cascade 4 §6.2: a normal declaration written after an important one
			// does not override it, so the later block is the dead one.
			it(
				"reads a repeated selector's importance as the cascade does",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "important-then-normal",
							raw: ".a{--x:red!important}.a{--x:blue}",
							min: ".a{--x:red!important}"
						},
						{
							name: "normal-then-normal",
							raw: ".a{--y:red}.a{--y:blue}",
							min: ".a{--y:blue}"
						}
					]);
					expect(differences).toEqual([]);
				},
				FILE_TIMEOUT
			);

			// WHY: the whitespace a math operator needs is carried under a marker
			// across the rule that drops a delimiter's, and a marker a value can
			// spell is one this tier reads two values as one through. U+0000 is the
			// one no value holds: CSS Syntax §3.3 names U+FFFD for the null a source
			// spells and §4.3.7 for the null an escape names.
			it(
				"reads a value's own private-use character as no space of its own",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "private-use-is-not-a-space",
							raw: ".a{--x:a\uE000b}",
							min: ".a{--x:a b}"
						}
					]);
					expect(differences).toEqual([
						{
							name: "private-use-is-not-a-space",
							why: "rule 0:  .a { --x:a\uE000b } vs  .a { --x:a b }"
						}
					]);
				},
				FILE_TIMEOUT
			);

			// A value that is not itself a color still carries them, and the computed
			// value keeps the space each was written in.
			it(
				"paints the colors a computed value carries",
				async () => {
					const differences = await compareStylesheets([
						{
							name: "shadow-color-space",
							raw: ".a{box-shadow:0 1px oklch(0% 0 0/.01) inset,0 -1px oklch(100% 0 0/.01) inset}",
							min: ".a{box-shadow:0 1px#00000003 inset,0 -1px#ffffff03 inset}"
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

	// Which corpora were built depends on what is checked out, so each names
	// itself, and one that could not be built says so rather than going quiet.
	for (const at of corpora.keys()) describeCorpus(at);
	for (const [label, why] of [
		["wpt", NO_CORPUS],
		["benchmark corpus", NO_BENCHMARK_CORPUS]
	]) {
		if (corpora.some((one) => one.label === label)) continue;

		describe(label, () => {
			it(why, () => {
				// No-op: both are optional, and each is built outside this suite.
			});
		});
	}

	// One test per declaration, not per file: the value is what a defect is filed
	// against, so the run names it without anything having to narrow it down.
	/** @type {{ name: string, property: string, key: string, raw: string, min: string | null, held: string | null }[]} */
	const declarations = [];
	/** @type {number} every declaration the corpus holds, compared or not */
	let declarationsRead = 0;
	/** @type {number} how many reach the custom property printer */
	let valuesHeld = 0;
	for (const { property, value, name } of hasCorpus()
		? cssDeclarations()
		: []) {
		declarationsRead++;
		const min = minifyDeclaration(property, value);
		// The same value as a custom property's: a path of its own, written back
		// token for token, and reached by any value at all — the corpus names no
		// custom property, so nothing else here exercises it.
		const held = minifyDeclaration(CUSTOM_PROPERTY, value);
		// A value the printer copied out is compared against itself, which the engine
		// answers the same way twice by construction. Three quarters of the corpus is
		// that, and reading one back is not free.
		if (min === value && held === value) continue;
		if (held !== value) valuesHeld++;

		declarations.push({
			name,
			property,
			key: `${property}:${value}`,
			raw: value,
			min: min === value ? null : min,
			held: held === value ? null : held
		});
	}
	/** @type {Set<string>} every value that moved, filled as the files run */
	const movedValues = new Set();

	const compareValues = (cases) =>
		inBatches(probePage, cases, (batch) =>
			probePage.evaluate((each, custom) => {
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
				 * @param {boolean=} through whether to reach the property through a
				 * custom property rather than to set it directly
				 * @returns {string} each longhand it sets, with what it computes to
				 */
				const readBack = (property, value, through) => {
					probe.style.cssText = "";
					probe.style.cssText = through
						? `${custom}:${value};${property}:var(${custom})`
						: `${property}:${value}`;
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
						// The holder is the token stream itself, which a safe rewrite moves —
						// what it substitutes into is the value, and that is read below.
						if (name === custom) continue;
						// Under the one name the spec gives the value, its colors painted: the engine
						// echoes the spelling it was handed — `jump-start` beside `start` — so without
						// this the tier reads a synonym as a change of meaning.
						out += `${name}:${paintedColors(
							canonical(computed.getPropertyValue(name))
						)}\u0000`;
					}
					return out;
				};
				const out = [];
				for (const one of each) {
					// Each form read against its own longhands, the name included: a form that sets a
					// property the other does not — an invalid value the printer brought to life, or a
					// valid one it erased — differs by that name alone.
					if (
						one.min !== null &&
						readBack(one.property, one.raw) !== readBack(one.property, one.min)
					) {
						out.push({ name: one.name, key: one.key });
					}
					// WHY: a custom property is a token stream nothing reads until it is
					// substituted, so what it means is what the property consuming it
					// computes — `calc(var(--a)- var(--b))` parses and then fails there.
					// Asking the engine through a `var()` is the only reading of that
					// path that is not a comparison of two spellings (#22149).
					if (
						one.held !== null &&
						readBack(one.property, one.raw, true) !==
							readBack(one.property, one.held, true)
					) {
						out.push({ name: one.name, key: `var(${custom}):${one.key}` });
					}
				}
				// The page is shared, so what this tier appends it takes back out.
				probe.remove();
				return out;
			}, batch, CUSTOM_PROPERTY)
		);

	/**
	 * Declarations read within a budget, on a page the next read can still use.
	 * A value that hangs leaves the renderer mid-recalculation, so the page is
	 * replaced rather than reused — without that, one bad read times out every
	 * read behind it and the run ends on the job's budget with nothing named.
	 * @param {{ name: string, property: string, key: string, raw: string, min: string | null, held: string | null }[]} cases the declarations to read
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
		// nothing would pass with no work. Bounds well under today's 8,901 read,
		// 2,981 compared and 1,859 of those held in a custom property.
		it("should have a corpus the printer rewrites a share of", () => {
			expect(declarationsRead).toBeGreaterThan(5000);
			expect(declarations.length).toBeGreaterThan(1000);
			expect(valuesHeld).toBeGreaterThan(1000);
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
				[...forEngine(FILED_WPT_VALUE_DEFECTS).keys()].sort()
			);
		});
	}

	it("should only fold enumerated values the engine folds too", async () => {
		/**
		 * The printer lower-cases a value in `ENUMERATED_KEYWORDS`, which is
		 * unobservable exactly where the IDL member is "limited to only known
		 * values" and hands back one spelling whichever was written — something no
		 * dataset states, and `target` / `<textarea wrap>` reflect verbatim. The
		 * corpus covers only the entries a fixture happens to carry; this covers
		 * every one of them.
		 * @type {Record<string, Record<string, string[]>>}
		 */
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
		expect([...unfolded].sort()).toEqual(
			[...forEngine(FILED_ENUMERATED_FOLDS).keys()].sort()
		);
	}, 600000);

	it("should only drop an empty attribute the engine reads back as absent", async () => {
		/**
		 * `removeEmptyAttributes` drops each of these when its value is empty,
		 * which is unobservable only where the IDL member reads the same as with no
		 * attribute at all — so an event handler is not in the table, its empty
		 * body still compiling to a function rather than null. A global is read on
		 * `<a>`, a scoped one on each element it names.
		 * @type {[string, string[]][]}
		 */
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
					// The printer may rewrite these — a boolean written bare, an enumerated value
					// folded, a `style` re-printed. Whether it still reflects the same is what IDL
					// reflection answers in the tier above, so here only the name is compared.
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

// The whole wpt corpus, with no engine: webpack's parser answers for the DOM, held
// to this corpus's own expected trees. Both print modes run, since beautifying is
// where the round-trip fallback lives; one test per spec area, not per document.
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
				/** @type {import("../../lib/css/syntax").MutableToken} */ ({})
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

/**
 * What a lowering is held to: an engine that reads both spellings computes the
 * same style from either, so a fallback pair resolves to the author's own and a
 * rewrite has to land on it. A lowering that changes the computed value on
 * purpose names the properties it changes, with the reason.
 * @typedef {object} LoweringFixture
 * @property {string} name what it lowers
 * @property {string} css the stylesheet
 * @property {string[]} browsers the selection that turns the lowering on
 * @property {string} html the document the probes are read from
 * @property {[string, string][]} probes selector and the property to read
 * @property {string[]=} schemes the color schemes to read it under
 * @property {string[]=} directions the writing directions to read it under
 * @property {string[]=} differs properties this lowering changes on purpose
 * @property {string[]=} introduces custom properties the lowering writes that the source has none of, which a script enumerating them would see
 * @property {string[]=} numeric properties whose value the rewrite reaches by arithmetic, held to `numericallyEqual` rather than to the same text
 * @property {string[]} produces text the rewrite leaves, so a comparison of two sheets neither of which was rewritten cannot pass for one
 * @property {string=} reference what the source means, where the engine reads no spelling of it — `:lang(en, fr)` is one Chromium has never taken, so the rewrite is held to the pair of rules that state the same thing rather than to an engine's reading of the original
 */
/** @type {LoweringFixture[]} */
const LOWERING_FIXTURES = [
	{
		name: "nesting",
		// The rules the lowering writes on their own, which the source states
		// inside the one they were written in.
		produces: ["a b{", "a.x{", ":is(a,section) p{", "main>i{", ":is(a b) c{"],
		css:
			"a{color:red;& b{color:blue}&.x{color:green}}" +
			"a,section{& p{color:teal}}" +
			"main{& > i{color:navy}}" +
			"a{& b{& c{color:olive}}}",
		browsers: ["chrome 100"],
		html:
			"<a id=t>t<b id=u>u<c id=z>z</c></b></a>" +
			"<a id=v class=x>v</a>" +
			"<section><p id=w>w</p></section>" +
			"<main><i id=y>y</i></main>",
		probes: [
			["#t", "color"],
			["#u", "color"],
			["#v", "color"],
			["#w", "color"],
			["#y", "color"],
			["#z", "color"]
		]
	},
	{
		name: "light-dark()",
		// The pair the lowering writes, which a script enumerating the computed
		// custom properties would see where the source has none.
		introduces: ["--webpack-light", "--webpack-dark"],
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
		introduces: ["--webpack-light", "--webpack-dark"],
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
		// The engine computes at full precision and serializes what it computed; the
		// printer writes the six significant digits a stylesheet can observe. So these
		// are held to `numericallyEqual` rather than to the same text.
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
		name: "a shorthand slot, a query and a declaration saying nothing",
		css:
			"@media all and (min-width:1px){#b{outline-color:red}}" +
			"@supports (color:red) and (color:red){#b{caret-color:red}}" +
			"#b{border:medium none currentcolor;column-rule:medium none currentcolor;" +
			"transition:opacity .3s 0s;animation:1s ease 0s 1 normal none running x;" +
			"color:#eee;color:#333;margin-top:1px;margin-top:2px}" +
			"#c{color:red}#c{color:blue}",
		browsers: ["chrome 130"],
		produces: [
			"@media (width>=1px)",
			"@supports (color:red){",
			"border:none",
			"transition:opacity.3s",
			"color:#333",
			"#c{color:blue}"
		],
		html:
			'<button id=b style="position:absolute">x</button>' +
			'<button id=c style="position:absolute">y</button>',
		probes: [
			["#b", "outline-color"],
			["#b", "caret-color"],
			["#b", "border-top-width"],
			["#b", "border-top-style"],
			["#b", "border-top-color"],
			["#b", "column-rule-width"],
			["#b", "column-rule-style"],
			["#b", "column-rule-color"],
			["#b", "transition"],
			["#b", "animation"],
			["#b", "color"],
			["#b", "margin-top"],
			["#c", "color"]
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
		browser = await launchBrowser({
			browser: ENGINE,
			protocolTimeout: FILE_TIMEOUT
		});
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
				// A color is compared as painted rather than as text: the engine keeps a mix at
				// the precision it computed, while the printer writes the byte it lands on — the
				// trade every color rewrite here already makes, and the pixel is what a reader sees.
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

	/**
	 * Every computed property of every element a fixture probes, under one
	 * stylesheet — the whole of what the CSSOM reports rather than the handful of
	 * properties the fixture names, so a rewrite reaching a property nobody
	 * thought to probe is one this still sees.
	 * @param {import("puppeteer-core").Page} page the page to read from
	 * @param {string} css the stylesheet
	 * @param {string} html the document
	 * @param {string[]} selectors the elements to read
	 * @returns {Promise<string[]>} one `property:value` list per element
	 */
	const readEveryProperty = (page, css, html, selectors) =>
		page.setContent(`<style>${css}</style>${html}`).then(() =>
			page.evaluate((asked) => {
				const canvas = document.createElement("canvas");
				const context = /** @type {CanvasRenderingContext2D} */ (
					canvas.getContext("2d", { willReadFrequently: true })
				);
				// A color read as the color it is, not the text it serializes to:
				// `color(srgb .2 .4 .6)` and `#369` are one color written two ways.
				const painted = (value) => {
					context.fillStyle = "#010203";
					context.fillStyle = value;
					if (context.fillStyle === "#010203") return value;
					context.clearRect(0, 0, 1, 1);
					context.fillRect(0, 0, 1, 1);
					return [...context.getImageData(0, 0, 1, 1).data].join(",");
				};
				return asked.map((selector) => {
					const element = document.querySelector(selector);
					if (element === null) return "no such element";
					const style = getComputedStyle(element);
					/** @type {string[]} */
					const out = [];
					for (let at = 0; at < style.length; at++) {
						const property = style.item(at);
						out.push(
							`${property}:${painted(style.getPropertyValue(property))}`
						);
					}
					return out.sort().join("\n");
				});
			}, selectors)
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
					// An engine with no media emulation takes the scheme from its own
					// launch settings, so a run there is held to the default one.
					if (EMULATES_MEDIA) {
						await page.emulateMediaFeatures([
							{ name: "prefers-color-scheme", value: scheme }
						]);
					} else if (scheme !== "light") {
						continue;
					}
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
						// ...and the same elements read whole: everything else the CSSOM
						// says about them. What may move is left to the probes above.
						const loose = new Set([
							...(fixture.differs || []),
							...(fixture.numeric || []),
							...(fixture.introduces || [])
						]);
						const whole = [...new Set(asked.map(([selector]) => selector))];
						const [wholeBefore, wholeAfter] = [
							await readEveryProperty(
								page,
								fixture.reference || fixture.css,
								html,
								whole
							),
							await readEveryProperty(page, lowered, html, whole)
						];
						const kept = (/** @type {string} */ text) =>
							text
								.split("\n")
								.filter((line) => !loose.has(line.slice(0, line.indexOf(":"))))
								.map(atPrintedPrecision)
								.join("\n");
						expect(wholeAfter.map(kept)).toEqual(wholeBefore.map(kept));
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
		browser = await launchBrowser({
			browser: ENGINE,
			protocolTimeout: FILE_TIMEOUT
		});
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

			// WHY: The margins in `lib/css/syntax.js` are measured against Chromium,
			// and Gecko's conversion lands a channel elsewhere within the byte —
			// measured in Firefox 156: `hsl(from rgb(214.7 138.3 226.0) calc(h + 40)
			// s calc(l * .9))` paints 219,109,159 against the 219,109,160 of the
			// `#db6da0` it is printed as. One unit is the quantization itself, so
			// only that much is allowed, and only where the engine is not the one
			// the margins were cut for.
			/**
			 * @param {string} before the pixel the source painted
			 * @param {string} after the pixel the printed form painted
			 * @returns {boolean} true when no channel moved by more than one
			 */
			const withinAByte = (before, after) => {
				if (ENGINE !== "firefox") return false;
				const ours = before.split(",").map(Number);
				const theirs = after.split(",").map(Number);
				return (
					ours.length === theirs.length &&
					ours.every((value, at) => Math.abs(value - theirs[at]) <= 1)
				);
			};

			const filedColors = forEngine(FILED_COLOR_REWRITES);
			/** @type {Set<string>} */
			const stillFiled = new Set();
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
						if (before === after || roundedOnly(...chunk[index])) continue;
						const written = chunk[index][0];
						// Counted before the tolerance, so an entry filed for this engine
						// still reads as diverging where the byte would have swallowed it.
						if (filedColors.has(written)) {
							stillFiled.add(written);
							continue;
						}
						if (withinAByte(before, after)) continue;
						differed.push(
							`${written}\n  -> ${chunk[index][1]}\n  ${before} vs ${after}`
						);
					}
				}
			} finally {
				await page.close();
			}
			expect({ rewrites: rewritten.length, differed }).toEqual({
				rewrites: rewritten.length,
				differed: []
			});
			// A filed entry outlives its defect by one run: the set is matched
			// exactly, so a rewrite the engine stopped moving fails here.
			expect([...stillFiled].sort()).toEqual([...filedColors.keys()].sort());
		},
		FILE_TIMEOUT
	);
});
