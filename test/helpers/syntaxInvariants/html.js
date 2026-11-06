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
	Namespace,
	NodeType,
	Part,
	Quote,
	_namespaceOf,
	decodeEntities,
	pickTransforms,
	tokenize
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
	spans,
	thrownText
} = require("./relations");

/** @typedef {import("../../../lib/html/syntax-printer").HtmlPrintOptions} HtmlPrintOptions */
/** @typedef {import("../../../lib/html/syntax-printer").HtmlTransformOptions} HtmlTransformOptions */

/** @type {HtmlPrintOptions} */
const DEFAULT_OPTIONS = {};

/** @type {HtmlPrintOptions} */
const AGGRESSIVE_OPTIONS = {
	collapseWhitespace: "all",
	mergeStyles: true,
	removeEmptyAttributes: true,
	removeEmptyElements: true,
	removeRedundantAttributes: "all",
	sortAttributes: true,
	sortTokenLists: true,
	removeImpliedTags: true
};

/** @type {HtmlPrintOptions} */
const EMBEDDED_OPTIONS = {
	...AGGRESSIVE_OPTIONS,
	renderEmbeddedSource: builtinEmbeddedRenderer()
};

/** @typedef {import("../../../lib/html/builtinEmbeddedRenderer").BuiltinEmbeddedRendererOptions} CssOptions */

// `embedded` minifies a `<style>` with no target named, so no lowering inside a
// document ever runs. This names one they all run for.
/** @type {CssOptions} */
const LEGACY_CSS_OPTIONS = {
	environment: { browsers: ["chrome 100", "firefox 100", "safari 15.4"] }
};

/** @type {HtmlPrintOptions} */
const EMBEDDED_LEGACY_OPTIONS = {
	...AGGRESSIVE_OPTIONS,
	renderEmbeddedSource: builtinEmbeddedRenderer(LEGACY_CSS_OPTIONS)
};

// The option sets the invariants are held over: the two the comparison's own
// webpack rows run, then the two a build runs, where a `<style>` and `style=""`
// reach the CSS minifier. Each names its CSS options, which `meaning` reads.
/** @type {[string, HtmlPrintOptions, CssOptions][]} */
const PRESETS = [
	["default", DEFAULT_OPTIONS, {}],
	["aggressive", AGGRESSIVE_OPTIONS, {}],
	["embedded", EMBEDDED_OPTIONS, {}],
	["embedded+legacy", EMBEDDED_LEGACY_OPTIONS, LEGACY_CSS_OPTIONS]
];

/**
 * @param {HtmlPrintOptions & HtmlTransformOptions} options one preset's minimizer options
 * @returns {(html: string) => string} the printer those options name
 */
const printerFor = (options) => {
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		transforms: pickTransforms(options),
		...options
	};
	return (html) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(html, printOptions)
		).code;
};

/**
 * @typedef {object} Site
 * @property {number} start where the attribute's `name=value` text begins
 * @property {number} end where it ends, past a closing delimiter
 * @property {string} name the name as the source spelled it
 * @property {string} value its value, decoded
 * @property {number} tagStart the enclosing open tag's start
 * @property {number} tagEnd its end, past the `>`
 */

/**
 * Where the tokenizer reads on from after an attribute: the state machine's own
 * answer, which a callback replaces by returning one of its own.
 * @param {number} valueStart value start, or -1 for a valueless attribute
 * @param {number} valueEnd value end
 * @param {number} nameEnd name end
 * @param {number} quoteType which delimiter the source used
 * @returns {number} the position to read on from
 */
const afterAttribute = (valueStart, valueEnd, nameEnd, quoteType) => {
	if (valueStart === -1) return nameEnd;
	return quoteType === Quote.None ? valueEnd : valueEnd + 1;
};

/**
 * Whether a name reads as HTML vocabulary rather than as another language's
 * text, which is the printer's own `_isWordSpan` asked of an attribute name.
 * Stated here rather than imported so the sweep keeps a reading of its own.
 * @param {string} name an attribute name as written
 * @returns {boolean} true when the name is a word
 */
const isWordName = (name) => /^[A-Za-z_-][^{}<>]*$/.test(name);

