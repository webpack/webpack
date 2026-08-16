"use strict";

// Conformance over the `test/wpt` corpus — 13.8k real HTML documents and the
// declarations the CSS parsing tests state a verdict for. Two tiers, because
// they can prove different things:
//
// 1. Engine-free, over the whole corpus. webpack's own parser is the DOM oracle:
//    the "wpt tree-construction" suite in html5lib.spectest.js holds it to the
//    same corpus's expected trees, so a tree it builds is one an engine builds.
//    Minifying must not move an element, change its depth, or move rendered text
//    — which is what an end tag left out where the parser cannot put it back
//    does, silently.
// 2. In real Chromium, over the two directories whose subject *is* parsing. The
//    engine answers for what tier 1 has to leave out: attribute values (read
//    back through IDL reflection, not compared as text) and every declaration's
//    computed style, raw spelling against minified.
//
// The corpus is an optional submodule; absent, each suite degrades to a no-op.
// SyntaxBrowserEquivalence.unittest.js keeps the deeper facet analysis over
// `configCases`; this is the same claim held to a corpus 50x the size.

const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const {
	A,
	NS_MATHML,
	NS_SVG,
	NodeType,
	SourceProcessor: HtmlSourceProcessor,
	parseHtml
} = require("../lib/html/syntax");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");
const launchChrome = require("./helpers/launchChrome");
const {
	browserCorpus,
	cssDeclarations,
	fullCorpus,
	hasCorpus,
	nameOf,
	readDocument
} = require("./helpers/wptCorpus");

const NS_PREFIX = { [NS_SVG]: "svg ", [NS_MATHML]: "math " };
// Whitespace inside these is data or is rendered verbatim, so it is not text to
// collapse; a `<style>` body is CSS, compared by the declaration suite instead.
const VERBATIM_TEXT = new Set(["pre", "textarea", "script", "style"]);
const ASCII_WHITESPACE = /[ \t\n\f\r]+/g;

// Documents the printer is known to get wrong. Each entry is a filed defect, not
// a tolerated one, and names what moves; the comparison matches this set exactly,
// so an entry outlives its defect by exactly one run.
const FILED_HTML_DEFECTS = new Map([
	[
		"test/wpt/html/semantics/grouping-content/the-ol-element/grouping-ol.html",
		"a trailing `</rp>` is dropped inside `<ruby>`, which nests the `<rt>` after it"
	],
	[
		"test/wpt/html/semantics/forms/the-select-element/customizable-select/nested-select-crash.html",
		"a dropped `</option>` moves the following option's text into the one before it"
	],
	[
		"test/wpt/html/semantics/forms/the-select-element/customizable-select/selectedcontent-in-option-crash.html",
		"a dropped `</option>` re-parents `<selectedcontent>` and splits the `<option>`"
	]
]);

// The same, for what only an engine sees — kept apart because each tier asserts
// its own set diverges, and a defect one finds the other need not.
const FILED_CHROME_DOM_DEFECTS = new Map([
	[
		"test/wpt/html/syntax/parsing/misnested-form-in-template.html",
		"a `<form>` misnested inside a `<template>` loses text the parser moved out of it"
	]
]);

