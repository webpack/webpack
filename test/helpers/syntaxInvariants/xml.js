/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	builtinEmbeddedRenderer
} = require("../../../lib/html/builtinEmbeddedRenderer");
const { SourceProcessor } = require("../../../lib/html/syntax");
const {
	Field,
	NodeType,
	Part,
	_attributeList,
	decodeXmlAttribute,
	tokenizeXml
} = require("../../../lib/html/syntax-parser");
const { wantedRespelling } = require("../../../tooling/compare-tools-harness");
const {
	cutsAt,
	hasher,
	oneLine,
	pathSpanWalk,
	shrink,
	signed,
	sliceRelation,
	spans
} = require("./relations");

/** @typedef {import("../../../lib/html/syntax-parser").HtmlPath} HtmlPath */
/** @typedef {import("./relations").Report} Report */

/**
 * @param {string} xml a document
 * @param {"minify" | "beautify"} mode what to print
 * @returns {string} what webpack prints
 */
const printXml = (xml, mode) =>
	/** @type {{ code: string }} */ (
		new SourceProcessor().process(xml, { xml: true, mode })
	).code;

/** @typedef {Pick<import("../../../lib/html/syntax-printer").HtmlProcessOptions, "sortAttributes" | "renderEmbeddedSource">} XmlPrintOptions */

/** @typedef {import("../../../lib/html/builtinEmbeddedRenderer").BuiltinEmbeddedRendererOptions} CssOptions */

/** @type {CssOptions} */
const LEGACY_CSS_OPTIONS = {
	environment: { browsers: ["chrome 100", "firefox 100", "safari 15.4"] }
};

// The printer alone, the two the webpack rows run, where an SVG's `<style>` and
// `style=""` reach the CSS minifier as in a build, and a target it lowers for;
// each with the CSS options its renderer minifies with, which `meaning` reads.
/** @type {[string, XmlPrintOptions, CssOptions][]} */
const PRESETS = [
	["default", {}, {}],
	["embedded", { renderEmbeddedSource: builtinEmbeddedRenderer() }, {}],
	[
		"sorted",
		{ sortAttributes: true, renderEmbeddedSource: builtinEmbeddedRenderer() },
		{}
	],
	[
		"embedded+legacy",
		{ renderEmbeddedSource: builtinEmbeddedRenderer(LEGACY_CSS_OPTIONS) },
		LEGACY_CSS_OPTIONS
	]
];

/**
 * @param {XmlPrintOptions} options one preset's printer options
 * @returns {(xml: string) => string} the minifier those options name
 */
const printerFor = (options) => (xml) =>
	/** @type {{ code: string }} */ (
		new SourceProcessor().process(xml, {
			...options,
			xml: true,
			mode: "minify"
		})
	).code;

const STYLE_ELEMENT = /(?:^|:)style$/;

/**
 * A stylesheet as webpack's CSS minifier reads it, run to a fixed point, so a
 * tool that minified an SVG's `<style>` is not reported for changing its text.
 * @param {string} css a `<style>` body
 * @param {CssOptions=} options the CSS minifier's options, a target among them
 * @returns {string} its canonical form
 */
const canonicalCss = (css, options = {}) => {
	try {
		const { SourceProcessor: CssProcessor } = require("../../../lib/css/syntax");

		const processor = new CssProcessor();
		let out = css;
		for (let i = 0; i < 3; i++) {
			const next = processor.process(out, { ...options, mode: "minify" }).code;
			if (next === out) break;
			out = next;
		}
		return out;
	} catch (_err) {
		return css;
	}
};

/** @type {Record<number, string>} */
const NODE_TYPE_NAMES = {};
for (const [name, type] of Object.entries(NodeType)) {
	NODE_TYPE_NAMES[type] = name;
}

/**
 * @param {string} value decoded text
 * @returns {string} the text as the canonical form escapes it
 */
const escapeCanonical = (value) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/\t/g, "&#9;")
		.replace(/\n/g, "&#10;")
		.replace(/\r/g, "&#13;");