/**
 * Every attribute the tokenizer reports, with the open tag holding it. A close
 * tag's attributes are dropped by the tree builder, so they are dropped here,
 * as is every attribute of a tag carrying template syntax. Read with scripting
 * on, as the printer reads: a `noscript` holds text, whose spelling is its own.
 * @param {string} html a document
 * @returns {Site[]} the sites, in source order
 */
const attributeSites = (html) => {
	/** @type {Site[]} */
	const sites = [];
	/** @type {Site[]} */
	let pending = [];
	tokenize(html, 0, {
		scripting: true,
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			const end = afterAttribute(valueStart, valueEnd, nameEnd, quoteType);
			pending.push({
				start: nameStart,
				end,
				name: input.slice(nameStart, nameEnd),
				value:
					valueStart === -1
						? ""
						: decodeEntities(input.slice(valueStart, valueEnd), true),
				tagStart: -1,
				tagEnd: -1
			});
			return end;
		},
		openTag: (input, start, end) => {
			// One name that is not a word makes the whole tag another language's:
			// `{% endif %}` tokenizes as three attributes, of which `if` is a word
			// and would otherwise be respelled into the statement holding it.
			const templated = pending.some((site) => !isWordName(site.name));
			for (const site of pending) {
				if (templated) continue;
				site.tagStart = start;
				site.tagEnd = end;
				sites.push(site);
			}
			pending = [];
			return end;
		},
		closeTag: (input, start, end) => {
			pending = [];
			return end;
		}
	});
	return sites;
};

/**
 * What a document says, as a flat token stream: names folded to lower case and
 * values decoded, so two spellings of one document read identically. Text is
 * decoded wherever it is written, which understates a difference inside a
 * `<script>` rather than reporting an escaping change as a changed document.
 * @param {string} html a document
 * @returns {string} its stream, as the JSON of every token in order
 */
const tokenStream = (html) => {
	/** @type {string[]} */
	const out = [];
	tokenize(html, 0, {
		openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			out.push(`<${name}${selfClosing ? "/" : ""}`);
			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			out.push(`</${input.slice(nameStart, nameEnd).toLowerCase()}`);
			return end;
		},
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			const value =
				valueStart === -1
					? ""
					: decodeEntities(input.slice(valueStart, valueEnd), true);
			out.push(` ${name}=${value}`);
			return afterAttribute(valueStart, valueEnd, nameEnd, quoteType);
		},
		text: (input, start, end) => {
			out.push(decodeEntities(input.slice(start, end), false));
			return end;
		},
		comment: (input, start, end, dataStart, dataEnd) => {
			out.push(`<!--${input.slice(dataStart, dataEnd)}`);
			return end;
		},
		doctype: (input, start, end, nameStart, nameEnd) => {
			const name =
				nameStart === -1 ? "" : input.slice(nameStart, nameEnd).toLowerCase();
			out.push(`<!doctype ${name}`);
			return end;
		}
	});
	return JSON.stringify(out);
};

