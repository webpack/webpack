"use strict";

// Generates stylesheets and documents from fixed seeds and holds webpack's CSS
// and HTML parsers and printers to the syntax invariants and to a real browser:
// the DOM webpack's parser builds against the browser's, each printed document's
// DOM and styles against its source's, each stylesheet's computed styles against
// its source's, and a beautified stylesheet's CSSOM against its source's. Then
// fails on every line of the parsers and printers no generated input reached.

const { createHash } = require("crypto");
const fs = require("fs");
const { Session } = require("inspector");
const path = require("path");
const acorn = require("acorn");

// WHY: V8 counts blocks only in code compiled after counting starts, so this
// runs before anything below loads the syntax.
const session = new Session();
session.connect();
session.post("Profiler.enable");
session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });

const { GENERIC_FONT_FAMILIES } = require("../../lib/css/data");
const { SourceProcessor: CssSourceProcessor } = require("../../lib/css/syntax");
const {
	builtinEmbeddedRenderer
} = require("../../lib/html/builtinEmbeddedRenderer");
const { SourceProcessor: HtmlSourceProcessor } = require("../../lib/html/syntax");
const { parseHtml } = require("../../lib/html/syntax-parser");
const {
	createStylesheetGenerator,
	unwrittenTypes
} = require("../helpers/cssFuzzStylesheet");
const {
	BROWSER_RELATIONS,
	fixtures,
	unexplained
} = require("../helpers/fixture");
const { createDocumentGenerator } = require("../helpers/htmlFuzzDocument");
const { createRandom } = require("../helpers/jsFuzzProgram");
const launchBrowser = require("../helpers/launchBrowser");
const serializeHtmlTree = require("../helpers/serializeHtmlTree");
const {
	CSS_OPT_INS,
	CSS_OPT_IN_RELAX,
	HTML_OPT_INS,
	HTML_OPT_IN_RELAX,
	POLICED_PAGE,
	RENDER_WIDTHS,
	cascadeLines,
	compareRenders,
	compareStyles,
	facetDifference,
	installHelpers,
	numericallyEqual
} = require("../helpers/syntaxEquivalence");
const { invariantFindings } = require("../helpers/syntaxInvariants");
const cssInvariants = require("../helpers/syntaxInvariants/css");
const htmlInvariants = require("../helpers/syntaxInvariants/html");

const FIXTURES = path.join(__dirname, "../fixtures");
// The fixtures this suite writes, each standing for one defect it found.
const FIXTURE_PREFIX = "syntax-fuzz-";
const UNREACHED_FILE = path.join(__dirname, "syntax-fuzz.unreached.json");
/** @type {Record<string, Record<string, number>>} */
const UNREACHED = JSON.parse(fs.readFileSync(UNREACHED_FILE, "utf8"));

/** @typedef {import("../helpers/syntaxEquivalence").Facets} Facets */
/** @typedef {import("../helpers/syntaxEquivalence").PageHelpers} PageHelpers */
/** @typedef {import("../helpers/syntaxEquivalence").Relaxation} Relaxation */
/** @typedef {import("../helpers/syntaxEquivalence").RenderReport} RenderReport */
/** @typedef {import("../helpers/syntaxEquivalence").StyleReport} StyleReport */

/** @typedef {import("../helpers/fixture").KnownDifference} KnownDifference */

/**
 * One relation an input breaks, cut down to the smallest input still breaking it.
 * @typedef {object} Finding
 * @property {string} relation what broke
 * @property {string} preset the print options it broke under, `parse` for the parser
 * @property {string} what how it broke
 * @property {string} source the input, cut down
 * @property {{ relation: string, preset: string, what: string }[]} broken every relation the cut input breaks
 */

const SEEDS = process.env.SYNTAX_FUZZ_SEED
	? [
			process.env.SYNTAX_FUZZ_SEED === "random"
				? Math.floor(Math.random() * 2 ** 31)
				: Number(process.env.SYNTAX_FUZZ_SEED)
		]
	: [1, 2, 3, 4, 5, 6, 7, 8];
/**
 * @param {string | undefined} raw what `SYNTAX_FUZZ_INPUTS` is set to
 * @returns {number} the inputs each seed generates
 */
const inputsPerSeed = (raw) => {
	if (raw === undefined || raw === "") return 100;
	const count = Number(raw);
	if (!Number.isSafeInteger(count) || count < 1) {
		throw new Error(`SYNTAX_FUZZ_INPUTS must be a positive integer, not ${raw}`);
	}
	return count;
};
const INPUTS_PER_SEED = inputsPerSeed(process.env.SYNTAX_FUZZ_INPUTS);
const SEED_TIMEOUT = 600000;
// How many times a finding's input is tried smaller before it stands as found.
const SHRINK_BUDGET = 400;