/**
 * @param {HtmlPath} nodePath an element's path
 * @returns {[string, string][]} its normalized attribute names and values
 */
const decodedAttributes = (nodePath) => {
	/** @type {[string, string][]} */
	const attributes = [];
	for (let i = 0; i < nodePath.fieldCount(Field.attributes); i++) {
		const attribute = nodePath.field(i, Field.attributes);
		attributes.push([nodePath.name(attribute), nodePath.value(attribute)]);
	}
	return attributes;
};

/**
 * A `style=""` value as the CSS minifier reads it, run to a fixed point.
 * @param {string} value the declarations
 * @param {CssOptions} options the CSS minifier's options
 * @returns {string} their canonical form
 */
const canonicalDeclarations = (value, options) => {
	const css = canonicalCss(`a{${value}}`, options);
	return css.startsWith("a{") && css.endsWith("}") ? css.slice(2, -1) : css;
};

/**
 * What a document means, as webpack reads it: James Clark's canonical form,
 * attributes sorted and every value decoded, comments and the DTD left out.
 * A `<style>` body and a `style=""` are read in their canonical CSS form, so
 * the CSS minifier writing them is not the document saying something else.
 * @param {string} xml a document
 * @param {CssOptions=} cssOptions the options that CSS is minified with
 * @returns {string} its canonical form
 */
const canonical = (xml, cssOptions = {}) => {
	/** @type {string[]} */
	const out = [];
	/** @type {string[]} */
	const open = [];
	/** @type {Record<number, { enter: (nodePath: HtmlPath) => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {
		[NodeType.Element]: {
			enter: (nodePath) => {
				const attributes = decodedAttributes(nodePath).sort(([a], [b]) =>
					a < b ? -1 : a > b ? 1 : 0
				);
				out.push(
					`<${nodePath.name()}${attributes
						.map(
							([name, value]) =>
								` ${name}="${escapeCanonical(
									name === "style"
										? canonicalDeclarations(value, cssOptions)
										: value
								)}"`
						)
						.join("")}>`
				);
				open.push(nodePath.name());
			},
			exit: (nodePath) => {
				out.push(`</${nodePath.name()}>`);
				open.pop();
			}
		},
		[NodeType.Text]: {
			enter: (nodePath) => {
				const text = nodePath.value();
				out.push(
					escapeCanonical(
						STYLE_ELEMENT.test(open[open.length - 1] || "")
							? canonicalCss(text, cssOptions)
							: text
					)
				);
			},
			exit: () => {}
		},
		[NodeType.ProcessingInstruction]: {
			enter: (nodePath) => {
				out.push(`<?${nodePath.name()} ${nodePath.value()}?>`);
			},
			exit: () => {}
		}
	};
	new SourceProcessor().use(visitors).process(xml, { xml: true });
	return out.join("");
};

/**
 * @typedef {object} Site
 * @property {number} valueStart where the attribute value begins
 * @property {number} valueEnd where it ends, before a closing delimiter
 * @property {number} quote its delimiter, `"` or `'`, as a code unit
 * @property {number} tagStart the enclosing tag's start
 * @property {number} tagEnd its end, past the `>`
 */

/**
 * Every quoted attribute value the source wrote, found with webpack's own XML
 * tokenizer so a respelling only ever touches what is really a value.
 * @param {string} xml a document
 * @returns {Site[]} each value, in source order
 */
const attributeSites = (xml) => {
	/** @type {Site[]} */
	const sites = [];
	/** @type {Site[]} */
	const pending = [];
	tokenizeXml(xml, 0, {
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			if (valueStart === -1 || quoteType === 0) return nameEnd;
			pending.push({
				valueStart,
				valueEnd,
				quote: input.charCodeAt(valueStart - 1),
				tagStart: 0,
				tagEnd: 0
			});
			return valueEnd + 1;
		},
		openTag: (input, start, end) => {
			for (const site of pending) {
				site.tagStart = start;
				site.tagEnd = end;
				sites.push(site);
			}
			pending.length = 0;
			return end;
		}
	});
	return sites;
};