const AMPERSAND = /&/g;
const QUOTATION_MARK = /"/g;
const APOSTROPHE = /'/g;
// The characters the unquoted attribute value state ends on or rejects.
const BARE_UNSAFE = /[\t\n\f\r "'=<>`]/;
const ASCII_NAME = /^[a-z][a-z0-9-]*$/;

/**
 * @param {string} value a decoded value
 * @returns {boolean} whether it holds a C0 control character
 */
const hasControl = (value) => {
	for (const character of value) {
		if (/** @type {number} */ (character.codePointAt(0)) < 0x20) return true;
	}
	return false;
};

/**
 * @param {string} value a decoded value
 * @param {string} delimiter the delimiter it will be written in
 * @returns {string | null} the value as that delimiter's contents, or null for one holding a CR
 */
const escapeQuoted = (value, delimiter) => {
	// A CR here is one the source wrote, which reads as LF, or one a reference
	// spelled, which stays: nothing tells the two apart.
	if (value.includes("\r")) return null;
	const escaped = value.replace(AMPERSAND, "&amp;");
	return delimiter === '"'
		? escaped.replace(QUOTATION_MARK, "&#34;")
		: escaped.replace(APOSTROPHE, "&#39;");
};

/**
 * @param {string} value a decoded value
 * @returns {string | null} the value with no delimiter, or null where it needs one
 */
const bareValue = (value) => {
	if (value === "") return null;
	const escaped = value.replace(AMPERSAND, "&amp;");
	// A trailing `/` would fuse with the tag's `>` into a self-closing flag.
	if (BARE_UNSAFE.test(escaped) || escaped.endsWith("/")) return null;
	return escaped;
};

/**
 * @param {string} value a decoded value
 * @returns {string | null} every character of it as a numeric reference
 */
const asReferences = (value) => {
	// A reference bypasses the preprocessor, so an encoded CR would survive where
	// a written one is folded to LF — a different value, not a respelling of one.
	if (value === "" || hasControl(value)) return null;
	let out = "";
	for (const character of value) {
		const code = /** @type {number} */ (character.codePointAt(0));
		out += `&#x${code.toString(16)};`;
	}
	return out;
};

/**
 * @typedef {object} Respelling
 * @property {string} name how the row is labelled
 * @property {(site: Site, html: string) => string | null} write the attribute's new source text, or null to leave it alone
 * @property {((html: string) => boolean)=} skips whether a document is out of this respelling's reach
 */

/** @type {Respelling[]} */
const RESPELLINGS = [
	{
		name: "quote-double",
		write: (site) => {
			const escaped = escapeQuoted(site.value, '"');
			return escaped === null ? null : `${site.name}="${escaped}"`;
		}
	},
	{
		name: "quote-single",
		write: (site) => {
			const escaped = escapeQuoted(site.value, "'");
			return escaped === null ? null : `${site.name}='${escaped}'`;
		}
	},
	{
		name: "unquote",
		write: (site) => {
			const bare = bareValue(site.value);
			return bare === null ? null : `${site.name}=${bare}`;
		}
	},
	{
		name: "references",
		write: (site) => {
			const referenced = asReferences(site.value);
			return referenced === null ? null : `${site.name}="${referenced}"`;
		}
	},
	{
		// An attribute name is matched case-insensitively in the HTML namespace
		// only, so a document carrying foreign content is left alone whole.
		name: "name-case",
		skips: (html) => /<\s*(?:svg|math)[\s/>]/i.test(html),
		write: (site, html) =>
			ASCII_NAME.test(site.name)
				? `${site.name.toUpperCase()}${html.slice(
						site.start + site.name.length,
						site.end
					)}`
				: null
	}
];

/**
 * @param {string} html a document
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {string} the document, respelled
 */
const respell = (html, sites, respelling) => {
	let out = "";
	let read = 0;
	for (const site of sites) {
		const written = respelling.write(site, html);
		if (written === null) continue;
		out += html.slice(read, site.start) + written;
		read = site.end;
	}
	return out + html.slice(read);
};

// `bytes` is one output longer than the other, `differs` the two saying different
// things — which a missed boolean collapse reads as, not a worse defect than it.
/** @typedef {{ kind: "differs" | "bytes" | "throws", delta: number, mutated: string, note: string }} Finding */

/**
 * Whether respelling these sites moved the output, and how. An output of the
 * same length saying the same thing is not a finding: webpack keeps the source's
 * spelling where nothing beats it, so a delimiter survives on purpose.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html a document
 * @param {string} minified what it minifies to
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {Finding | null} what moved, or null
 */
const spellingFinding = (minify, html, minified, sites, respelling) => {
	const mutated = respell(html, sites, respelling);
	if (mutated === html) return null;
	// Verified against the tokenizer rather than argued for: a respelling that
	// moved the document is dropped instead of reported.
	if (tokenStream(mutated) !== tokenStream(html)) return null;
	/** @type {string} */
	let answer;
	try {
		answer = minify(mutated);
	} catch (error) {
		return {
			kind: "throws",
			delta: 0,
			mutated,
			note: thrownText(error)
		};
	}
	if (answer === minified) return null;
	const says = tokenStream(answer) !== tokenStream(minified);
	if (!says && answer.length === minified.length) return null;
	return {
		kind: says ? "differs" : "bytes",
		delta: answer.length - minified.length,
		mutated,
		note: ""
	};
};

/**
 * The enclosing tag on its own, where the finding survives being cut out of the
 * page — which is the whole of a repro someone can paste into a test.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html a document
 * @param {Site[]} sites the sites the finding shrank to
 * @param {Respelling} respelling how they are respelled
 * @returns {{ source: string, minified: string, mutated: string, answer: string } | null} the repro, or null where the page carries it
 */
const reproduce = (minify, html, sites, respelling) => {
	const { tagStart, tagEnd } = sites[0];
	if (sites.some((site) => site.tagStart !== tagStart)) return null;
	const source = html.slice(tagStart, tagEnd);
	// The slice carries the tag's other attributes too, and respelling those
	// would report the whole tag where the bisection named one attribute.
	const blamed = new Set(sites.map((site) => site.start - tagStart));
	try {
		const minified = minify(source);
		const found = spellingFinding(
			minify,
			source,
			minified,
			attributeSites(source).filter((site) => blamed.has(site.start)),
			respelling
		);
		if (found === null) return null;
		return {
			source,
			minified,
			mutated: found.mutated,
			answer: minify(found.mutated)
		};
	} catch (_error) {
		return null;
	}
};

/**
 * The tag in the output a difference falls inside, minified on its own. It is a
 * repro only where minifying that tag alone moves it too.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} minified one pass's output
 * @param {number} at where the second pass first differs
 * @returns {{ source: string, again: string } | null} the repro, or null
 */
const idempotenceRepro = (minify, minified, at) => {
	let found = "";
	tokenize(minified, 0, {
		openTag: (input, start, end) => {
			if (start <= at && at < end) found = input.slice(start, end);
			return end;
		}
	});
	if (found === "") return null;
	try {
		const again = minify(found);
		return again === found ? null : { source: found, again };
	} catch (_error) {
		return null;
	}
};

/** @type {Record<number, string>} */
const NODE_TYPE_NAMES = {};
for (const [name, type] of Object.entries(NodeType)) {
	NODE_TYPE_NAMES[type] = name;
}

/**
 * The sub-ranges an element states: its own opening tag, and the name and value
 * of every attribute the source wrote into that tag. §13.2 merges a second
 * `<html>` or `<body>` tag's attributes onto the element already open, so an
 * attribute can be written outside the tag holding it and is left to the tag it
 * was written in.
 * @param {import("../../../lib/html/syntax-parser").HtmlPath} nodePath the accessor
 * @returns {readonly [string, number, number][] | undefined} each `[name, start, end]`
 */
const htmlInnerRanges = (nodePath) => {
	if (nodePath.type() !== NodeType.Element) return undefined;
	const start = nodePath.range()[0];
	const content = nodePath.rangeOf(Part.content);
	// The parser inserted this element, or the adoption agency cloned it: no tag
	// was written, so it states no offsets to hold.
	if (content === null || content[0] <= start) return undefined;
	const tagEnd = content[0];
	/** @type {[string, number, number][]} */
	const inner = [["opening tag", start, tagEnd]];
	const count = nodePath.fieldCount(Field.attributes);
	for (let index = 0; index < count; index++) {
		const attribute = nodePath.field(index, Field.attributes);
		const name = nodePath.rangeOf(Part.name, attribute);
		// The copy `<selectedcontent>` mirrors of an option's content carries
		// the option's attributes without a source of their own.
		if (name === null) continue;
		const [nameStart, nameEnd] = name;
		if (nameStart < start || nameStart >= tagEnd) continue;
		inner.push(["attribute name", nameStart, nameEnd]);
		const value = nodePath.rangeOf(Part.value, attribute);
		inner.push([
			"attribute value",
			value === null ? -1 : value[0],
			value === null ? -1 : value[1]
		]);
	}
	return inner;
};

/**
 * Hold the parser's ranges to what they claim about the document they came
 * from. HTML owes less here than CSS does, and the two exclusions are §13.2
 * rather than slack — turning them on reports 4031 and 22 findings over the
 * fixtures. An element's end is its start tag's until an end tag is read, so
 * `<html>` in a document omitting `</html>` ends before the `<body>` it holds;
 * and an element left open is closed by the next tag, so `<p>a<p>b` gives two
 * paragraphs whose ranges share those bytes.
 * @param {string} html a document
 * @returns {import("./relations").Report[]} what the ranges broke
 */
const htmlSpans = (html) =>
	spans({
		length: html.length,
		contains: false,
		siblings: false,
		walk: pathSpanWalk({
			length: html.length,
			run: (enter, exit) => {
				/** @type {Record<number, { enter: typeof enter, exit: typeof exit }>} */
				const visitors = {};
				for (const type of Object.values(NodeType)) {
					visitors[type] = { enter, exit };
				}
				new SourceProcessor().use(visitors).process(html, {});
			},
			start: (nodePath) => nodePath.range()[0],
			end: (nodePath) => nodePath.range()[1],
			name: (nodePath) => NODE_TYPE_NAMES[nodePath.type()],
			inner: htmlInnerRanges
		})
	});

/**
 * @typedef {{ what: string, type: number, tag: string, start: number, end: number, size: number, lo: number, hi: number, context: string }} NodeRun
 */

/**
 * The fragment context a node's children are read back in: its tag, prefixed
 * with the namespace a foreign one lives in.
 * @param {EXPECTED_ANY} nodePath the node
 * @returns {string} the context, or `""` for a node that is not an element
 */
const fragmentContextOf = (nodePath) => {
	if (nodePath.type() !== NodeType.Element) return "";
	const namespace = _namespaceOf(nodePath.node);
	if (namespace === Namespace.SVG) return `svg ${nodePath.name()}`;
	if (namespace === Namespace.MathML) return `math ${nodePath.name()}`;
	return nodePath.name();
};

// Reparsing every node costs a parse of its own, so a document would cost its
// size times its depth. Each one is capped at this many times its own bytes.
const SLICE_BUDGET_FACTOR = 4;

/**
 * Every node in one document, in post-order with the size of its subtree —
 * which is what lets a subtree be read as a run rather than walked again. `lo`
 * and `hi` are how far that subtree reaches, and `context` the tag the node sat
 * in, which is what the fragment parsing algorithm needs to read it back.
 * @param {string} html a document
 * @param {string=} fragmentContext the element to parse it as the contents of
 * @returns {NodeRun[]} each node, children before parents
 */
const htmlNodeRuns = (html, fragmentContext) => {
	/** @type {NodeRun[]} */
	const runs = [];
	/** @type {{ held: number, lo: number, hi: number, context: string }[]} */
	const stack = [{ held: 0, lo: html.length, hi: 0, context: "" }];
	/** @type {Record<number, { enter: (nodePath: EXPECTED_ANY) => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {};
	for (const type of Object.values(NodeType)) {
		visitors[type] = {
			enter: (nodePath) => {
				stack.push({
					held: 0,
					lo: html.length,
					hi: 0,
					context: fragmentContextOf(nodePath)
				});
			},
			exit: (nodePath) => {
				const frame = /** @type {EXPECTED_ANY} */ (stack.pop());
				const type = nodePath.type();
				const tag = type === NodeType.Element ? nodePath.name() : "";
				const start = nodePath.range()[0];
				const end = nodePath.range()[1];
				const size = frame.held + 1;
				const lo = Math.min(frame.lo, start);
				const hi = Math.max(frame.hi, end);
				const parent = stack[stack.length - 1];
				parent.held += size;
				parent.lo = Math.min(parent.lo, lo);
				parent.hi = Math.max(parent.hi, hi);
				runs.push({
					what: `${NODE_TYPE_NAMES[type]}${tag === "" ? "" : `:${tag}`}`,
					type,
					tag,
					start,
					end,
					size,
					lo,
					hi,
					context: parent.context
				});
			}
		};
	}
	new SourceProcessor()
		.use(visitors)
		.process(html, fragmentContext === undefined ? {} : { fragmentContext });
	return runs;
};