// The pre-nesting target the lowerings run for, as the CSS invariants name it.
const LEGACY_BROWSERS = ["chrome 100", "firefox 100", "safari 15.4"];

/**
 * @param {Record<string, unknown>} options print options
 * @returns {(css: string) => string} the CSS printer they name
 */
const cssPrinter = (options) => (css) =>
	/** @type {{ code: string }} */ (
		new CssSourceProcessor().process(css, { mode: "minify", ...options })
	).code;

/**
 * @param {Record<string, unknown>} options print options
 * @returns {(html: string) => string} the HTML printer they name
 */
const htmlPrinter = (options) => (html) =>
	/** @type {{ code: string }} */ (
		new HtmlSourceProcessor().process(html, { mode: "minify", ...options })
	).code;

// The option sets the equivalence suite holds its corpora to, and the legacy
// target that runs the lowerings; `relax` sets aside what each rewrites on purpose.
/** @type {{ name: string, print: (source: string) => string, relax: Relaxation[] }[]} */
const CSS_SETS = [
	{ name: "default", print: cssPrinter({ mergeDistantRules: true }), relax: [] },
	{ name: "opt-ins", print: cssPrinter(CSS_OPT_INS), relax: CSS_OPT_IN_RELAX },
	{
		name: "legacy",
		print: cssPrinter({ environment: { browsers: LEGACY_BROWSERS } }),
		relax: ["prefixes"]
	}
];
const beautifyCss = cssPrinter({ mode: "beautify" });

/** @type {{ name: string, print: (source: string) => string, relax: Relaxation[] }[]} */
const HTML_SETS = [
	{ name: "default", print: htmlPrinter({}), relax: [] },
	{
		name: "implied-tags",
		print: htmlPrinter({ removeImpliedTags: true }),
		relax: []
	},
	{
		name: "smart-tags",
		print: htmlPrinter({ removeImpliedTags: "smart" }),
		relax: []
	},
	{ name: "opt-ins", print: htmlPrinter(HTML_OPT_INS), relax: HTML_OPT_IN_RELAX },
	{
		name: "embedded",
		print: htmlPrinter({ renderEmbeddedSource: builtinEmbeddedRenderer() }),
		relax: []
	},
	{ name: "beautify", print: htmlPrinter({ mode: "beautify" }), relax: [] }
];

/**
 * Cut an input down while it still breaks: drop chunks from half its length
 * down to one character, then spell each letter `a` and each digit `0`, keeping
 * each change that still breaks it, so one defect cuts down to one input.
 * @param {string} source the input
 * @param {(source: string) => Promise<boolean>} breaks whether a cut still breaks
 * @returns {Promise<string>} the smallest cut found within the budget
 */
const shrink = async (source, breaks) => {
	let current = source;
	let budget = SHRINK_BUDGET;
	for (
		let size = Math.ceil(current.length / 2);
		size >= 1 && budget > 0;
		size = size === 1 ? 0 : Math.ceil(size / 2)
	) {
		for (let at = 0; at < current.length && budget > 0; ) {
			const cut = current.slice(0, at) + current.slice(at + size);
			budget--;
			if (cut !== current && (await breaks(cut))) {
				current = cut;
			} else {
				at += size;
			}
		}
	}
	for (let at = 0; at < current.length && budget > 0; at++) {
		const char = current[at];
		const plain = /[a-z]/i.test(char) ? "a" : /\d/.test(char) ? "0" : char;
		if (plain === char) continue;
		const respelled = current.slice(0, at) + plain + current.slice(at + 1);
		budget--;
		if (await breaks(respelled)) current = respelled;
	}
	return current;
};

/**
 * A finding is known where some fixture files its relation under its preset:
 * one fixture stands for a defect until its fix retires the entry.
 * @param {{ relation: string, preset: string }} finding what broke
 * @param {KnownDifference[]} known the differences fixtures file
 * @returns {KnownDifference | undefined} the entry that names it
 */
const knownEntry = (finding, known) =>
	known.find(
		(entry) =>
			entry.relation === finding.relation &&
			(entry.presets === undefined || entry.presets.includes(finding.preset))
	);

/**
 * What a seed found that no fixture files. With `SYNTAX_FUZZ_WRITE` set, each
 * cut input is written as a fixture filing everything it breaks, to be named
 * and explained, and counts as known for the seeds after it.
 * @param {Finding[]} findings what broke over a seed and no fixture files
 * @param {KnownDifference[]} known the differences fixtures file, added to
 * @param {"css" | "html"} lang the language
 * @returns {string[]} one report per finding
 */