// Declarations Chromium computes a different style from once printed, keyed by
// the value as written. A printer defect unless the reason says otherwise; the
// comparison matches this set exactly, so an entry outlives its cause by one run.
const FILED_CSS_DEFECTS = new Map([
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
 * @typedef {object} DomShape
 * @property {string[]} elements each element as `depth|namespace tag|sorted attribute names`
 * @property {string[]} text the rendered text each element holds itself
 */

/**
 * What an engine builds a document into, less what a minifier is allowed to
 * change: a comment it may drop, and a whitespace run it may collapse to one
 * space. Attribute *values* are the browser tier's — the printer rewrites them
 * (`checked="checked"` -> `checked`, a `style` attribute, a `srcset`) in ways
 * only IDL reflection can say are equivalent.
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
			const names = [...A.attributes(child)]
				.map((attribute) => attribute.serializedName || attribute.name)
				.sort();
			elements.push(`${depth}|${namespace}${tag}|${names.join(",")}`);
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
			return `${facet} ${at}: ${JSON.stringify(a[at])} vs ${JSON.stringify(b[at])}`;
		}
	}
	return "";
};

/**
 * @param {string} source HTML
 * @returns {string} the same document, minified
 */
const minifyHtml = (source) =>
	/** @type {{ code: string }} */ (
		new HtmlSourceProcessor().process(source, { mode: "minify" })
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
 * One declaration's minified value — `a{…}` is the smallest rule that carries one.
 * @param {string} property the property name
 * @param {string} value the value as written
 * @returns {string} the value the printer writes, "" when it dropped the declaration
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
 * Every declaration whose two spellings Chromium computes a different style from.
 * @param {import("puppeteer-core").Page} page the page to ask
 * @param {{ name: string, property: string, key: string, raw: string, min: string }[]} cases the declarations
 * @returns {Promise<{ name: string, key: string, why: string }[]>} the differences
 */
const computedStyleDifferences = async (page, cases) => {
	/** @type {{ name: string, key: string, why: string }[]} */
	const differences = [];
	for (let at = 0; at < cases.length; at += 500) {
		const found = await page.evaluate(
			(batch) => {
				const probe = document.createElement("div");
				document.body.append(probe);
				// The whole computed style, not `cssText`: `left bottom` and `0% 100%` are
				// one declaration the CSSOM serializes two ways, and only what the engine
				// resolves them to says whether the printer changed the meaning. A property
				// Chromium does not implement moves nothing from either spelling, which is
				// the one case "means the same" is undefined for.
				const computed = getComputedStyle(probe);
				const names = [...computed];
				const readBack = (property, value) => {
					probe.style.cssText = "";
					probe.style.cssText = `${property}:${value}`;
					let out = "";
					for (const name of names) out += computed.getPropertyValue(name);
					return out;
				};
				const out = [];
				for (const one of batch) {
					if (one.min === "") continue;
					if (
						readBack(one.property, one.raw) !== readBack(one.property, one.min)
					) {
						out.push({
							name: one.name,
							key: one.key,
							why: `${JSON.stringify(one.raw)} -> ${JSON.stringify(one.min)}`
						});
					}
				}
				return out;
			},
			cases.slice(at, at + 500)
		);
		differences.push(...found);
	}
	return differences;
};

const present = hasCorpus();

expectNoDeprecations();

describe("wpt html dom stability", () => {
	const files = present ? fullCorpus() : [];
	/** @type {Map<string, { name: string, why: string }[]>} */
	const byDirectory = new Map();
	/** @type {string[]} */
	const unexpectedlyClean = [];

	beforeAll(() => {
		for (const file of files) {
			const name = nameOf(file);
			// Two levels in is one wpt spec area, which keeps a failure local
			// without making a test per document.
			const group = name.split("/").slice(2, 4).join("/");
			if (!byDirectory.has(group)) byDirectory.set(group, []);
			const source = readDocument(file);
			if (source === null) continue;
			const why = whatMoved(domShapeOf(source), domShapeOf(minifyHtml(source)));
			const filed = FILED_HTML_DEFECTS.has(name);
			if (why !== "" && !filed) {
				/** @type {{ name: string, why: string }[]} */
				(byDirectory.get(group)).push({ name, why });
			}
			if (why === "" && filed) unexpectedlyClean.push(name);
		}
	}, 900000);

	if (!present) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/wpt`)", () => {
			// No-op: the conformance corpus is an optional git submodule.
		});

		return;
	}

	it("has a corpus", () => {
		expect(files.length).toBeGreaterThan(1000);
	});

	// One test per spec area rather than per document: 13.8k test names report
	// nothing a failing list does not, and the list shows every document at once.
	for (const group of new Set(
		files.map((file) => nameOf(file).split("/").slice(2, 4).join("/"))
	)) {
		it(`should build the same DOM from ${group} and its minified form`, () => {
			expect(byDirectory.get(group) || []).toEqual([]);
		});
	}

	it("should still diverge on every filed defect", () => {
		expect(unexpectedlyClean).toEqual([]);
	});
});

describe("wpt css declarations", () => {
	if (!present) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/wpt`)", () => {
			// No-op: the conformance corpus is an optional git submodule.
		});

		return;
	}

	const declarations = cssDeclarations();

	it("has a corpus", () => {
		expect(declarations.length).toBeGreaterThan(1000);
	});

	it("should print every value the spec accepts", () => {
		/** @type {{ name: string, value: string }[]} */
		const dropped = [];
		for (const declaration of declarations) {
			if (!declaration.valid) continue;
			if (minifyDeclaration(declaration.property, declaration.value) === "") {
				dropped.push({ name: declaration.name, value: declaration.value });
			}
		}
		// A value the spec says parses must survive printing: dropping one deletes
		// a declaration the page depends on.
		expect(dropped).toEqual([]);
	});

	it("should print a value it has already printed unchanged", () => {
		/** @type {{ name: string, once: string, twice: string }[]} */
		const unstable = [];
		for (const { property, value, name } of declarations) {
			const once = minifyDeclaration(property, value);
			if (once === "") continue;
			const twice = minifyDeclaration(property, once);
			if (once !== twice) unstable.push({ name, once, twice });
		}
		// Not idempotent means one of the two passes is wrong, and the output
		// depends on how many times it ran.
		expect(unstable).toEqual([]);
	});
});

// How many documents are handed to the page at once — the corpus is far larger
// than one `evaluate` argument should carry.
const BATCH = 150;