/**
 * What one node's subtree says: its shape and the offsets inside it, read
 * against the node's own start so the same construct digests the same wherever
 * it was found.
 * @param {readonly NodeRun[]} runs every node in post-order
 * @param {number} at which one to digest
 * @returns {string} its digest
 */
const runDigest = (runs, at) => {
	const node = runs[at];
	/** @type {string[]} */
	const out = [];
	for (let index = at - node.size + 1; index <= at; index++) {
		const one = runs[index];
		out.push(`${one.what}[${one.start - node.start},${one.end - node.start})`);
	}
	return out.join(" ");
};

/**
 * Whether a node's subtree has a `table` directly inside a `p`, which only quirks
 * mode builds; a fragment parse is never in quirks mode, so it can't read it back.
 * @param {readonly NodeRun[]} runs every node in post-order
 * @param {number} at the node
 * @returns {boolean} whether the subtree depends on the document's mode
 */
const holdsQuirksTable = (runs, at) => {
	for (let index = at - runs[at].size + 1; index <= at; index++) {
		if (runs[index].tag === "table" && runs[index].context === "p") return true;
	}
	return false;
};

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, read back as the contents of the element they sat in, give that node
 * back.
 *
 * The context is the whole point here. §13.2 decides what a tag means from the
 * insertion mode it is read in, so `<td>x</td>` on its own is not a cell at all
 * — the parser drops it and foster-parents the text. Handing the enclosing tag
 * to the fragment parsing algorithm is the spec's own answer to that, and it is
 * what the browser does for `innerHTML`.
 *
 * Two shapes are left out rather than normalized: an element the parser
 * inserted or cloned wrote no tag to slice, and an element whose end is its
 * start tag's — §13.2 leaves it there until an end tag is read — has a range
 * that does not hold its own children, so there is no slice to reparse.
 * @param {string} html a document
 * @returns {{ reports: import("./relations").Report[], read: number, skipped: number, capped: number, repeats: number }} what broke, how many answered, and what was left out
 */