const unknown = (findings, known, lang) => {
	/** @type {string[]} */
	const out = [];
	for (const finding of findings) {
		out.push(
			`${finding.relation} [${finding.preset}] ${finding.what}\n${JSON.stringify(finding.source)}`
		);
		if (!process.env.SYNTAX_FUZZ_WRITE) continue;
		const digest = createHash("sha256")
			.update(finding.source)
			.digest("hex")
			.slice(0, 8);
		const dir = path.join(FIXTURES, lang, `${FIXTURE_PREFIX}${digest}`);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `index.${lang}`), finding.source);
		/** @type {KnownDifference[]} */
		const entries = [];
		for (const { relation, preset, what } of finding.broken) {
			// A browser's report names the difference first; a relation's repro
			// ends with the printed text it reads.
			const lines = what.split("\n");
			const contains = BROWSER_RELATIONS.has(relation)
				? lines[0]
				: lines[lines.length - 1];
			const same = entries.find(
				(one) => one.relation === relation && one.contains === contains
			);
			if (same === undefined) {
				entries.push({ relation, contains, presets: [preset], why: "" });
			} else if (same.presets && !same.presets.includes(preset)) {
				same.presets.push(preset);
			}
		}
		fs.writeFileSync(
			path.join(dir, "expected.json"),
			`${JSON.stringify(entries, null, "\t")}\n`
		);
		known.push(...entries);
	}
	return out;
};

/**
 * Every difference this suite's fixtures file, each known for its relation
 * under its presets in every seed (`knownEntry`). A fixture outside this suite
 * answers only for its own input, so its entries are left out.
 * @param {"css" | "html"} lang the language
 * @returns {KnownDifference[]} their `expected.json` entries
 */
const knownOf = (lang) =>
	fixtures(lang)
		.filter((entry) => entry.name.startsWith(FIXTURE_PREFIX))
		.flatMap((entry) => [...entry.expected, ...entry.expectedBrowser]);

/**
 * Runs in the page: each document's tree as the browser builds it, in the
 * html5lib format `serializeHtmlTree` writes webpack's in.
 * @param {string[]} documents the documents
 * @returns {string[]} one tree per document
 */
const browserTrees = (documents) => {
	const XLINK = "http://www.w3.org/1999/xlink";
	const XML = "http://www.w3.org/XML/1998/namespace";
	const XMLNS = "http://www.w3.org/2000/xmlns/";
	const PREFIX = {
		"http://www.w3.org/2000/svg": "svg ",
		"http://www.w3.org/1998/Math/MathML": "math "
	};
	/**
	 * @param {Attr} attribute an attribute
	 * @returns {string} its name as html5lib writes it
	 */
	const attributeName = (attribute) => {
		if (attribute.namespaceURI === XLINK) return `xlink ${attribute.localName}`;
		if (attribute.namespaceURI === XML) return `xml ${attribute.localName}`;
		if (attribute.namespaceURI === XMLNS) {
			return attribute.localName === "xmlns"
				? "xmlns"
				: `xmlns ${attribute.localName}`;
		}
		return attribute.localName;
	};
	return documents.map((html) => {
		const doc = new DOMParser().parseFromString(html, "text/html");
		/** @type {string[]} */
		const lines = [];
		/**
		 * @param {Node} parent the node whose children are written
		 * @param {number} depth their depth
		 */
		const write = (parent, depth) => {
			const indent = `| ${"  ".repeat(depth)}`;
			for (const node of parent.childNodes) {
				if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
					const doctype = /** @type {DocumentType} */ (node);
					const ids =
						doctype.publicId !== "" || doctype.systemId !== ""
							? ` "${doctype.publicId}" "${doctype.systemId}"`
							: "";
					lines.push(`${indent}<!DOCTYPE ${doctype.name}${ids}>`);
				} else if (node.nodeType === Node.COMMENT_NODE) {
					lines.push(`${indent}<!-- ${/** @type {Comment} */ (node).data} -->`);
				} else if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
					const instruction = /** @type {ProcessingInstruction} */ (node);
					lines.push(`${indent}<?${instruction.target} ${instruction.data}?>`);
				} else if (node.nodeType === Node.TEXT_NODE) {
					lines.push(`${indent}"${/** @type {Text} */ (node).data}"`);
				} else if (node.nodeType === Node.ELEMENT_NODE) {
					const element = /** @type {Element} */ (node);
					const prefix =
						/** @type {Record<string, string>} */ (PREFIX)[
							element.namespaceURI || ""
						] || "";
					lines.push(`${indent}<${prefix}${element.localName}>`);
					const attributes = [...element.attributes]
						.map((attribute) => [attributeName(attribute), attribute.value])
						.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
					for (const [name, value] of attributes) {
						lines.push(`| ${"  ".repeat(depth + 1)}${name}="${value}"`);
					}
					if (element instanceof HTMLTemplateElement) {
						lines.push(`| ${"  ".repeat(depth + 1)}content`);
						write(element.content, depth + 2);
					} else {
						write(element, depth + 1);
					}
				}
			}
		};
		write(doc, 0);
		return lines.join("\n");
	});
};

