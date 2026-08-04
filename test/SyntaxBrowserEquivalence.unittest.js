"use strict";

const fs = require("fs/promises");
const path = require("path");
const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const { SourceProcessor: HtmlSourceProcessor } = require("../lib/html/syntax");
const launchChrome = require("./helpers/launchChrome");

// The minifiers claim their rewrites are equivalent *to the engine*, which only
// an engine can confirm: every `configCases` stylesheet and page is minified and
// both spellings are handed to Chromium, which must build the same document and
// compute the same style from each. Nothing here is snapshotted — the assertion
// is the equivalence itself, and the printers' output is snapshotted by the
// suites that test printing.
//
// Nothing is compared as text where the engine can be asked instead: an
// attribute value is read back through its IDL reflection, a declaration through
// its computed style, and an at-rule condition through what it answers at every
// viewport and container size that could tell two conditions apart. The one
// thing an engine cannot answer for is syntax it does not implement — a property
// Chromium drops is absent from both stylesheets, so "computes the same style"
// is undefined for it. Everything else is compared.

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

/**
 * @typedef {{ kind: string, cond: string }} Condition
 * @typedef {{ chain: Condition[], text: string }} Rule
 * @typedef {{ facets: Record<string, string[]>, styles: Rule[][] }} Facets
 */

/**
 * @typedef {object} PageHelpers
 * @property {(source: string) => Rule[] | null} cssRules the rules of a stylesheet, in cascade order
 * @property {(html: string) => Facets} htmlFacets everything a page's DOM is made of
 * @property {(conds: string[], sizes: number[]) => string[]} containerSignatures which sizes each container query holds at
 * @property {(conds: string[]) => string[]} supportsSignatures whether each support condition holds
 */

/**
 * Installed once into the page. Everything both suites need lives here so an
 * inline `<style>` is held to exactly the same standard as a `.css` file.
 * @returns {void}
 */
