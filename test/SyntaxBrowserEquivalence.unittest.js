"use strict";

const fs = require("fs/promises");
const path = require("path");
const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const { SourceProcessor: HtmlSourceProcessor } = require("../lib/html/syntax");

// The minifiers claim their rewrites are equivalent *to the engine*, which only
// an engine can confirm: every `configCases` stylesheet and page is minified and
// both spellings are handed to Chromium, which must compute the same style from
// each rule and build the same element tree and rendered text from each page.
// Nothing here is snapshotted — the assertion is the equivalence itself, and the
// printers' output is snapshotted by the suites that test printing.

const CONFIG_CASES = path.join(__dirname, "configCases");

/** @typedef {{ name: string, raw: string, min: string }} Fixture */

/**
 * Every fixture of one extension under a directory.
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @returns {Promise<string[]>} sorted fixture paths
 */
const collectFixtures = async (dir, extension) => {
	/** @type {string[]} */
	const files = [];
	/**
	 * @param {string} current directory to read
	 * @returns {Promise<void>} when the subtree has been read
	 */
	const walk = async (current) => {
		const entries = await fs.readdir(current, { withFileTypes: true });
		await Promise.all(
			entries.map(async (entry) => {
				const full = path.join(current, entry.name);
				if (entry.isDirectory()) await walk(full);
				else if (entry.name.endsWith(extension)) files.push(full);
			})
		);
	};
	await walk(dir);
	return files.sort();
};

/**
 * Load fixtures and minify each one on its own — concatenating first would let a
 * deliberately malformed page corrupt every fixture after it.
 * @param {string} extension file extension including the dot
 * @param {(source: string) => string} minify the printer to run
 * @returns {Promise<Fixture[]>} the corpus
 */
const buildCorpus = async (extension, minify) => {
	const files = await collectFixtures(CONFIG_CASES, extension);
	return Promise.all(
		files.map(async (file) => {
			const raw = await fs.readFile(file, "utf8");
			return {
				name: path
					.relative(path.join(__dirname, ".."), file)
					.replace(/\\/g, "/"),
				raw,
				min: minify(raw)
			};
		})
	);
};

/** @type {Fixture[]} */
let cssCorpus;
/** @type {Fixture[]} */
let htmlCorpus;
/** @type {Promise<void> | undefined} */
let building;

/**
 * Build both corpora once, however many suites ask for them.
 * @returns {Promise<void>} when both are ready
 */
const buildCorpora = () => {
	if (building === undefined) {
		building = (async () => {
			cssCorpus = await buildCorpus(
				".css",
				(source) =>
					/** @type {{ code: string }} */
					(new CssSourceProcessor().process(source, { minimize: true })).code
			);
			htmlCorpus = await buildCorpus(
				".html",
				(source) =>
					/** @type {{ code: string }} */
					(new HtmlSourceProcessor().process(source, { minimize: true })).code
			);
		})();
	}
	return building;
};

// Optional dependency: the browser checks only run where puppeteer-core (and a
// Chrome it can launch) are present. puppeteer-core needs Node >= 18 and is
// ESM-only since v25, so it is loaded lazily via dynamic import inside
// beforeAll; it self-skips on Bun/Deno, old Node, or when no Chrome launches
// (same shape as `ProfilingPlugin.unittest.js`).
const globalScope = /** @type {{ Bun?: unknown, Deno?: unknown }} */ (
	globalThis
);
const onBunOrDeno = Boolean(globalScope.Bun) || Boolean(globalScope.Deno);
const nodeMajor = Number.parseInt(process.versions.node, 10);

// DOM differences this harness found that are defects in the HTML minifier, not
// intended transforms. Listed rather than tolerated wholesale, so any *other*
// fixture whose DOM changes still fails, and so fixing one fails here too.
const KNOWN_HTML_DEFECTS = new Map([
	[
		"test/configCases/html/minimize-attributes/page.html",
		// A second `<body>` start tag has its attributes merged onto the already-open
		// body (§13.2.6.4.7). The tag is dropped without the merge, losing `class`.
		"element 3: http://www.w3.org/1999/xhtml|body[class] vs http://www.w3.org/1999/xhtml|body[]"
	],
	// `<![CDATA[` outside foreign content is a bogus comment ending at the first
	// `>` (§13.2.5.42), leaving the rest as text. It is modelled as a CDATA
	// section through `]]>` instead, so dropping it as a comment eats that text.
	["test/configCases/html/basic/page.html", "rendered text differs"],
	[
		"test/configCases/html/full-lexer-integration/page.html",
		"rendered text differs"
	]
]);