/**
 * Runs in the page: each stylesheet's top-level rules as the browser
 * serializes them, read from a `<style>`, which keeps the `@import` rules
 * `replaceSync` drops; the page's policy keeps them from loading.
 * @param {string[]} sheets the stylesheets
 * @returns {string[][]} one list of rules per sheet
 */
const browserRules = (sheets) =>
	sheets.map((text) => {
		const element = document.createElement("style");
		element.textContent = text;
		document.head.append(element);
		const rules = [
			.../** @type {CSSStyleSheet} */ (element.sheet).cssRules
		].map((rule) => rule.cssText);
		element.remove();
		return rules;
	});

/**
 * Runs in the page: each document's facets, as `htmlFacets` reports them.
 * @param {{ source: string, relax: Relaxation[] }[]} documents the documents
 * @returns {Facets[]} one per document
 */
const browserFacets = (documents) => {
	const { htmlFacets } = /** @type {{ __eq: PageHelpers }} */ (
		/** @type {unknown} */ (window)
	).__eq;
	return documents.map(({ source, relax }) => htmlFacets(source, relax));
};

/**
 * Runs in the page: each declared `style` attribute as the browser serializes
 * it, with its element's name, in document order, template contents included.
 * A relaxed set never drops or reorders an element holding declarations.
 * @param {string[]} documents the documents
 * @returns {string[][]} one list per document
 */
const inlineStyles = (documents) =>
	documents.map((html) => {
		/** @type {string[]} */
		const out = [];
		/**
		 * @param {ParentNode} parent where to look
		 * @returns {void}
		 */
		const walk = (parent) => {
			for (const child of parent.children) {
				const text = child.hasAttribute("style")
					? /** @type {HTMLElement} */ (child).style.cssText
					: "";
				if (text !== "") out.push(`${child.localName}{${text}}`);
				if (child instanceof HTMLTemplateElement) walk(child.content);
				walk(child);
			}
		};
		walk(new DOMParser().parseFromString(html, "text/html"));
		return out;
	});

/**
 * Runs in the page: whether each document holds a `style` attribute or a
 * `<style>`, template contents included, as the browser parses it.
 * @param {string[]} documents the documents
 * @returns {boolean[]} one answer per document
 */
const holdsStyles = (documents) =>
	documents.map((html) => {
		/**
		 * @param {ParentNode} parent where to look
		 * @returns {boolean} whether it holds one
		 */
		const holds = (parent) =>
			[...parent.children].some(
				(child) =>
					child.hasAttribute("style") ||
					child.localName === "style" ||
					(child instanceof HTMLTemplateElement && holds(child.content)) ||
					holds(child)
			);
		return holds(new DOMParser().parseFromString(html, "text/html"));
	});

// A string the CSSOM serializes, always double-quoted.
const CSS_STRING = /"(?:[^"\\]|\\.)*"/g;

/**
 * Two serialized rules alike: their strings exactly, the rest within the
 * printer's numeric rounding.
 * @param {string} one a rule
 * @param {string} other another
 * @returns {boolean} whether they are alike
 */
const sameRule = (one, other) =>
	(one.match(CSS_STRING) || []).join("\n") ===
		(other.match(CSS_STRING) || []).join("\n") &&
	numericallyEqual(one.replace(CSS_STRING, '""'), other.replace(CSS_STRING, '""'));

/**
 * @param {string[]} before one sheet's rules
 * @param {string[]} after another's
 * @returns {string} the first rule they differ in, "" when none does
 */
const ruleDifference = (before, after) => {
	if (before.length !== after.length) {
		return `rules: ${before.length} vs ${after.length}`;
	}
	const at = before.findIndex((rule, i) => !sameRule(rule, after[i]));
	return at === -1
		? ""
		: `rule ${at}: ${JSON.stringify(before[at])} vs ${JSON.stringify(after[at])}`;
};

// The files the generated inputs have to reach every line of.
const COVERED_FILES = [
	"lib/css/syntax-parser.js",
	"lib/css/syntax-printer.js",
	"lib/html/syntax-parser.js",
	"lib/html/syntax-printer.js"
];

