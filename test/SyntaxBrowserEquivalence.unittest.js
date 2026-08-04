"use strict";

const fs = require("fs/promises");
const path = require("path");
const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const { SourceProcessor: HtmlSourceProcessor } = require("../lib/html/syntax");
const launchChrome = require("./helpers/launchChrome");

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

describe("printer output in real Chrome", () => {
	/** @type {import("puppeteer-core").Browser} */
	let browser;
	/** @type {import("puppeteer-core").Page} */
	let page;

	beforeAll(async () => {
		await buildCorpora();
		// The whole corpus is compared in one call per language.
		browser = await launchChrome({ protocolTimeout: 300000 });
		page = await browser.newPage();
		await page.setContent(
			"<!doctype html><html><head></head><body></body></html>"
		);
	}, 300000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	it("should build the same DOM from a page and its minified form", async () => {
		const differences = await page.evaluate((cases) => {
			const probe = document.createElement("div");
			document.body.append(probe);
			/**
			 * The engine's computed value for every property a declaration sets, so
			 * an equivalent respelling (`rgb(255, 0, 0)` / `red`) compares equal.
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
			/** @type {Map<string, string | undefined>} */
			const reflections = new Map();
			/**
			 * The IDL property an attribute reflects through, so the engine's own
			 * parse of the value can be read back: `colspan` is a `number`, a
			 * boolean attribute is a `boolean`, and a set of space-separated tokens
			 * is a `DOMTokenList` whatever element it sits on (`sizes` is one on
			 * `<link>` but a comma-separated list on `<img>`).
			 * @param {Element} node the element carrying it
			 * @param {string} name the attribute name
			 * @returns {string | undefined} the property name, if it reflects
			 */
			const reflectionOf = (node, name) => {
				const key = `${node.localName} ${name}`;
				if (reflections.has(key)) return reflections.get(key);
				// `class` and `for` are the two reflections whose IDL name is not the
				// attribute name with the case put back, and an attribute reflected
				// both ways (`rel` / `relList`) is read as the token list.
				const camel = name.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
				/** @type {string[]} */
				let candidates = [`${camel}List`, camel];
				if (name === "class") candidates = ["classList"];
				else if (name === "for") candidates = ["htmlFor"];
				/** @type {string | undefined} */
				let found;
				for (const candidate of candidates) {
					if (candidate in node) {
						found = candidate;
						break;
					}
				}
				// A `colspan` reflects as `colSpan`, which no rule spells out.
				for (
					let proto = Object.getPrototypeOf(node);
					proto !== null && found === undefined;
					proto = Object.getPrototypeOf(proto)
				) {
					for (const property of Object.getOwnPropertyNames(proto)) {
						if (property.toLowerCase() === name) {
							found = property;
							break;
						}
					}
				}
				reflections.set(key, found);
				return found;
			};
			// Written from the HTML spec's value grammars rather than from
			// `lib/html/data.js`, so the minifier is checked against the spec and
			// not against its own idea of it.
			//
			// "Strip leading and trailing ASCII whitespace", then the URL parser
			// removes every remaining tab and newline.
			const URL_ATTRIBUTES = new Set([
				"action",
				"background",
				"cite",
				"codebase",
				"data",
				"formaction",
				"href",
				"itemid",
				"longdesc",
				"lowsrc",
				"manifest",
				"poster",
				"profile",
				"src"
			]);
			// A comma-separated list whose items are each stripped of leading and
			// trailing ASCII whitespace, and whose empty items are skipped.
			const COMMA_LIST_ATTRIBUTES = new Set([
				"accept",
				"coords",
				"imagesizes",
				"imagesrcset",
				"sizes",
				"srcset"
			]);
			// A space-separated list the engine does not reflect as a DOMTokenList.
			const TOKEN_LIST_ATTRIBUTES = new Set([
				"headers",
				"itemprop",
				"itemref",
				"itemtype",
				"ping"
			]);
			// Set by its presence alone, and parsed by the rules for non-negative
			// integers — for attributes this engine reflects no IDL property for.
			const BOOLEAN_ATTRIBUTES = new Set([
				"alpha",
				"controls",
				"headingreset",
				"itemscope"
			]);
			const INTEGER_ATTRIBUTES = new Set(["headingoffset"]);
			// A dimension value: leading whitespace is skipped and the number is read
			// digit by digit, so leading zeros carry nothing — but a trailing `%` does.
			const DIMENSION_ATTRIBUTES = new Set(["height", "width"]);
			/**
			 * An attribute value with everything the spec calls insignificant
			 * removed, so a respelling the engine folds away compares equal.
			 * @param {Element} node the element carrying it
			 * @param {Attr} attribute the attribute
			 * @returns {string} its normalized value
			 */
			const value = (node, attribute) => {
				const name = attribute.name;
				const raw = attribute.value;
				if (attribute.namespaceURI !== null) return raw;
				if (name === "style") return computed(raw);
				const property = reflectionOf(node, name);
				const properties = /** @type {Record<string, unknown>} */ (
					/** @type {unknown} */ (node)
				);
				const reflected =
					property === undefined ? undefined : properties[property];
				if (typeof reflected === "boolean") return "";
				if (typeof reflected === "number") return String(reflected);
				if (reflected instanceof DOMTokenList) {
					return [...reflected].sort().join(" ");
				}
				if (BOOLEAN_ATTRIBUTES.has(name)) return "";
				if (INTEGER_ATTRIBUTES.has(name)) {
					return String(Number.parseInt(raw, 10));
				}
				if (DIMENSION_ATTRIBUTES.has(name)) {
					const parsed = /^[\t\n\f\r ]*(\d+(?:\.\d+)?)([%*]?)/.exec(raw);
					return parsed === null
						? raw
						: `${Number.parseFloat(parsed[1])}${parsed[2]}`;
				}
				if (URL_ATTRIBUTES.has(name)) {
					return raw.replace(/[\t\n\r]/g, "").trim();
				}
				if (TOKEN_LIST_ATTRIBUTES.has(name)) {
					return raw
						.split(/[\t\n\f\r ]+/)
						.filter(Boolean)
						.sort()
						.join(" ");
				}
				// The viewport meta is a comma-separated list of `key=value` pairs;
				// every other `content` is opaque text.
				if (
					COMMA_LIST_ATTRIBUTES.has(name) ||
					(name === "content" &&
						node.localName === "meta" &&
						(node.getAttribute("name") || "").toLowerCase() === "viewport")
				) {
					return raw
						.split(",")
						.map((one) => one.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, ""))
						.filter(Boolean)
						.join(",");
				}
				return raw;
			};
			/**
			 * An element as namespace, name and attributes.
			 * @param {Element} node an element
			 * @returns {string} its shape
			 */
			const shape = (node) =>
				`${node.namespaceURI}|${node.localName}[${[...node.attributes]
					.map((one) => `${one.name}=${value(node, one)}`)
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
		// minification may change either.
		expect(differences).toEqual([]);
	}, 600000);

	it("should build the same CSSOM from a stylesheet and its minified form", async () => {
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
				// Merging a rule into an earlier one shifts every rule after it, so
				// match by selector rather than by position.
				const bySelector = new Map();
				for (const rule of min) {
					if (!bySelector.has(rule.sel)) bySelector.set(rule.sel, []);
					bySelector.get(rule.sel).push(rule.decl);
				}
				for (const rule of raw) {
					const candidates = bySelector.get(rule.sel);
					if (candidates === undefined || candidates.length === 0) {
						found.push({ name: one.name, why: `${rule.sel}: rule dropped` });
						break;
					}
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
	}, 600000);
});
