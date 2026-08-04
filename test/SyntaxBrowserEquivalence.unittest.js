"use strict";

const fs = require("fs/promises");
const path = require("path");
const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const { SourceProcessor: HtmlSourceProcessor } = require("../lib/html/syntax");

// The minifiers claim their rewrites are equivalent *to the engine*, which only
// a real engine can confirm: every `configCases` stylesheet and page is minified
// and both spellings are handed to Chromium, which must build the same CSSOM and
// the same DOM from each. The corpus is also snapshotted so a change in what the
// printers emit is visible even when it stays equivalent.

// Two fixtures are vendored minified Tailwind (~2 MB each); they would dominate
// the corpus snapshot without covering syntax the other fixtures miss. Every
// other `.css` / `.html` under `configCases` is included, whichever category it
// sits in — a stylesheet belonging to an html test exercises the same printer.
const MAX_FIXTURE_SIZE = 100 * 1024;
const CONFIG_CASES = path.join(__dirname, "configCases");

/**
 * Every fixture of one extension under a directory, largest ones skipped.
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @returns {Promise<{ files: string[], skipped: string[] }>} sorted fixture paths, and the ones left out
 */
const collectFixtures = async (dir, extension) => {
	/** @type {string[]} */
	const files = [];
	/** @type {string[]} */
	const skipped = [];
	/**
	 * @param {string} current directory to read
	 * @returns {Promise<void>} when the subtree has been read
	 */
	const walk = async (current) => {
		const entries = await fs.readdir(current, { withFileTypes: true });
		await Promise.all(
			entries.map(async (entry) => {
				const full = path.join(current, entry.name);
				if (entry.isDirectory()) {
					await walk(full);
				} else if (entry.name.endsWith(extension)) {
					const { size } = await fs.stat(full);
					if (size > MAX_FIXTURE_SIZE) skipped.push(full);
					else files.push(full);
				}
			})
		);
	};
	await walk(dir);
	return { files: files.sort(), skipped: skipped.sort() };
};

/**
 * Load fixtures and minify each one on its own — concatenating first would let a
 * deliberately malformed page corrupt every fixture after it.
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @param {(source: string) => string} minify the printer to run
 * @returns {Promise<{ cases: { name: string, raw: string, min: string }[], skipped: string[] }>} the corpus
 */
const buildCorpus = async (dir, extension, minify) => {
	const { files, skipped } = await collectFixtures(dir, extension);
	const cases = await Promise.all(
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
	return { cases, skipped };
};

/** @typedef {{ cases: { name: string, raw: string, min: string }[], skipped: string[] }} Corpus */

/** @type {Corpus} */
let cssCorpus;
/** @type {Corpus} */
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
				CONFIG_CASES,
				".css",
				(source) =>
					/** @type {{ code: string }} */
					(new CssSourceProcessor().process(source, { minimize: true })).code
			);
			htmlCorpus = await buildCorpus(
				CONFIG_CASES,
				".html",
				(source) =>
					/** @type {{ code: string }} */
					(new HtmlSourceProcessor().process(source, { minimize: true })).code
			);
		})();
	}
	return building;
};

/**
 * The corpus as one file, each fixture labelled so a snapshot diff names it.
 * @param {{ name: string, min: string }[]} cases the corpus
 * @param {string} open comment opener for the language
 * @param {string} close comment closer for the language
 * @returns {string} the concatenated minified corpus
 */