// A line holding only closing punctuation or a comment runs nothing itself.
const NO_CODE = /^(?:[)\]};,]*|\/\/.*|\/?\*.*)$/;

/**
 * How the counted runs left a script: which offsets ran, and its functions.
 * @typedef {{ text: string, ran: Uint8Array }} Reach
 */

/** @type {Map<string, Reach>} */
const reach = new Map();

/**
 * Take what V8 counted since the last take, which resets the counts. Kept, it
 * marks each offset of `COVERED_FILES` that ran; a shrink's and a fixture's
 * runs are not kept, so a fixed defect does not leave lines unreached.
 * @param {boolean} keep whether the runs since the last take count
 * @returns {void}
 */
const takeCoverage = (keep) => {
	/** @type {import("inspector").Profiler.ScriptCoverage[]} */
	let scripts = [];
	session.post("Profiler.takePreciseCoverage", (error, answer) => {
		if (error) throw error;
		scripts = answer.result;
	});
	if (!keep) return;
	for (const file of COVERED_FILES) {
		const full = path.join(__dirname, "../..", file);
		const script = scripts.find(
			(one) => one.url === full || one.url === `file://${full}`
		);
		if (script === undefined) continue;
		let known = reach.get(file);
		if (known === undefined) {
			const text = fs.readFileSync(full, "utf8");
			known = { text, ran: new Uint8Array(text.length) };
			reach.set(file, known);
		}
		const ranges = script.functions.flatMap((one) => one.ranges);
		// Ranges nest, so painting the outer ones first leaves each offset with
		// the count of the innermost range holding it.
		ranges.sort(
			(a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset
		);
		const counts = new Uint32Array(known.text.length);
		for (const { startOffset, endOffset, count } of ranges) {
			counts.fill(count, startOffset, endOffset);
		}
		for (let at = 0; at < counts.length; at++) {
			if (counts[at] > 0) known.ran[at] = 1;
		}
	}
};

/**
 * Each offset's innermost named function, qualified by the classes and
 * functions holding it, read off the source: V8 lists only the functions it
 * compiled, which depends on what ran.
 * @param {string} text a script's source
 * @returns {string[]} the qualified name per offset, "" outside every function
 */
const functionNames = (text) => {
	/** @type {{ start: number, end: number, name: string }[]} */
	const named = [];
	/**
	 * @param {EXPECTED_ANY} node an ESTree node
	 * @param {string} name what its parent calls it
	 * @param {string} scope the qualified name of what holds it
	 */
	const walk = (node, name, scope) => {
		let inner = scope;
		const isFunction =
			node.type === "FunctionDeclaration" ||
			node.type === "FunctionExpression" ||
			node.type === "ArrowFunctionExpression";
		if (
			isFunction ||
			node.type === "ClassDeclaration" ||
			node.type === "ClassExpression"
		) {
			const own = node.id ? node.id.name : name;
			if (own !== "") {
				inner = scope === "" ? own : `${scope}.${own}`;
				if (isFunction) {
					named.push({ start: node.start, end: node.end, name: inner });
				}
			}
		}
		for (const key of Object.keys(node)) {
			const value = node[key];
			const children = Array.isArray(value) ? value : [value];
			for (const child of children) {
				if (child === null || typeof child !== "object" || !child.type) continue;
				/** @type {string} */
				let childName = "";
				if (node.type === "VariableDeclarator" && key === "init") {
					childName = node.id.name || "";
				} else if (
					(node.type === "Property" || node.type === "MethodDefinition") &&
					key === "value"
				) {
					childName = node.key.name || node.key.value || "";
				} else if (node.type === "AssignmentExpression" && key === "right") {
					childName = node.left.property ? node.left.property.name || "" : "";
				}
				walk(child, childName, inner);
			}
		}
	};
	walk(acorn.parse(text, { ecmaVersion: "latest", sourceType: "script" }), "", "");
	named.sort((a, b) => a.start - b.start || b.end - a.end);
	/** @type {string[]} */
	const names = Array.from({ length: text.length }, () => "");
	for (const { start, end, name } of named) names.fill(name, start, end);
	return names;
};

/**
 * Every line of a script no counted run entered, each named by the innermost
 * named function holding it: a name moves less than a line number as the file
 * changes.
 * @param {Reach} script how the counted runs left it
 * @returns {string[]} `function: line` for each line no run entered, in order
 */
const unreachedLines = ({ text, ran }) => {
	const names = functionNames(text);
	/** @type {string[]} */
	const out = [];
	let start = 0;
	for (const line of text.split("\n")) {
		const code = line.trim();
		if (!NO_CODE.test(code)) {
			let entered = false;
			for (let at = 0; at < line.length && !entered; at++) {
				entered = line.charCodeAt(at) > 32 && ran[start + at] === 1;
			}
			if (!entered) {
				out.push(`${names[start + line.length - code.length]}: ${code}`);
			}
		}
		start += line.length + 1;
	}
	return out;
};

/**
 * Each function's unreached lines, counted: a record of counts stays small
 * where one of lines would run to thousands.
 * @param {string[]} lines `function: line` for each line no run entered
 * @returns {Record<string, number>} how many each function holds
 */
const countByFunction = (lines) => {
	/** @type {Record<string, number>} */
	const counts = Object.create(null);
	for (const line of lines) {
		const name = line.slice(0, line.indexOf(": ")) || "(top level)";
		counts[name] = (counts[name] || 0) + 1;
	}
	return counts;
};

/**
 * What moved against the record: a function holding more unreached lines than
 * recorded fails with those lines, and so does one holding fewer, whose count
 * has to go down with it.
 * @param {Record<string, Record<string, number>>} recorded each file's unreached lines per function
 * @param {Record<string, string[]>} found each file's unreached lines in this run
 * @returns {string[]} one entry per function that moved
 */
const lineChanges = (recorded, found) => {
	/** @type {string[]} */
	const out = [];
	for (const file of COVERED_FILES) {
		const counts = countByFunction(found[file]);
		const record = recorded[file] || {};
		for (const name of new Set([...Object.keys(record), ...Object.keys(counts)])) {
			const now = counts[name] || 0;
			const before = Object.prototype.hasOwnProperty.call(record, name)
				? record[name]
				: 0;
			if (now > before) {
				const lines = found[file].filter((line) =>
					line.startsWith(`${name === "(top level)" ? "" : name}: `)
				);
				out.push(`${file} ${name}: ${now} unreached, ${before} recorded\n${lines.join("\n")}`);
			} else if (now < before) {
				out.push(`${file} ${name}: ${now} unreached, ${before} recorded; lower the record`);
			}
		}
	}
	return out;
};

describe("syntax fuzz generators", () => {
	it("write the same inputs for a seed every time", () => {
		const one = createStylesheetGenerator(7, createRandom);
		const other = createStylesheetGenerator(7, createRandom);
		const page = createDocumentGenerator(7, createRandom);
		const samePage = createDocumentGenerator(7, createRandom);
		for (let i = 0; i < 5; i++) {
			expect(other.stylesheet()).toBe(one.stylesheet());
			expect(other.declarations()).toBe(one.declarations());
			expect(samePage()).toBe(page());
		}
	});
});

describe("syntax fuzz in real chrome", () => {
	/** @type {import("playwright-core").Browser} */
	let browser;
	/** @type {import("playwright-core").Page} */
	let page;
	const knownCss = knownOf("css");
	const knownHtml = knownOf("html");
	// WHY: a shrink warms caches a later generated input would have filled, and
	// leaves them filled, so only a run that cut nothing down counts lines.
	let shrank = false;
	let seedsDone = 0;

	beforeAll(async () => {
		browser = await launchBrowser({ browser: "chrome" });
	}, 120000);

	beforeEach(async () => {
		page = await browser.newPage();
		await page.setContent(POLICED_PAGE);
		await page.evaluate(installHelpers, [...GENERIC_FONT_FAMILIES]);
	});

	afterEach(async () => {
		await page.close();
	});

	afterAll(async () => {
		session.disconnect();
		if (browser) await browser.close();
	});

	/**
	 * Every relation one stylesheet breaks in the browser.
	 * @param {string} source the stylesheet
	 * @returns {Promise<{ relation: string, preset: string, what: string }[]>} what broke
	 */
	const cssBrowserFindings = async (source) => {
		/** @type {{ relation: string, preset: string, what: string }[]} */
		const out = [];
		/** @type {{ name: string, before: string, after: string, relax: Relaxation[] }[]} */
		const pairs = [];
		for (const set of CSS_SETS) {
			pairs.push({
				name: set.name,
				before: source,
				after: set.print(source),
				relax: set.relax
			});
		}
		/** @type {StyleReport[]} */
		const reports = await page.evaluate(compareStyles, { pairs, types: [] });
		for (const report of reports) {
			const lines = cascadeLines(report);
			if (lines.length > 0) {
				out.push({ relation: "styles", preset: report.name, what: lines[0] });
			}
		}
		const [before, after] = await page.evaluate(browserRules, [
			source,
			beautifyCss(source)
		]);
		const what = ruleDifference(before, after);
		if (what !== "") out.push({ relation: "cssom", preset: "beautify", what });
		return out;
	};

	/**
	 * Every relation one document breaks in the browser.
	 * @param {string} source the document
	 * @returns {Promise<{ relation: string, preset: string, what: string }[]>} what broke
	 */
	const htmlBrowserFindings = async (source) => {
		const [tree] = await page.evaluate(browserTrees, [source]);
		const mine = serializeHtmlTree(parseHtml(source));
		if (mine !== tree) {
			const a = mine.split("\n");
			const b = tree.split("\n");
			let at = 0;
			while (a[at] === b[at]) at++;
			// The DOM the browser builds is not the one the printer kept, so what
			// the prints build is no measure of them.
			return [
				{
					relation: "dom",
					preset: "parse",
					what: `line ${at + 1}: ${a[at]} vs ${b[at]}`
				}
			];
		}
		const printed = HTML_SETS.map((set) => ({
			name: set.name,
			relax: set.relax,
			after: set.print(source)
		}));
		/** @type {{ relation: string, preset: string, what: string }[]} */
		const out = [];
		const holds = await page.evaluate(holdsStyles, [
			source,
			...printed.map(({ after }) => after)
		]);
		const facets = await page.evaluate(browserFacets, [
			{ source, relax: [] },
			...printed.map(({ after, relax }) => ({ source: after, relax }))
		]);
		/** @type {{ name: string, before: string, after: string, relax: Relaxation[] }[]} */
		const sheets = [];
		/** @type {{ name: string, before: string, after: string }[]} */
		const renders = [];
		for (const [i, { name, relax, after }] of printed.entries()) {
			const before =
				relax.length === 0
					? facets[0]
					: (
							await page.evaluate(browserFacets, [{ source, relax }])
						)[0];
			const what = facetDifference(before, facets[i + 1]);
			if (what !== "") {
				out.push({ relation: "facets", preset: name, what });
				continue;
			}
			// A merge joins sheets, so where it may, both sides are one sheet.
			const [mine, theirs] = [before.styles, facets[i + 1].styles].map(
				(styles) =>
					relax.includes("merged-styles") ? [styles.join("\n")] : styles
			);
			if (mine.length !== theirs.length) {
				out.push({
					relation: "facets",
					preset: name,
					what: `styles: ${mine.length} vs ${theirs.length}`
				});
				continue;
			}
			for (const [at, sheet] of mine.entries()) {
				if (sheet !== theirs[at]) {
					sheets.push({ name, before: sheet, after: theirs[at], relax });
				}
			}
			// The facets leave a `style` attribute to a render, and a sheet's text
			// can be part of what a page shows, as an option's label.
			if (relax.length === 0 && (holds[0] || holds[i + 1])) {
				renders.push({ name, before: source, after });
			} else if (relax.length > 0) {
				// A render cannot set aside what a relaxed set rewrites on purpose.
				const [own, printedOwn] = await page.evaluate(inlineStyles, [
					source,
					after
				]);
				// No relaxed set minifies CSS, so nothing may round a declaration.
				if (own.join("\n") !== printedOwn.join("\n")) {
					out.push({
						relation: "styles",
						preset: name,
						what: `inline styles: ${JSON.stringify(own)} vs ${JSON.stringify(printedOwn)}`
					});
				}
			}
		}
		if (sheets.length > 0) {
			/** @type {StyleReport[]} */
			const reports = await page.evaluate(compareStyles, {
				pairs: sheets,
				types: []
			});
			for (const report of reports) {
				const lines = cascadeLines(report);
				if (lines.length > 0) {
					out.push({ relation: "styles", preset: report.name, what: lines[0] });
				}
			}
		}
		if (renders.length > 0) {
			/** @type {RenderReport[]} */
			const reports = await page.evaluate(compareRenders, {
				pairs: renders,
				// The narrower of the widths the equivalence suite renders at.
				width: RENDER_WIDTHS[0]
			});
			for (const { name, differences } of reports) {
				if (differences.length > 0) {
					out.push({ relation: "renders", preset: name, what: differences[0] });
				}
			}
		}
		return out;
	};

	/**
	 * Every relation each input breaks, each cut down to what still breaks it.
	 * @param {string[]} sources the inputs
	 * @param {import("../helpers/syntaxInvariants").SyntaxInvariants} invariants the syntax's invariants
	 * @param {(source: string) => Promise<{ relation: string, preset: string, what: string }[]>} inBrowser the browser's relations
	 * @param {KnownDifference[]} known the differences fixtures file
	 * @returns {Promise<Finding[]>} what broke
	 */
	const findingsOf = async (sources, invariants, inBrowser, known) => {
		/**
		 * @param {string} source an input
		 * @returns {Promise<{ relation: string, preset: string, what: string }[]>} every relation it breaks
		 */
		const broken = async (source) => [
			...invariantFindings(invariants, [["fuzz", source]]).map(
				({ preset, report }) => ({
					relation: report.relation,
					preset,
					what: `${report.what}\n${report.repro}`
				})
			),
			...(await inBrowser(source))
		];
		/** @type {Finding[]} */
		const out = [];
		// One input per relation and preset is cut down: the rest of the seed
		// would only repeat it.
		/** @type {Set<string>} */
		const seen = new Set();
		for (const source of sources) {
			for (const found of await broken(source)) {
				const key = `${found.relation} ${found.preset}`;
				if (seen.has(key) || knownEntry(found, known) !== undefined) continue;
				seen.add(key);
				takeCoverage(true);
				shrank = true;
				/**
				 * @param {{ relation: string, preset: string }} one a relation broken
				 * @returns {boolean} whether it is the one found
				 */
				const same = (one) =>
					one.relation === found.relation && one.preset === found.preset;
				/** @type {string} */
				let cut;
				/** @type {{ relation: string, preset: string, what: string }[]} */
				let all;
				try {
					cut = await shrink(source, async (smaller) =>
						(await broken(smaller)).some(same)
					);
					all = await broken(cut);
				} finally {
					takeCoverage(false);
				}
				out.push({
					.../** @type {{ relation: string, preset: string, what: string }} */ (
						all.find(same)
					),
					source: cut,
					broken: all
				});
			}
		}
		takeCoverage(true);
		seedsDone++;
		return out;
	};

	it("writes a value for every type mdn-data names", () => {
		expect(unwrittenTypes()).toEqual([]);
	});

	for (const seed of SEEDS) {
		it(
			`css seed ${seed}`,
			async () => {
				const { stylesheet } = createStylesheetGenerator(seed, createRandom);
				const sources = Array.from({ length: INPUTS_PER_SEED }, stylesheet);
				const findings = await findingsOf(
					sources,
					cssInvariants,
					cssBrowserFindings,
					knownCss
				);
				expect(unknown(findings, knownCss, "css")).toEqual([]);
			},
			SEED_TIMEOUT
		);

		it(
			`html seed ${seed}`,
			async () => {
				const next = createDocumentGenerator(seed, createRandom);
				const sources = Array.from({ length: INPUTS_PER_SEED }, next);
				const findings = await findingsOf(
					sources,
					htmlInvariants,
					htmlBrowserFindings,
					knownHtml
				);
				expect(unknown(findings, knownHtml, "html")).toEqual([]);
			},
			SEED_TIMEOUT
		);
	}

	it("reaches every line of the CSS and HTML parsers and printers", () => {
		if (process.env.SYNTAX_FUZZ_SEED || process.env.SYNTAX_FUZZ_INPUTS) return;
		if (shrank || seedsDone !== SEEDS.length * 2) {
			throw new Error(
				"lines are counted only over a run whose every seed finished and cut no finding down; fix or file the findings, then run again"
			);
		}
		/** @type {Record<string, string[]>} */
		const reached = {};
		for (const file of COVERED_FILES) {
			const script = reach.get(file);
			if (script === undefined) throw new Error(`${file} never loaded`);
			reached[file] = unreachedLines(script);
		}
		if (process.env.SYNTAX_FUZZ_UPDATE) {
			/** @type {Record<string, Record<string, number>>} */
			const record = {};
			for (const file of COVERED_FILES) record[file] = countByFunction(reached[file]);
			fs.writeFileSync(UNREACHED_FILE, `${JSON.stringify(record, null, "\t")}\n`);
			return;
		}
		expect(lineChanges(UNREACHED, reached)).toEqual([]);
	});

	for (const [lang, inBrowser] of /** @type {const} */ ([
		["css", cssBrowserFindings],
		["html", htmlBrowserFindings]
	])) {
		it(`holds each ${lang} fixture to what it files for the browser`, async () => {
			/** @type {string[]} */
			const left = [];
			for (const entry of fixtures(lang)) {
				// A fixed finding keeps its fixture, which holds the fix to the browser.
				if (
					entry.expectedBrowser.length === 0 &&
					!entry.name.startsWith("syntax-fuzz-")
				) {
					continue;
				}
				const found = (await inBrowser(entry.source)).map(
					({ relation, preset, what }) => ({
						preset,
						report: { relation, what, repro: what }
					})
				);
				for (const line of unexplained(
					found,
					entry.expectedBrowser,
					entry.source
				)) {
					left.push(`${entry.name}: ${line}`);
				}
			}
			expect(left).toEqual([]);
		});
	}
});
