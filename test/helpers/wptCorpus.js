"use strict";

// Discovery for the `test/wpt` corpus, shared by the engine-free conformance
// suite and the browser-equivalence suite so both read one corpus the same way.
// An absent submodule yields empty lists; each suite decides what to do with that.

const fs = require("fs");
const path = require("path");

const WPT = path.resolve(__dirname, "../wpt");

// Documents parsed as XML rather than HTML. webpack implements the HTML spec's
// tree construction, so an XHTML tree legitimately differs — they are not ours.
const XML_EXTENSIONS = new Set([".xht", ".xhtml", ".xml", ".svg"]);

// The subset handed to a real browser. Every document goes through the
// engine-free tier; Chrome is asked about a focused sample instead, because
// reading a page's facets and the CSSOM of every stylesheet in it costs far more
// per document than parsing it does — the syntax tests, and the cascade and
// color tests, whose documents carry the inline `<style>` and `style=""` an
// engine has to agree about.
const BROWSER_SUBSET = ["html/syntax", "css/css-cascade", "css/css-color"];

// Every directory the engine-free suite reads — the whole HTML corpus, `css/`
// included, since a CSS test is an HTML document too.
const FULL_SUBSET = [
	"html",
	"css",
	"conformance-checkers/html",
	"conformance-checkers/html-aria",
	"dom/nodes"
];

/**
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @param {string[]} out collected paths
 */
const walk = (dir, extension, out) => {
	/** @type {fs.Dirent[]} */
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (_err) {
		return;
	}
	for (const entry of entries) {
		if (entry.name === ".git") continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, extension, out);
		else if (entry.name.endsWith(extension)) out.push(full);
	}
};

/**
 * @param {string[]} roots corpus-relative directories
 * @returns {string[]} sorted absolute paths of every HTML document under them
 */
const htmlFiles = (roots) => {
	/** @type {string[]} */
	const files = [];
	for (const root of roots) walk(path.join(WPT, root), ".html", files);
	// `.html` is the HTML-parsed extension, but a few generated names carry a
	// second one — drop anything an engine would parse as XML.
	return files
		.filter(
			(file) => !XML_EXTENSIONS.has(path.extname(path.basename(file, ".html")))
		)
		.sort();
};

const UTF8 = new TextDecoder("utf-8", { fatal: true });

/**
 * A document's text, or null when it is not UTF-8 — the encoding tests carry
 * UTF-16 and windows-1251 fixtures, which are not source a string API can read.
 * @param {string} file absolute path
 * @returns {string | null} the document
 */
const readDocument = (file) => {
	const bytes = fs.readFileSync(file);
	// A NUL byte is legal UTF-8, so decoding alone does not catch the UTF-16
	// fixtures written without a BOM — no HTML document carries one otherwise.
	if (bytes.includes(0)) return null;
	try {
		return UTF8.decode(bytes);
	} catch (_err) {
		return null;
	}
};

/** @returns {boolean} whether the submodule is checked out */
const hasCorpus = () => fs.existsSync(path.join(WPT, "html"));

/** @type {Map<string, string[]>} the corpus does not change during a run */
const walked = new Map();

/**
 * @param {string} key which corpus
 * @param {() => string[]} build the walk
 * @returns {string[]} sorted absolute paths
 */
const once = (key, build) => {
	let files = walked.get(key);
	if (files === undefined) {
		files = build();
		walked.set(key, files);
	}
	return files;
};

/** @returns {string[]} sorted absolute paths for the engine-free suite */
const fullCorpus = () => once("full", () => htmlFiles(FULL_SUBSET));

/** @returns {string[]} sorted absolute paths for the browser suite */
const browserCorpus = () => once("browser", () => htmlFiles(BROWSER_SUBSET));

/**
 * Standalone stylesheets — the `.css` a page links rather than inlines, which is
 * the only shape the inline ones cannot stand in for (`@charset`, `@import`).
 * @returns {string[]} sorted absolute paths
 */
const cssCorpus = () =>
	once("css", () => {
		/** @type {string[]} */
		const files = [];
		walk(WPT, ".css", files);
		return files.sort();
	});

/**
 * @param {string} file absolute path
 * @returns {string} its path relative to the repository root, with `/` separators
 */
const nameOf = (file) =>
	path.relative(path.join(__dirname, "../.."), file).replace(/\\/g, "/");

// A `test_valid_value` / `test_invalid_value` call whose arguments are all plain
// string literals: no interpolation, no escapes, no line breaks. The corpus also
// builds calls in loops and from templates, which carry no literal to read — 819
// of the 1267 parsing files have at least one that does.
const VALUE_CALL =
	/\btest_(valid|invalid)_value\(\s*(["'`])((?:(?!\2)[^\\\n])*)\2\s*,\s*(["'`])((?:(?!\4)[^\\\n])*)\4\s*(?:,\s*(["'`])((?:(?!\6)[^\\\n])*)\6\s*)?\)/g;

/**
 * @typedef {object} WptDeclaration
 * @property {boolean} valid whether the spec says the value parses
 * @property {string} property the property name
 * @property {string} value the value as written
 * @property {string} name where it came from, for the failure message
 */

/**
 * Every declaration the CSS parsing tests state a verdict for. These are the
 * spec's own corpus of what a property does and does not accept, which is the
 * input a value printer has to survive.
 * @returns {WptDeclaration[]} the declarations, corpus order
 */
const cssDeclarations = () => {
	/** @type {string[]} */
	const files = [];
	walk(path.join(WPT, "css"), ".html", files);
	files.sort();
	/** @type {WptDeclaration[]} */
	const declarations = [];
	/** @type {Set<string>} */
	const seen = new Set();
	for (const file of files) {
		const text = readDocument(file);
		if (text === null) continue;
		if (
			!text.includes("test_valid_value") &&
			!text.includes("test_invalid_value")
		) {
			continue;
		}
		for (const match of text.matchAll(VALUE_CALL)) {
			const [, kind, , property, , value] = match;
			// A property or value built by interpolation carries no literal.
			if (property.includes("${") || value.includes("${")) continue;
			if (property === "" || value === "") continue;
			const key = `${property}:${value}`;
			if (seen.has(key)) continue;
			seen.add(key);
			declarations.push({
				valid: kind === "valid",
				property,
				value,
				name: `${nameOf(file)} (${property})`
			});
		}
	}
	return declarations;
};

module.exports = {
	WPT,
	browserCorpus,
	cssCorpus,
	cssDeclarations,
	fullCorpus,
	hasCorpus,
	nameOf,
	readDocument
};