describe("wpt in real Chrome", () => {
	/** @type {import("puppeteer-core").Browser} */
	let browser;
	/** @type {import("puppeteer-core").Page} */
	let page;

	beforeAll(async () => {
		if (!present) return;
		browser = await launchChrome({ protocolTimeout: 300000 });
		page = await browser.newPage();
		await page.setContent(
			"<!doctype html><html><head></head><body></body></html>"
		);
	}, 300000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	if (!present) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/wpt`)", () => {
			// No-op: the conformance corpus is an optional git submodule.
		});

		return;
	}

	it("should build the same DOM in Chrome from a page and its minified form", async () => {
		const files = browserCorpus();
		/** @type {{ name: string, why: string }[]} */
		const differences = [];
		for (let at = 0; at < files.length; at += BATCH) {
			/** @type {{ name: string, raw: string, min: string }[]} */
			const batch = [];
			for (const file of files.slice(at, at + BATCH)) {
				const source = readDocument(file);
				if (source === null) continue;
				batch.push({
					name: nameOf(file),
					raw: source,
					min: minifyHtml(source)
				});
			}
			if (batch.length === 0) continue;
			const found = await page.evaluate((cases) => {
				// The engine's own tree, read the way the engine builds it. Only what a
				// minifier may not change: an element, where it sits, and the text that
				// reaches the page — a comment it may drop, whitespace it may collapse.
				const shapeOf = (html) => {
					const document = new DOMParser().parseFromString(html, "text/html");
					const elements = [];
					const text = [];
					const walk = (root, depth, renders) => {
						for (const node of root.childNodes) {
							if (node.nodeType !== Node.ELEMENT_NODE) continue;
							const element = /** @type {Element} */ (node);
							const names = [...element.attributes]
								.map((attribute) => attribute.name)
								.sort();
							elements.push(
								`${depth}|${element.namespaceURI}|${element.localName}|${names.join(",")}`
							);
							const name =
								element.namespaceURI === "http://www.w3.org/1999/xhtml"
									? element.localName
									: null;
							const inPage = renders || name === "body";
							if (
								inPage &&
								name !== "style" &&
								name !== "script" &&
								name !== "pre" &&
								name !== "textarea"
							) {
								let own = "";
								for (const child of element.childNodes) {
									if (child.nodeType === Node.TEXT_NODE) {
										own += child.nodeValue || "";
									}
								}
								text.push(own.replace(/[ \t\n\f\r]+/g, " "));
							}
							if (name === "template") {
								walk(element.content, depth + 1, true);
							}
							walk(element, depth + 1, inPage);
						}
					};
					walk(document, 0, false);
					const doctype = document.doctype;
					return {
						elements,
						text,
						// Quirks mode changes layout, so the doctype has to survive as one.
						document: [
							document.compatMode,
							doctype === null ? "none" : `${doctype.name}|${doctype.publicId}`
						]
					};
				};
				const out = [];
				for (const one of cases) {
					const before = shapeOf(one.raw);
					const after = shapeOf(one.min);
					let why = "";
					for (const facet of ["document", "elements", "text"]) {
						const a = before[facet];
						const b = after[facet];
						if (a.length !== b.length) {
							why = `${facet}: ${a.length} vs ${b.length}`;
							break;
						}
						const differs = a.findIndex((entry, i) => entry !== b[i]);
						if (differs !== -1) {
							why = `${facet} ${differs}: ${JSON.stringify(a[differs])} vs ${JSON.stringify(b[differs])}`;
							break;
						}
					}
					if (why !== "") out.push({ name: one.name, why });
				}
				return out;
			}, batch);
			for (const one of found) {
				if (
					!FILED_HTML_DEFECTS.has(one.name) &&
					!FILED_CHROME_DOM_DEFECTS.has(one.name)
				) {
					differences.push(one);
				}
			}
		}
		expect(differences).toEqual([]);
	}, 900000);

	it("should compute the same style in Chrome from a value and its minified form", async () => {
		const cases = cssDeclarations()
			.filter((one) => one.valid)
			.map(({ property, value, name }) => ({
				name,
				property,
				key: `${property}:${value}`,
				raw: value,
				min: minifyDeclaration(property, value)
			}));
		const differences = await computedStyleDifferences(page, cases);
		expect(
			differences.filter((one) => !FILED_CSS_DEFECTS.has(one.key))
		).toEqual([]);
	}, 900000);

	it("should not print a value the spec rejects as one the engine accepts", async () => {
		const cases = cssDeclarations()
			.filter((one) => !one.valid)
			.map(({ property, value, name }) => ({
				name,
				property,
				key: `${property}:${value}`,
				raw: value,
				min: minifyDeclaration(property, value)
			}));
		// An invalid declaration moves nothing. One whose printed form does is a
		// declaration the printer brought to life, which no page asked for.
		const differences = await computedStyleDifferences(page, cases);
		expect(
			differences.filter((one) => !FILED_CSS_DEFECTS.has(one.key))
		).toEqual([]);
	}, 900000);
});