const htmlSlices = (html) => {
	const runs = htmlNodeRuns(html);
	/** @type {import("./relations").SliceCandidate[]} */
	const candidates = [];
	let budget = html.length * SLICE_BUDGET_FACTOR;
	let capped = 0;
	let repeats = 0;
	let skipped = 0;
	/** @type {Set<string>} */
	const seen = new Set();
	for (let at = 0; at < runs.length; at++) {
		const node = runs[at];
		// No tag to slice, no range holding its own subtree, or nothing to be the
		// contents of: each is the document saying where the node came from.
		if (
			node.end <= node.start ||
			node.start > node.lo ||
			node.end < node.hi ||
			node.context === "" ||
			holdsQuirksTable(runs, at)
		) {
			skipped++;
			continue;
		}
		const said = runDigest(runs, at);
		if (seen.has(said)) {
			repeats++;
			continue;
		}
		seen.add(said);
		const text = html.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		candidates.push({
			what: node.what,
			said,
			reparse: () => {
				/** @type {NodeRun[]} */
				let again;
				try {
					again = htmlNodeRuns(text, node.context);
				} catch (_error) {
					return null;
				}
				const want = again.findIndex(
					(one) =>
						one.what === node.what && one.start === 0 && one.end === text.length
				);
				return want === -1 ? null : runDigest(again, want);
			}
		});
	}
	const answered = sliceRelation(candidates);
	return { ...answered, skipped: answered.skipped + skipped, capped, repeats };
};