/**
 * @typedef {object} Respelling
 * @property {string} name how the relation is labelled
 * @property {(value: string, site: Site, raw: string) => string | null} write the value's new spelling with its delimiters, or null to leave it
 */

/**
 * @param {string} value decoded value
 * @param {string} quote the delimiter to write it between
 * @returns {string} the value written between that delimiter
 */
const quoted = (value, quote) =>
	`${quote}${value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(quote === '"' ? /"/g : /'/g, quote === '"' ? "&quot;" : "&apos;")
		.replace(/\t/g, "&#9;")
		.replace(/\n/g, "&#10;")
		.replace(/\r/g, "&#13;")}${quote}`;

// What a respelling may rewrite is what XML says means the same thing: a value's
// delimiter, and a character written as a reference to it.
/** @type {Respelling[]} */
const RESPELLINGS = [
	{
		name: "quote-single",
		write: (value, site) =>
			site.quote === 0x22 && !value.includes("'") ? quoted(value, "'") : null
	},
	{
		name: "quote-double",
		write: (value, site) =>
			site.quote === 0x27 && !value.includes('"') ? quoted(value, '"') : null
	},
	{
		name: "references",
		write: (value, site) => {
			if (value === "") return null;
			let out = "";
			for (const character of value) {
				out +=
					character === " "
						? " "
						: `&#x${/** @type {number} */ (character.codePointAt(0)).toString(16)};`;
			}
			const quote = site.quote === 0x27 ? "'" : '"';
			return `${quote}${out}${quote}`;
		}
	}
];