const installHelpers = () => {
	const NS_HTML = "http://www.w3.org/1999/xhtml";
	const probe = document.createElement("div");
	document.body.append(probe);

	/**
	 * The engine's computed value for every property a declaration sets, so an
	 * equivalent respelling (`bold` / `700`, `300ms` / `0.3s`, `rgb(255, 0, 0)` /
	 * `red`) compares equal and an unsafe one does not.
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
	 * Every rule of a stylesheet in cascade order, each carrying the chain of
	 * at-rules it sits under — so a rule that moves between two `@media` blocks
	 * cannot compare equal. Order is kept because two rules of equal specificity
	 * are resolved by it. A condition is returned as written; the caller replaces
	 * it with what the engine makes of it.
	 * @param {string} source the stylesheet
	 * @returns {Rule[] | null} its rules, or null when it does not parse
	 */
	const cssRules = (source) => {
		const sheet = new CSSStyleSheet();
		try {
			sheet.replaceSync(source);
		} catch (_err) {
			return null;
		}
		/** @type {Rule[]} */
		const out = [];
		/**
		 * @param {CSSRule} rule any rule
		 * @returns {string} the text before its block
		 */
		const prelude = (rule) => {
			const text = rule.cssText;
			const brace = text.indexOf("{");
			return (brace === -1 ? text : text.slice(0, brace)).trim();
		};
		/**
		 * A grouping rule as the kind of at-rule it is and the condition it holds
		 * under, read through the API that normalizes it where one exists.
		 * @param {CSSRule} rule a grouping rule
		 * @returns {Condition} its kind and condition
		 */
		const conditionOf = (rule) => {
			const at = /^@([a-zA-Z-]+)/.exec(rule.cssText);
			const kind = at === null ? "" : at[1].toLowerCase();
			if (kind === "media") {
				return {
					kind,
					cond: /** @type {CSSMediaRule} */ (rule).media.mediaText
				};
			}
			if (kind === "container") {
				const container = /** @type {CSSContainerRule} */ (rule);
				return {
					kind,
					cond: `${container.containerName || ""}|${container.containerQuery}`
				};
			}
			if (kind === "supports") {
				return {
					kind,
					cond: /** @type {CSSSupportsRule} */ (rule).conditionText
				};
			}
			// A `@layer`, `@keyframes` or `@scope` prelude names or selects; there is
			// nothing to evaluate, so it stands as written.
			return { kind, cond: prelude(rule) };
		};
		/**
		 * @param {CSSRuleList} list rules to walk
		 * @param {Condition[]} chain the enclosing at-rules
		 */
		const walk = (list, chain) => {
			for (const rule of list) {
				const nested = /** @type {CSSGroupingRule} */ (rule).cssRules;
				if (nested) {
					walk(nested, [...chain, conditionOf(rule)]);
					continue;
				}
				const style = /** @type {CSSStyleRule} */ (rule).style;
				// `@import`, `@namespace` and `@property` declare nothing, so they are
				// compared as written.
				if (!style) {
					out.push({ chain, text: rule.cssText });
					continue;
				}
				// An empty rule renders nothing, so dropping it is safe.
				if (style.length === 0) continue;
				// A bare declaration block nested in a rule stands for `& { … }`.
				const label =
					/** @type {CSSStyleRule} */ (rule).selectorText ||
					/** @type {CSSKeyframeRule} */ (rule).keyText ||
					(rule.cssText.includes("{") ? prelude(rule) : "&");
				out.push({
					chain,
					text: `${label} { ${computed(style.cssText)} }`
				});
			}
		};
		walk(sheet.cssRules, []);
		return out;
	};

	/** @type {Map<string, string | undefined>} */
	const reflections = new Map();

	/**
	 * The IDL property an attribute reflects through, so the engine's own parse of
	 * the value can be read back: `colspan` is a `number`, a boolean attribute is
	 * a `boolean`, and a set of space-separated tokens is a `DOMTokenList`
	 * whatever element it sits on (`sizes` is one on `<link>` but a
	 * comma-separated list on `<img>`).
	 * @param {Element} node the element carrying it
	 * @param {string} name the attribute name
	 * @returns {string | undefined} the property name, if it reflects
	 */
	const reflectionOf = (node, name) => {
		const key = `${node.localName} ${name}`;
		if (reflections.has(key)) return reflections.get(key);
		// `class` and `for` are the two reflections whose IDL name is not the
		// attribute name with the case put back, and an attribute reflected both
		// ways (`rel` / `relList`) is read as the token list.
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
	// `lib/html/data.js`, so the minifier is checked against the spec and not
	// against its own idea of it.
	//
	// "Strip leading and trailing ASCII whitespace", then the URL parser removes
	// every remaining tab and newline.
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
	// A comma-separated list whose items are each stripped of leading and trailing
	// ASCII whitespace, and whose empty items are skipped.
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
	 * An attribute value with everything the spec calls insignificant removed, so
	 * a respelling the engine folds away compares equal.
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
		const reflected = property === undefined ? undefined : properties[property];
		if (typeof reflected === "boolean") return "";
		if (typeof reflected === "number") return String(reflected);
		if (reflected instanceof DOMTokenList) {
			return [...reflected].sort().join(" ");
		}
		if (BOOLEAN_ATTRIBUTES.has(name)) return "";
		if (INTEGER_ATTRIBUTES.has(name)) return String(Number.parseInt(raw, 10));
		if (DIMENSION_ATTRIBUTES.has(name)) {
			const parsed = /^[\t\n\f\r ]*(\d+(?:\.\d+)?)([%*]?)/.exec(raw);
			return parsed === null
				? raw
				: `${Number.parseFloat(parsed[1])}${parsed[2]}`;
		}
		if (URL_ATTRIBUTES.has(name)) return raw.replace(/[\t\n\r]/g, "").trim();
		if (TOKEN_LIST_ATTRIBUTES.has(name)) {
			return raw
				.split(/[\t\n\f\r ]+/)
				.filter(Boolean)
				.sort()
				.join(" ");
		}
		// The viewport meta is a comma-separated list of `key=value` pairs; every
		// other `content` is opaque text.
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
	 * An element as depth, namespace, name and attributes — everything the parser
	 * must build the same, and nothing the printer may respell. Attribute order,
	 * quoting, entity spelling and omitted end tags are all free to differ. The
	 * depth is what makes the flat element list in document order stand for the
	 * tree, so re-parenting cannot pass unseen.
	 * @param {Element} node an element
	 * @param {number} depth how deep it sits
	 * @returns {string} its shape
	 */
	const shapeOf = (node, depth) =>
		`${depth}|${node.namespaceURI}|${node.localName}[${[...node.attributes]
			.map((one) => `${one.name}=${value(node, one)}`)
			.sort()
			.join(",")}]`;

	/**
	 * The text a subtree renders. A `<script>` / `<style>` body is data, compared
	 * as CSS or JSON in its own right.
	 * @param {ParentNode & Node} root the subtree
	 * @returns {string} its rendered text
	 */
	const renderedTextOf = (root) => {
		const clone = /** @type {ParentNode & Node} */ (root.cloneNode(true));
		for (const el of clone.querySelectorAll("script,style")) el.remove();
		return clone.textContent || "";
	};

	/**
	 * Every part of a page's DOM, split by kind so a mismatch says which. A
	 * `<style>` body is read as CSS and a JSON `<script>` as JSON, because both
	 * are minified in their own right; every other script body is data and must
	 * survive byte for byte.
	 * @param {string} html the page
	 * @returns {Facets} its facets
	 */
	const htmlFacets = (html) => {
		const doc = new DOMParser().parseFromString(html, "text/html");
		/** @type {Record<string, string[]>} */
		const facets = {
			elements: [],
			comments: [],
			scripts: [],
			templates: []
		};
		/** @type {Rule[][]} */
		const styles = [];
		/**
		 * @param {ParentNode} root the subtree root
		 * @param {number} depth how deep its children sit
		 */
		const collect = (root, depth) => {
			for (const node of root.childNodes) {
				if (node.nodeType === Node.COMMENT_NODE) {
					facets.comments.push(/** @type {Comment} */ (node).data);
					continue;
				}
				if (node.nodeType !== Node.ELEMENT_NODE) continue;
				const element = /** @type {Element} */ (node);
				facets.elements.push(shapeOf(element, depth));
				const name =
					element.namespaceURI === NS_HTML ? element.localName : null;
				const text = element.textContent || "";
				if (name === "style") {
					styles.push(cssRules(text) || [{ chain: [], text }]);
				} else if (name === "script") {
					const type = (element.getAttribute("type") || "").toLowerCase();
					let body = text;
					// An import map and speculation rules are JSON too, though the type
					// does not say so.
					if (
						type.endsWith("json") ||
						type === "importmap" ||
						type === "speculationrules"
					) {
						try {
							body = JSON.stringify(JSON.parse(text));
						} catch (_err) {
							/* not JSON after all — compare it as written */
						}
					}
					facets.scripts.push(`${type}:${body}`);
				} else if (name === "template") {
					const content = /** @type {HTMLTemplateElement} */ (element).content;
					facets.templates.push(renderedTextOf(content));
					collect(content, depth + 1);
				}
				collect(element, depth + 1);
			}
		};
		collect(doc, 0);
		const doctype = doc.doctype;
		// Quirks mode changes layout, so the doctype has to survive as one.
		facets.document = [
			doc.compatMode,
			doctype === null
				? "no doctype"
				: `${doctype.name}|${doctype.publicId}|${doctype.systemId}`
		];
		// What the page renders: the title (whose getter strips and collapses ASCII
		// whitespace, as the spec says a title is read) and the body's text. A
		// `<script>` / `<style>` body is data, compared above; a `<template>`'s
		// content does not render; and the whitespace between two `<head>`
		// children renders nothing either.
		facets.text = [
			doc.title,
			doc.body === null ? "" : renderedTextOf(doc.body)
		];
		return { facets, styles };
	};

	/**
	 * Which of a set of container sizes each query holds at, asked of the engine
	 * by building the container and reading a sentinel back out of it.
	 * @param {string[]} conds `name|query` pairs
	 * @param {number[]} sizes container edge lengths in px
	 * @returns {string[]} one bit per size, per condition
	 */
	const containerSignatures = (conds, sizes) => {
		const holder = document.createElement("div");
		const inner = document.createElement("div");
		inner.className = "eq-probe";
		holder.append(inner);
		document.body.append(holder);
		const sheet = document.createElement("style");
		document.head.append(sheet);
		const out = conds.map((cond) => {
			const split = cond.indexOf("|");
			const named = cond.slice(0, split) || "eq";
			const query = cond.slice(split + 1);
			holder.style.cssText = `container-type: size; container-name: ${named}`;
			sheet.textContent = `@container ${named} ${query} { .eq-probe { --eq-hit: 1 } }`;
			return sizes
				.map((size) => {
					holder.style.width = `${size}px`;
					holder.style.height = `${size}px`;
					const hit = getComputedStyle(inner).getPropertyValue("--eq-hit");
					return hit.trim() === "1" ? "1" : "0";
				})
				.join("");
		});
		holder.remove();
		sheet.remove();
		return out;
	};

	/**
	 * @param {string[]} conds support conditions
	 * @returns {string[]} whether the engine supports each
	 */
	const supportsSignatures = (conds) =>
		conds.map((cond) => (CSS.supports(cond) ? "1" : "0"));

	/** @type {{ __eq: PageHelpers }} */ (/** @type {unknown} */ (window)).__eq =
		{
			cssRules,
			htmlFacets,
			containerSignatures,
			supportsSignatures
		};
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
		await page.evaluate(installHelpers);
	}, 300000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	/**
	 * What the engine makes of every at-rule condition in a set of rules. A
	 * condition is not compared as text: `(min-width: 200px)` and
	 * `(width >= 200px)` are one query written two ways, and the spec says so, so
	 * the engine is asked instead — a media query at every viewport that could
	 * tell two of them apart, a container query at every container size, a
	 * support condition outright. Two conditions that answer alike everywhere are
	 * the same condition.
	 * @param {Rule[][]} groups every rule list to be compared
	 * @returns {Promise<Map<string, string>>} condition to what the engine answers
	 */
	const conditionSignatures = async (groups) => {
		/** @type {Map<string, Set<string>>} */
		const byKind = new Map();
		for (const rules of groups) {
			for (const rule of rules) {
				for (const { kind, cond } of rule.chain) {
					if (!byKind.has(kind)) byKind.set(kind, new Set());
					/** @type {Set<string>} */ (byKind.get(kind)).add(cond);
				}
			}
		}
		/** @type {Map<string, string>} */
		const signatures = new Map();
		// Sample either side of every length any condition names, so a threshold
		// that moved by one pixel separates them.
		const edges = new Set([1, 200, 400, 600, 800, 1024]);
		for (const conds of byKind.values()) {
			for (const cond of conds) {
				for (const [number] of cond.matchAll(/\d+(?:\.\d+)?/g)) {
					const value = Math.round(Number(number));
					if (value > 0 && value < 10000) {
						edges
							.add(value - 1)
							.add(value)
							.add(value + 1);
					}
				}
			}
		}
		const sizes = [...edges].sort((a, b) => a - b);

		const supports = [...(byKind.get("supports") || [])];
		if (supports.length > 0) {
			const answers = await page.evaluate(
				(conds) =>
					/** @type {{ __eq: PageHelpers }} */ (
						/** @type {unknown} */ (window)
					).__eq.supportsSignatures(conds),
				supports
			);
			for (const [i, cond] of supports.entries()) {
				signatures.set(`supports ${cond}`, answers[i]);
			}
		}

		const containers = [...(byKind.get("container") || [])];
		if (containers.length > 0) {
			const answers = await page.evaluate(
				(conds, at) =>
					/** @type {{ __eq: PageHelpers }} */ (
						/** @type {unknown} */ (window)
					).__eq.containerSignatures(conds, at),
				containers,
				sizes
			);
			for (const [i, cond] of containers.entries()) {
				signatures.set(`container ${cond}`, answers[i]);
			}
		}

		const media = [...(byKind.get("media") || [])];
		if (media.length > 0) {
			/** @type {string[]} */
			const bits = media.map(() => "");
			/** @type {{ width: number, height: number }[]} */
			const viewports = [];
			for (const size of sizes) {
				viewports.push({ width: size, height: 600 });
				viewports.push({ width: 600, height: size });
			}
			for (const viewport of viewports) {
				await page.setViewport(viewport);
				const answers = await page.evaluate(
					(conds) =>
						conds.map((cond) => (matchMedia(cond).matches ? "1" : "0")),
					media
				);
				for (const [i, bit] of answers.entries()) bits[i] += bit;
			}
			// Dimensions no viewport can vary: the media type and the user's stated
			// preferences.
			await page.setViewport({ width: 800, height: 600 });
			/** @type {import("puppeteer-core").MediaFeature[][]} */
			const featureSets = [
				[{ name: "prefers-color-scheme", value: "dark" }],
				[{ name: "prefers-color-scheme", value: "light" }],
				[{ name: "prefers-reduced-motion", value: "reduce" }],
				[{ name: "color-gamut", value: "p3" }]
			];
			for (const type of ["screen", "print"]) {
				for (const features of [[], ...featureSets]) {
					await page.emulateMediaType(type);
					await page.emulateMediaFeatures(features);
					const answers = await page.evaluate(
						(conds) =>
							conds.map((cond) => (matchMedia(cond).matches ? "1" : "0")),
						media
					);
					for (const [i, bit] of answers.entries()) bits[i] += bit;
				}
			}
			await page.emulateMediaType(undefined);
			await page.emulateMediaFeatures([]);
			for (const [i, cond] of media.entries()) {
				signatures.set(`media ${cond}`, bits[i]);
			}
		}
		return signatures;
	};

	/**
	 * A rule as the conditions it really holds under and the style it really
	 * computes to.
	 * @param {Rule} rule a rule
	 * @param {Map<string, string>} signatures what the engine answers per condition
	 * @returns {string} its key
	 */
	const keyOf = (rule, signatures) =>
		`${rule.chain
			.map(({ kind, cond }) => {
				const answer = signatures.get(`${kind} ${cond}`);
				return `@${kind}<${answer === undefined ? cond : answer}>`;
			})
			.join(" >> ")} ${rule.text}`;

	/**
	 * @param {Rule[]} before the source's rules
	 * @param {Rule[]} after the minified rules
	 * @param {Map<string, string>} signatures what the engine answers per condition
	 * @returns {string} why they differ, or "" when they do not
	 */
	const compareRules = (before, after, signatures) => {
		const a = before.map((rule) => keyOf(rule, signatures));
		const b = after.map((rule) => keyOf(rule, signatures));
		const shorter = Math.min(a.length, b.length);
		const at = a.slice(0, shorter).findIndex((key, i) => key !== b[i]);
		if (at !== -1) return `rule ${at}: ${a[at]} vs ${b[at]}`;
		if (a.length > b.length) return `rule dropped: ${a[shorter]}`;
		if (b.length > a.length) return `rule added: ${b[shorter]}`;
		return "";
	};

	it("should build the same DOM from a page and its minified form", async () => {
		const collected = await page.evaluate((cases) => {
			const { htmlFacets } = /** @type {{ __eq: PageHelpers }} */ (
				/** @type {unknown} */ (window)
			).__eq;
			return cases.map((one) => ({
				name: one.name,
				before: htmlFacets(one.raw),
				after: htmlFacets(one.min)
			}));
		}, htmlCorpus);
		const signatures = await conditionSignatures(
			collected.flatMap((one) => [...one.before.styles, ...one.after.styles])
		);
		/** @type {{ name: string, why: string }[]} */
		const differences = [];
		for (const { name, before, after } of collected) {
			let why = "";
			for (const facet of Object.keys(before.facets)) {
				const a = before.facets[facet];
				const b = after.facets[facet];
				// A comment renders nothing, so the minifier may drop one; the ones it
				// keeps must be unchanged and still in order.
				if (facet === "comments") {
					let from = 0;
					for (const comment of b) {
						const at = a.indexOf(comment, from);
						if (at === -1) {
							why = `comment is not one of the source's: ${comment}`;
							break;
						}
						from = at + 1;
					}
					if (why !== "") break;
					continue;
				}
				if (a.length !== b.length) {
					why = `${facet}: ${a.length} vs ${b.length}`;
					break;
				}
				const at = a.findIndex((entry, i) => entry !== b[i]);
				if (at !== -1) {
					why = `${facet} ${at}: ${a[at]} vs ${b[at]}`;
					break;
				}
			}
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
			if (why !== "") differences.push({ name, why });
		}
		// Every part of the document the engine builds — the element tree, the
		// rendered text, the comments, the doctype, and the CSS, JSON and script
		// bodies carried inside it — must survive minification unchanged.
		expect(differences).toEqual([]);
	}, 600000);

	it("should build the same CSSOM from a stylesheet and its minified form", async () => {
		const collected = await page.evaluate((cases) => {
			const { cssRules } = /** @type {{ __eq: PageHelpers }} */ (
				/** @type {unknown} */ (window)
			).__eq;
			return cases.map((one) => ({
				name: one.name,
				before: cssRules(one.raw),
				after: cssRules(one.min)
			}));
		}, cssCorpus);
		const signatures = await conditionSignatures(
			collected.flatMap((one) => [one.before || [], one.after || []])
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
		// answers alike, each computing to the same style.
		expect(differences).toEqual([]);
	}, 600000);
});