/**
 * What one parse of a document amounts to: every node's type and range, every
 * tag and attribute name and value it derived, and the bytes the printer makes
 * of it.
 *
 * WHY: the names are the point, not the offsets. `parseHtml` interns a tag or
 * attribute name a document spells for the first time as a slice of that
 * document, and drops those entries on the next parse — so a name from the
 * previous document would come back with every offset still right. Reading the
 * names back is what would catch that, and printing reads the rest.
 * @param {string} html a document
 * @param {(html: string) => string} print the printer to read it back out with
 * @returns {string} the digest
 */
const htmlPurityDigest = (html, print) => {
	const digest = hasher();
	/** @type {Record<number, { enter: () => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {};
	const read = (/** @type {EXPECTED_ANY} */ nodePath) => {
		const type = nodePath.type();
		digest.update(`${NODE_TYPE_NAMES[type]}[${nodePath.range().join(",")})`);
		if (type === NodeType.Element) {
			digest.update(`|<${nodePath.name()}>|${_namespaceOf(nodePath.node)}`);
			const count = nodePath.fieldCount(Field.attributes);
			for (let index = 0; index < count; index++) {
				const attribute = nodePath.field(index, Field.attributes);
				digest.update(
					`|${nodePath.name(attribute)}=${nodePath.value(attribute)}`
				);
			}
		}
		digest.update("\n");
	};
	for (const type of Object.values(NodeType)) {
		visitors[type] = { enter: () => {}, exit: read };
	}
	try {
		new SourceProcessor().use(visitors).process(html, {});
		digest.update(print(html));
	} catch (error) {
		return `refused: ${/** @type {Error} */ (error).message}`;
	}
	return digest.hex();
};