const DECLARED_REFERENCE = /&(?!#|amp;|lt;|gt;|quot;|apos;)/;

/**
 * Respell every site in a subset.
 * @param {string} xml a document
 * @param {Site[]} sites the values to respell
 * @param {Respelling} respelling how
 * @returns {string} the document with them respelled
 */
const respell = (xml, sites, respelling) => {
	let out = "";
	let last = 0;
	for (const site of sites) {
		const raw = xml.slice(site.valueStart, site.valueEnd);
		// A reference to what the DTD declares is shorter than any spelling of its
		// text, which the printer keeps; writing the text out is not lexical.
		if (DECLARED_REFERENCE.test(raw)) continue;
		const written = respelling.write(decodeXmlAttribute(raw), site, raw);
		if (written === null) continue;
		out += xml.slice(last, site.valueStart - 1) + written;
		last = site.valueEnd + 1;
	}
	return out + xml.slice(last);
};

/**
 * @typedef {{ kind: string, delta: number }} Finding
 */

/**
 * Whether respelling these sites moves what the document minifies to. A
 * respelling that moved the document itself says nothing about the printer.
 * @param {string} xml a document
 * @param {string} minified what it minifies to
 * @param {Site[]} sites the values to respell
 * @param {Respelling} respelling how
 * @returns {Finding | null} what moved
 */
const spellingFinding = (xml, minified, sites, respelling) => {
	const mutated = respell(xml, sites, respelling);
	if (mutated === xml || canonical(mutated) !== canonical(xml)) return null;
	const answer = printXml(mutated, "minify");
	if (answer === minified) return null;
	if (canonical(answer) !== canonical(minified)) {
		return { kind: "differs", delta: answer.length - minified.length };
	}
	// Saying the same thing in no more bytes is not a finding.
	if (answer.length <= minified.length) return null;
	return { kind: "bytes", delta: answer.length - minified.length };
};

/**
 * Every respelling this document's output depends on.
 * @param {string} xml the document
 * @param {string} minified what it minifies to
 * @returns {Report[]} what moved, and the smallest repro found for each
 */
const sweepRespellings = (xml, minified) => {
	/** @type {Report[]} */
	const reports = [];
	const sites = attributeSites(xml);
	for (const respelling of RESPELLINGS.filter((one) =>
		wantedRespelling(one.name)
	)) {
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(xml, minified, subset, respelling);
		const found = holds(sites);
		if (found === null) continue;
		const carried = shrink(holds, sites, found.kind);
		const blamed = holds(carried) || found;
		const tag = xml.slice(carried[0].tagStart, carried[0].tagEnd);
		reports.push({
			relation: `respelling ${respelling.name}`,
			what: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro: `    ${oneLine(tag, 80)}  ->  ${oneLine(
				respell(xml, carried, respelling).slice(
					carried[0].tagStart,
					carried[0].tagEnd + 40
				),
				80
			)}`
		});
	}
	return reports;
};

// Where a cut lands, by the construct it interrupts: each pattern ends where the
// document is cut, just inside what the end of the input then has to close.
/** @type {[string, RegExp][]} */
const XML_CUTS = [
	["in a start tag's name", /<[a-z_]/gi],
	["in an end tag's name", /<\/[a-z_]/gi],
	["in an attribute's name", /<[a-z_][^\s<>]*\s+[a-z_]/gi],
	["after an attribute's =", /<[a-z_][^\s<>]*\s+[\w:.-]+=/gi],
	["in a double-quoted value", /[=]"[^"]/g],
	["in a single-quoted value", /[=]'[^']/g],
	["before a tag's >", /<[a-z_][^<>]*(?=>)/gi],
	["between a tag's / and >", /<[a-z_][^<>]*\/(?=>)/gi],
	["in a comment", /<!--[\s\S]/g],
	["in a processing instruction", /<\?[\s\S]/g],
	["in a doctype", /<!DOCTYPE/g],
	["in an internal subset", /<!DOCTYPE[^>[]*\[[\s\S]/g],
	["in a reference", /&[a-z#_]/gi],
	["in a CDATA section", /<!\[CDATA\[[\s\S]/g],
	["in a <style> body", /<(?:[\w.-]+:)?style[^>]*>[^<]/gi],
	["in a style attribute", /style="[^"]/gi]
];

/**
 * The tag in the output a second pass first differs inside, minified on its
 * own: a repro only where minifying that tag alone moves it too.
 * @param {(xml: string) => string} minify the printer under test
 * @param {string} minified one pass's output
 * @param {number} at where the second pass first differs
 * @returns {{ source: string, again: string } | null} the repro, or null
 */
const idempotenceRepro = (minify, minified, at) => {
	let found = "";
	tokenizeXml(minified, 0, {
		openTag: (input, start, end) => {
			if (start <= at && at < end) found = input.slice(start, end);
			return end;
		}
	});
	if (found === "") return null;
	const again = minify(found);
	return again === found ? null : { source: found, again };
};

/**
 * The sub-ranges an element states: its opening tag, and the name and value of
 * every attribute written into it. One the DTD supplied was written nowhere.
 * @param {HtmlPath} nodePath the accessor
 * @returns {readonly [string, number, number][] | undefined} each `[name, start, end]`
 */
const xmlInnerRanges = (nodePath) => {
	if (nodePath.type() !== NodeType.Element) return undefined;
	/** @type {[string, number, number][]} */
	const inner = [
		[
			"opening tag",
			nodePath.startOf(Part.startTag),
			nodePath.endOf(Part.startTag)
		]
	];
	for (const attribute of _attributeList(nodePath.node)) {
		if (attribute.nameStart === -1) continue;
		inner.push(["attribute name", attribute.nameStart, attribute.nameEnd]);
		inner.push(["attribute value", attribute.valueStart, attribute.valueEnd]);
	}
	return inner;
};

const ENTITY_REFERENCE_STICKY = /&[^#&;\s][^&;\s]*;/y;

/**
 * @param {string} xml a document
 * @param {number} start where a range starts
 * @param {number} end where it ends
 * @returns {boolean} whether one entity reference holds the whole range
 */
const insideReference = (xml, start, end) => {
	const at = xml.lastIndexOf("&", start);
	if (at === -1) return false;
	ENTITY_REFERENCE_STICKY.lastIndex = at;
	return (
		ENTITY_REFERENCE_STICKY.test(xml) &&
		ENTITY_REFERENCE_STICKY.lastIndex >= end
	);
};

/**
 * Hold the parser's ranges to what they claim about the document: XML owes all
 * of it — nesting is the grammar, so a node sits inside its parent and after
 * its earlier siblings. Every node one entity reference expands to sits at that
 * reference, so siblings may share that range and nothing else.
 * @param {string} xml a document
 * @returns {Report[]} what the ranges broke
 */
const xmlSpans = (xml) =>
	spans({
		length: xml.length,
		contains: true,
		siblings: true,
		shared: (start, end) => insideReference(xml, start, end),
		walk: pathSpanWalk({
			length: xml.length,
			run: (enter, exit) => {
				/** @type {Record<number, { enter: typeof enter, exit: typeof exit }>} */
				const visitors = {};
				for (const type of Object.values(NodeType)) {
					visitors[type] = { enter, exit };
				}
				new SourceProcessor().use(visitors).process(xml, { xml: true });
			},
			start: (nodePath) => nodePath.start(),
			end: (nodePath) => nodePath.end(),
			name: (nodePath) => NODE_TYPE_NAMES[nodePath.type()],
			inner: xmlInnerRanges
		})
	});

/**
 * @typedef {{ what: string, start: number, end: number, size: number, inElement: boolean }} NodeRun
 */

// Reparsing every node costs a parse of its own, so a document would cost its
// size times its depth. Each one is capped at this many times its own bytes.
const SLICE_BUDGET_FACTOR = 4;

/**
 * Every node in one document, in post-order with the size of its subtree.
 * @param {string} xml a document
 * @returns {{ runs: NodeRun[], doctype: string }} each node, children before parents, and the DOCTYPE the document declared
 */
const xmlNodeRuns = (xml) => {
	/** @type {NodeRun[]} */
	const runs = [];
	const found = { doctype: "" };
	/** @type {{ held: number, element: boolean }[]} */
	const stack = [{ held: 0, element: false }];
	/** @type {Record<number, { enter: (nodePath: HtmlPath) => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {};
	for (const type of Object.values(NodeType)) {
		visitors[type] = {
			enter: (nodePath) => {
				stack.push({ held: 0, element: type === NodeType.Element });
			},
			exit: (nodePath) => {
				const frame = /** @type {{ held: number, element: boolean }} */ (
					stack.pop()
				);
				if (type === NodeType.Doctype) found.doctype = nodePath.source();
				const parent = stack[stack.length - 1];
				const size = frame.held + 1;
				parent.held += size;
				runs.push({
					what: `${NODE_TYPE_NAMES[type]}${
						type === NodeType.Element ? `:${nodePath.name()}` : ""
					}`,
					start: nodePath.start(),
					end: nodePath.end(),
					size,
					inElement: parent.element
				});
			}
		};
	}
	new SourceProcessor().use(visitors).process(xml, { xml: true });
	return { runs, doctype: found.doctype };
};

/**
 * What one node's subtree says: its shape and the offsets inside it, read
 * against the node's own start.
 * @param {readonly NodeRun[]} runs every node in post-order
 * @param {number} at which one to digest
 * @param {number} origin the offset to read ranges against
 * @returns {string} its digest
 */
const runDigest = (runs, at, origin) => {
	const node = runs[at];
	/** @type {string[]} */
	const out = [];
	for (let index = at - node.size + 1; index <= at; index++) {
		const one = runs[index];
		out.push(`${one.what}[${one.start - origin},${one.end - origin})`);
	}
	return out.join(" ");
};

// Where a slice is read back: inside an element, after the document's own
// DOCTYPE, so what its internal subset declares still resolves. Nothing follows
// it, so a slice the input ended inside ends there as the document did.
const SLICE_WRAPPER_OPEN = "<_>";

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, read back inside an element after the document's DOCTYPE, give that
 * node back. A node outside the root element has no context to be read in.
 * @param {string} xml a document
 * @returns {{ reports: Report[], read: number, skipped: number, capped: number, repeats: number }} what broke, how many answered, and what was left out
 */
const xmlSlices = (xml) => {
	const { runs, doctype } = xmlNodeRuns(xml);
	/** @type {import("./relations").SliceCandidate[]} */
	const candidates = [];
	let budget = xml.length * SLICE_BUDGET_FACTOR;
	let capped = 0;
	let repeats = 0;
	let skipped = 0;
	/** @type {Set<string>} */
	const seen = new Set();
	for (let at = 0; at < runs.length; at++) {
		const node = runs[at];
		if (!node.inElement || node.end <= node.start) {
			skipped++;
			continue;
		}
		const said = runDigest(runs, at, node.start);
		if (seen.has(said)) {
			repeats++;
			continue;
		}
		seen.add(said);
		const text = xml.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		candidates.push({
			what: node.what,
			said,
			reparse: () => {
				const prefix = `${doctype}${SLICE_WRAPPER_OPEN}`;
				const again = xmlNodeRuns(`${prefix}${text}`).runs;
				const want = again.findIndex(
					(one) =>
						one.what === node.what &&
						one.start === prefix.length &&
						one.end === prefix.length + text.length
				);
				return want === -1 ? null : runDigest(again, want, prefix.length);
			}
		});
	}
	const answered = sliceRelation(candidates);
	return { ...answered, skipped: answered.skipped + skipped, capped, repeats };
};

/**
 * What one parse of a document amounts to: every node's type and range, every
 * name and value it derived, and the bytes the printer makes of it.
 * @param {string} xml a document
 * @returns {string} the digest
 */
const xmlPurityDigest = (xml) => {
	const digest = hasher();
	/** @type {Record<number, { enter: () => void, exit: (nodePath: HtmlPath) => void }>} */
	const visitors = {};
	/**
	 * @param {HtmlPath} nodePath the node leaving the walk
	 * @returns {void}
	 */
	const read = (nodePath) => {
		const type = nodePath.type();
		digest.update(
			`${NODE_TYPE_NAMES[type]}[${nodePath.start()},${nodePath.end()})`
		);
		if (type === NodeType.Element) {
			digest.update(`|<${nodePath.name()}>`);
			for (const [name, value] of decodedAttributes(nodePath)) {
				digest.update(`|${name}=${value}`);
			}
		} else if (type !== NodeType.Document) {
			digest.update(`|${nodePath.value()}`);
		}
		digest.update("\n");
	};
	for (const type of Object.values(NodeType)) {
		visitors[type] = { enter: () => {}, exit: read };
	}
	try {
		new SourceProcessor().use(visitors).process(xml, { xml: true });
		digest.update(printXml(xml, "minify"));
	} catch (error) {
		return `refused: ${/** @type {Error} */ (error).message}`;
	}
	return digest.hex();
};

/** @type {import("./index").SyntaxInvariants} */
const syntax = {
	printers: () =>
		PRESETS.map(([name, options, cssOptions]) => {
			const minify = printerFor(options);
			return {
				name,
				minify,
				says: (text) => canonical(text, cssOptions),
				repro: (printed, at) => idempotenceRepro(minify, printed, at)
			};
		}),
	spans: xmlSpans,
	slices: (xml) => xmlSlices(xml).reports,
	digest: xmlPurityDigest,
	// The XML sweep respells under its own first preset.
	respellings: (_printer, xml, printed) => sweepRespellings(xml, printed),
	cuts: (xml) => cutsAt(xml, XML_CUTS)
};

module.exports = {
	...syntax,
	PRESETS,
	STYLE_ELEMENT,
	XML_CUTS,
	canonical,
	canonicalCss,
	decodedAttributes,
	idempotenceRepro,
	printXml,
	printerFor,
	sweepRespellings,
	xmlPurityDigest,
	xmlSlices,
	xmlSpans
};