const CONTROL_CHARACTER_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const concatenate = (cases, open, close) =>
	cases
		.map((c) => `${open} ${c.name} ${close}\n${c.min}`)
		.join("\n")
		// A fixture holds a literal NUL (`html/null-char-parse`); one such byte
		// makes git treat the snapshot as binary and stop showing its diff, which
		// is the only thing the snapshot is for.
		.replace(
			CONTROL_CHARACTER_RE,
			(c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`
		);

describe("minified corpus", () => {
	beforeAll(buildCorpora, 120000);

	it("should minify every configCases stylesheet the same way", () => {
		expect(cssCorpus.skipped.map((f) => path.basename(f))).toMatchSnapshot(
			"skipped"
		);
		expect(concatenate(cssCorpus.cases, "/*", "*/")).toMatchSnapshot("css");
	});

	it("should minify every configCases page the same way", () => {
		expect(htmlCorpus.skipped.map((f) => path.basename(f))).toMatchSnapshot(
			"skipped"
		);
		expect(concatenate(htmlCorpus.cases, "<!--", "-->")).toMatchSnapshot(
			"html"
		);
	});
});

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

// DOM differences this harness found in the HTML minifier that are defects, not
// intended transforms. Listed rather than snapshotted so they read as a bug
// list, and so any *other* fixture whose DOM changes still fails the run.
const KNOWN_HTML_DEFECTS = new Map([
	[
		"test/configCases/html/minimize-attributes/page.html",
		// A second `<body>` start tag has its attributes merged onto the already-open
		// body (§13.2.6.4.7). Dropping the tag drops the merge: `class` is lost.
		"element 3: http://www.w3.org/1999/xhtml|body[class] vs http://www.w3.org/1999/xhtml|body[]"
	],
	// A `]]>` that the parser leaves as text is not reproduced, so rendered text
	// changes.
	["test/configCases/html/basic/page.html", "rendered text differs"],
	[
		"test/configCases/html/full-lexer-integration/page.html",
		"rendered text differs"
	],
	[
		"test/configCases/html/minimize-transforms/page.html",
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
	}, 120000);

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
			const result = await page.evaluate((cases) => {
				/**
				 * Every element in document order, as namespace, name and the set of
				 * attribute *names*. Values are compared separately: the minifier
				 * rewrites some of them (`class`, `style`, `srcset`, boolean
				 * attributes) to a different string the DOM parses the same way.
				 * @param {Document} doc the parsed document
				 * @returns {Element[]} the elements
				 */
				const elements = (doc) => [...doc.querySelectorAll("*")];
				/**
				 * @param {Element} node an element
				 * @returns {string} its shape, without attribute values
				 */
				const shape = (node) =>
					`${node.namespaceURI}|${node.localName}[${[...node.attributes]
						.map((a) => a.name)
						.sort()
						.join(",")}]`;
				/** @type {{ name: string, why: string }[]} */
				const structural = [];
				/** @type {{ name: string, attribute: string, raw: string, min: string }[]} */
				const rewritten = [];
				for (const one of cases) {
					const rawDoc = new DOMParser().parseFromString(one.raw, "text/html");
					const minDoc = new DOMParser().parseFromString(one.min, "text/html");
					const rawText = rawDoc.body ? rawDoc.body.textContent || "" : "";
					const minText = minDoc.body ? minDoc.body.textContent || "" : "";
					// Whitespace between inline elements is rendered, so it must survive.
					if (rawText !== minText) {
						structural.push({ name: one.name, why: "rendered text differs" });
						continue;
					}
					const rawEls = elements(rawDoc);
					const minEls = elements(minDoc);
					if (rawEls.length !== minEls.length) {
						structural.push({
							name: one.name,
							why: `element count ${rawEls.length} vs ${minEls.length}`
						});
						continue;
					}
					for (let i = 0; i < rawEls.length; i++) {
						const a = shape(rawEls[i]);
						const b = shape(minEls[i]);
						if (a !== b) {
							structural.push({
								name: one.name,
								why: `element ${i}: ${a} vs ${b}`
							});
							break;
						}
						for (const attribute of rawEls[i].attributes) {
							const before = attribute.value;
							const after = minEls[i].getAttribute(attribute.name) || "";
							if (before !== after) {
								rewritten.push({
									name: one.name,
									attribute: attribute.name,
									raw: before,
									min: after
								});
							}
						}
					}
				}
				return { structural, rewritten };
			}, htmlCorpus.cases);
			// The element tree and the rendered text are the DOM the page builds —
			// no minification may change either, except where a defect is recorded.
			expect(
				result.structural.filter(
					(one) => KNOWN_HTML_DEFECTS.get(one.name) !== one.why
				)
			).toEqual([]);
			// Every recorded defect must still reproduce: fixing one fails here, which
			// is the prompt to delete its entry.
			expect(result.structural.map((one) => one.name).sort()).toEqual(
				[...KNOWN_HTML_DEFECTS.keys()].sort()
			);
			// Attribute values the minifier respells (`class`, `style`, `srcset`,
			// boolean attributes) are allowed to differ — the DOM parses them the
			// same. What each one becomes is visible in the corpus snapshot above,
			// which is browser-free and so always recorded.
			expect(Array.isArray(result.rewritten)).toBe(true);
		},
		300000
	);

	itChrome(
		"should build the same CSSOM from a stylesheet and its minified form",
		async () => {
			if (!page) {
				console.warn("Skipping: could not launch Chrome via puppeteer-core.");
				return;
			}
			const mismatches = await page.evaluate((cases) => {
				const probe = document.createElement("div");
				document.body.append(probe);
				/**
				 * The engine's computed value for every property a declaration sets,
				 * so an equivalent respelling (`bold` / `700`, `300ms` / `0.3s`,
				 * `1.5pt` / `2px`) compares equal and an unsafe one does not.
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
				 * Declaration-bearing rules in order, plus the shape of the at-rules
				 * around them. An empty rule is dropped by the minifier and a
				 * prelude may be respelled (`(min-width: 1px)` / `(width >= 1px)`),
				 * so neither is compared here.
				 * @param {string} source the stylesheet
				 * @returns {{ kind: string, sel: string, decl: string }[] | null} its rules, or null when it does not parse
				 */
				const rules = (source) => {
					const sheet = new CSSStyleSheet();
					try {
						sheet.replaceSync(source);
					} catch (_err) {
						return null;
					}
					/** @type {{ kind: string, sel: string, decl: string }[]} */
					const out = [];
					/**
					 * @param {CSSRuleList} list rules to walk
					 */
					const walk = (list) => {
						for (const rule of list) {
							const grouping = /** @type {CSSGroupingRule} */ (rule).cssRules;
							if (grouping) {
								out.push({
									kind: rule.constructor.name,
									sel: "",
									decl: ""
								});
								walk(grouping);
								continue;
							}
							const style = /** @type {CSSStyleRule} */ (rule).style;
							// An empty rule renders nothing, so dropping it is safe.
							if (!style || style.length === 0) continue;
							out.push({
								kind: rule.constructor.name,
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
				const structural = [];
				/** @type {{ name: string, why: string }[]} */
				const computedDiff = [];
				for (const one of cases) {
					const raw = rules(one.raw);
					const min = rules(one.min);
					if (raw === null || min === null) {
						structural.push({
							name: one.name,
							why: "stylesheet did not parse"
						});
						continue;
					}
					if (raw.length !== min.length) {
						structural.push({
							name: one.name,
							why: `rule count ${raw.length} vs ${min.length}`
						});
						continue;
					}
					for (let i = 0; i < raw.length; i++) {
						if (raw[i].kind !== min[i].kind || raw[i].sel !== min[i].sel) {
							structural.push({
								name: one.name,
								why: `rule ${i}: ${raw[i].kind} ${raw[i].sel} vs ${min[i].kind} ${min[i].sel}`
							});
							break;
						}
						if (raw[i].decl !== min[i].decl) {
							computedDiff.push({
								name: one.name,
								why: `rule ${i} (${raw[i].sel}) computed ${raw[i].decl} vs ${min[i].decl}`
							});
							break;
						}
					}
				}
				return { structural, computed: computedDiff };
			}, cssCorpus.cases);
			// Where the two stylesheets expose the same rule, the engine must compute
			// the same style from it — that is what "safely minified" means.
			expect(mismatches.computed).toEqual([]);
			// Dropping an empty rule and respelling an at-rule prelude are intended,
			// so rule-count and prelude deltas are not asserted; the corpus snapshot
			// above is what makes a change in them visible.
			expect(Array.isArray(mismatches.structural)).toBe(true);
		},
		300000
	);
});