/**
 * Every respelling this document's output depends on.
 * @param {(html: string) => string} minify the printer under test
 * @param {string} html the document
 * @param {string} minified what it minifies to
 * @returns {import("./relations").Report[]} what moved, and the smallest repro found for each
 */
const sweepRespellings = (minify, html, minified) => {
	/** @type {import("./relations").Report[]} */
	const reports = [];
	const sites = attributeSites(html);
	for (const respelling of RESPELLINGS.filter((one) =>
		wantedRespelling(one.name)
	)) {
		if (respelling.skips !== undefined && respelling.skips(html)) continue;
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(minify, html, minified, subset, respelling);
		const found = holds(sites);
		if (found === null) continue;
		const carried =
			found.kind === "throws" ? sites : shrink(holds, sites, found.kind);
		// Read off the sites that were kept, so the byte count is the repro's and
		// not every respelled attribute's added up.
		const blamed = (carried === sites ? found : holds(carried)) || found;
		const repro =
			blamed.kind === "throws"
				? null
				: reproduce(minify, html, carried, respelling);
		reports.push({
			relation: `respelling ${respelling.name}`,
			what:
				blamed.kind === "throws"
					? `threw: ${blamed.note}`
					: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro:
				repro === null
					? `    ${oneLine(html.slice(carried[0].tagStart, carried[0].tagEnd), 80)}   (only in the page)`
					: `    ${oneLine(repro.source, 76)}  ->  ${oneLine(repro.minified, 76)}\n    ${oneLine(repro.mutated, 76)}  ->  ${oneLine(repro.answer, 76)}`
		});
	}
	return reports;
};

// Where a cut lands, by the construct it interrupts: each pattern ends where the
// document is cut, just inside what the end of the input then has to close.
/** @type {[string, RegExp][]} */
const HTML_CUTS = [
	["in a start tag's name", /<[a-z]/gi],
	["in an end tag's name", /<\/[a-z]/gi],
	["in an attribute's name", /<[a-z][^\s<>]*\s+[a-z]/gi],
	["after an attribute's =", /<[a-z][^\s<>]*\s+[a-z-]+=/gi],
	["in a double-quoted value", /[=]"[^"]/g],
	["in a single-quoted value", /[=]'[^']/g],
	["in an unquoted value", /[=][a-z0-9]/gi],
	["before a tag's >", /<[a-z][^<>]*(?=>)/gi],
	["between a tag's / and >", /<[a-z][^<>]*\/(?=>)/gi],
	["in a comment", /<!--./g],
	["in a doctype", /<!doctype/gi],
	["in a character reference", /&[a-z#]/gi],
	["in a <style> body", /<style[^>]*>[^<]/gi],
	["in a <script> body", /<script[^>]*>[^<]/gi],
	["in escapable raw text", /<(?:textarea|title)[^>]*>[^<]/gi],
	["in foreign content", /<(?:svg|math)[^>]*>/gi],
	["in a CDATA section", /<!\[CDATA\[./g],
	["in a style attribute", /style="[^"]/gi]
];

/** @type {import("./index").SyntaxInvariants} */
const invariants = {
	printers: () =>
		PRESETS.map(([name, options]) => {
			const minify = printerFor(options);
			return {
				name,
				minify,
				says: tokenStream,
				repro: (printed, at) => idempotenceRepro(minify, printed, at)
			};
		}),
	spans: htmlSpans,
	slices: (html) => htmlSlices(html).reports,
	digest: (html) => htmlPurityDigest(html, printerFor(PRESETS[0][1])),
	respellings: (printer, html, printed) =>
		sweepRespellings(printer.minify, html, printed),
	cuts: (html) => cutsAt(html, HTML_CUTS)
};

// The invariants, plus the presets and printers the comparison script runs.
module.exports = {
	...invariants,
	AGGRESSIVE_OPTIONS,
	DEFAULT_OPTIONS,
	EMBEDDED_LEGACY_OPTIONS,
	EMBEDDED_OPTIONS,
	HTML_CUTS,
	PRESETS,
	htmlPurityDigest,
	htmlSlices,
	htmlSpans,
	idempotenceRepro,
	printerFor,
	sweepRespellings,
	tokenStream
};