describe("printer output in real Chrome", () => {
	/** @type {import("puppeteer-core").Browser | undefined} */
	let browser;
	/** @type {import("puppeteer-core").Page | undefined} */
	let page;

	beforeAll(async () => {
		await buildCorpora();
		if (onBunOrDeno || nodeMajor < 18) return;
		/** @type {typeof import("puppeteer-core").default} */
		let puppeteer;
		try {
			puppeteer = (await import("puppeteer-core")).default;
		} catch (_err) {
			return;
		}
		try {
			/** @type {import("puppeteer-core").LaunchOptions} */
			const launchOptions = {
				headless: true,
				args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
				// The whole corpus is compared in one call per language.
				protocolTimeout: 300000
			};
			if (process.env.PUPPETEER_EXECUTABLE_PATH) {
				launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
			} else {
				launchOptions.channel = "chrome";
			}
			browser = await puppeteer.launch(launchOptions);
			page = await browser.newPage();
			await page.setContent(
				"<!doctype html><html><head></head><body></body></html>"
			);
		} catch (_err) {
			// No usable Chrome in this environment — the tests self-skip below.
			browser = undefined;
		}
	}, 300000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	const itChrome = onBunOrDeno || nodeMajor < 18 ? it.skip : it;

	itChrome(
		"should build the same DOM from a page and its minified form",
		async () => {
			if (!page) {
				console.warn("Skipping: could not launch Chrome via puppeteer-core.");
				return;
			}
			const differences = await page.evaluate((cases) => {
				/**
				 * An element as namespace, name and the set of attribute *names*.
				 * Values are excluded: the minifier respells some of them (`class`,
				 * `style`, `srcset`, boolean attributes) to a different string the DOM
				 * parses the same way.
				 * @param {Element} node an element
				 * @returns {string} its shape
				 */
				const shape = (node) =>
					`${node.namespaceURI}|${node.localName}[${[...node.attributes]
						.map((a) => a.name)
						.sort()
						.join(",")}]`;
				/**
				 * The text the page renders. A `<script>` / `<style>` body is data, not
				 * rendered text, and is minified in its own right (the JSON of an
				 * `application/ld+json` block, the CSS of a `<style>`), so it is not
				 * part of this comparison.
				 * @param {Document} doc the parsed document
				 * @returns {string} the rendered text
				 */
				const renderedText = (doc) => {
					if (!doc.body) return "";
					const clone = /** @type {HTMLElement} */ (doc.body.cloneNode(true));
					for (const el of clone.querySelectorAll("script,style")) el.remove();
					return clone.textContent || "";
				};
				/** @type {{ name: string, why: string }[]} */
				const found = [];
				for (const one of cases) {
					const rawDoc = new DOMParser().parseFromString(one.raw, "text/html");
					const minDoc = new DOMParser().parseFromString(one.min, "text/html");
					// Whitespace between inline elements is rendered, so it must survive.
					if (renderedText(rawDoc) !== renderedText(minDoc)) {
						found.push({ name: one.name, why: "rendered text differs" });
						continue;
					}
					const rawEls = [...rawDoc.querySelectorAll("*")];
					const minEls = [...minDoc.querySelectorAll("*")];
					if (rawEls.length !== minEls.length) {
						found.push({
							name: one.name,
							why: `element count ${rawEls.length} vs ${minEls.length}`
						});
						continue;
					}
					for (let i = 0; i < rawEls.length; i++) {
						const before = shape(rawEls[i]);
						const after = shape(minEls[i]);
						if (before !== after) {
							found.push({
								name: one.name,
								why: `element ${i}: ${before} vs ${after}`
							});
							break;
						}
					}
				}
				return found;
			}, htmlCorpus);
			// The element tree and the rendered text are the DOM the page builds — no
			// minification may change either, except where a defect is recorded.
			expect(
				differences.filter(
					(one) => KNOWN_HTML_DEFECTS.get(one.name) !== one.why
				)
			).toEqual([]);
			// Every recorded defect must still reproduce: fixing one fails here, which
			// is the prompt to delete its entry.
			expect(differences.map((one) => one.name).sort()).toEqual(
				[...KNOWN_HTML_DEFECTS.keys()].sort()
			);
		},
		600000
	);

	itChrome(
		"should build the same CSSOM from a stylesheet and its minified form",
		async () => {
			if (!page) {
				console.warn("Skipping: could not launch Chrome via puppeteer-core.");
				return;
			}
			const differences = await page.evaluate((cases) => {
				const probe = document.createElement("div");
				document.body.append(probe);
				/**
				 * The engine's computed value for every property a declaration sets, so
				 * an equivalent respelling (`bold` / `700`, `300ms` / `0.3s`, `1.5pt` /
				 * `2px`) compares equal and an unsafe one does not.
				 * @param {string} declaration the declaration block
				 * @returns {string} its computed form
				 */
				const computed = (declaration) => {
					probe.style.cssText = "";
					probe.style.cssText = declaration;
					const style = getComputedStyle(probe);
					/** @type {string[]} */
					const out = [];
					for (const property of probe.style) {
						out.push(`${property}:${style.getPropertyValue(property)}`);
					}
					return out.sort().join(";");
				};
				/**
				 * Declaration-bearing rules in order. An empty rule is dropped by the
				 * minifier and an at-rule prelude may be respelled (`(min-width: 1px)` /
				 * `(width >= 1px)`), so neither is compared.
				 * @param {string} source the stylesheet
				 * @returns {{ sel: string, decl: string }[] | null} its rules, or null when it does not parse
				 */
				const rules = (source) => {
					const sheet = new CSSStyleSheet();
					try {
						sheet.replaceSync(source);
					} catch (_err) {
						return null;
					}
					/** @type {{ sel: string, decl: string }[]} */
					const out = [];
					/**
					 * @param {CSSRuleList} list rules to walk
					 */
					const walk = (list) => {
						for (const rule of list) {
							const nested = /** @type {CSSGroupingRule} */ (rule).cssRules;
							if (nested) {
								walk(nested);
								continue;
							}
							const style = /** @type {CSSStyleRule} */ (rule).style;
							// An empty rule renders nothing, so dropping it is safe.
							if (!style || style.length === 0) continue;
							out.push({
								sel:
									/** @type {CSSStyleRule} */ (rule).selectorText ||
									/** @type {CSSKeyframeRule} */ (rule).keyText ||
									"",
								decl: computed(style.cssText)
							});
						}
					};
					walk(sheet.cssRules);
					return out;
				};
				/** @type {{ name: string, why: string }[]} */
				const found = [];
				for (const one of cases) {
					const raw = rules(one.raw);
					const min = rules(one.min);
					if (raw === null || min === null) {
						found.push({ name: one.name, why: "stylesheet did not parse" });
						continue;
					}
					// A rule the minifier drops shifts every rule after it, so compare by
					// selector rather than by position.
					const bySelector = new Map();
					for (const rule of min) {
						if (!bySelector.has(rule.sel)) bySelector.set(rule.sel, []);
						bySelector.get(rule.sel).push(rule.decl);
					}
					for (const rule of raw) {
						const candidates = bySelector.get(rule.sel);
						if (candidates === undefined || candidates.length === 0) continue;
						const index = candidates.indexOf(rule.decl);
						if (index === -1) {
							found.push({
								name: one.name,
								why: `${rule.sel}: computed ${rule.decl} vs ${candidates[0]}`
							});
							break;
						}
						candidates.splice(index, 1);
					}
				}
				return found;
			}, cssCorpus);
			// Where both stylesheets carry the same rule, the engine must compute the
			// same style from it — that is what "safely minified" means.
			expect(differences).toEqual([]);
		},
		600000
	);
});
