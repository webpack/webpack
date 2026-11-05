/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// What every other tool assumes when told no target: current engines only.
// Resolved rather than written out, so it does not go stale.
const MODERN_BROWSERS = require("browserslist")(
	"last 1 chrome version, last 1 firefox version, last 1 safari version, last 1 edge version"
);
const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	NodeType,
	Part,
	TokenStream,
	TokenType,
	pickTransforms,
	unescapeIdentifier
} = require("../../../lib/css/syntax-parser");
const { wantedRespelling } = require("../../../tooling/compare-tools-harness");
const {
	hasher,
	oneLine,
	pathSpanWalk,
	shrink,
	signed,
	sliceRelation,
	spans,
	thrownText
} = require("./relations");

/** @typedef {import("../../../lib/css/syntax-parser").CssPrintOptions} CssPrintOptions */
/** @typedef {import("../../../lib/css/syntax-parser").CssTransformOptions} CssTransformOptions */

/** @type {CssPrintOptions} */
const DEFAULT_OPTIONS = {};

/** @type {CssPrintOptions} */
const TARGET_OPTIONS = { environment: { browsers: MODERN_BROWSERS } };

/** @type {CssPrintOptions} */
const TARGET_VARS_OPTIONS = {
	environment: { browsers: MODERN_BROWSERS },
	rewriteCustomProperties: true
};

// WHY: every engine `MODERN_BROWSERS` names reads nesting, color-mix and the
// rest, so under it the lowerings never run. A pinned pre-nesting target that
// reads `:is()` is the one the nesting lowering needs, and never goes stale.
/** @type {CssPrintOptions} */
const LEGACY_TARGET_OPTIONS = {
	environment: { browsers: ["chrome 100", "firefox 100", "safari 15.4"] }
};

// The option sets the invariants are held over: the ones the comparison's own
// webpack rows are measured with, plus the legacy target for the lowerings.
/** @type {[string, CssPrintOptions][]} */
const PRESETS = [
	["default", DEFAULT_OPTIONS],
	["target", TARGET_OPTIONS],
	["target+vars", TARGET_VARS_OPTIONS],
	["legacy", LEGACY_TARGET_OPTIONS]
];

/**
 * @param {CssPrintOptions & CssTransformOptions} options one preset's minimizer options
 * @returns {(css: string) => string} the printer those options name
 */
const printerFor = (options) => {
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		transforms: pickTransforms(options),
		...options
	};
	return (css) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(css, printOptions)
		).code;
};

// Each token type by what a report calls it, read off the exports rather than
// listed, so a type the tokenizer gains is named without editing this.
/** @type {Map<number, string>} */
const TOKEN_TYPE_NAMES = new Map();
for (const [name, value] of Object.entries(TokenType)) {
	TOKEN_TYPE_NAMES.set(
		value,
		name.replace(/\B(?=[A-Z][a-z])/g, " ").toLowerCase()
	);
}

// How much of a stylesheet one cut keeps at most, where the source offers a
// construct that small: the cost is two prints of it under every preset.
const CUT_CONSTRUCT_LIMIT = 2048;

/**
 * The stylesheet cut short inside and just after one token of each type, since
 * the end of the input is where the tokenizer and the parser close what the
 * source left open. Each cut keeps only the top-level construct it falls in,
 * which is all the end of the input can reach — the first one small enough.
 * @param {string} css a stylesheet
 * @returns {[string, string][]} `[where, cut]` for each place it was cut
 */
const cssCuts = (css) => {
	/** @type {Map<number, [number, number, number]>} */
	const first = new Map();
	/** @type {Set<number>} */
	const small = new Set();
	let depth = 0;
	let construct = 0;
	/**
	 * @param {number} type the token's type
	 * @param {number} start where it starts
	 * @param {number} end where it ends
	 */
	const offer = (type, start, end) => {
		if (small.has(type)) return;
		if (end - construct <= CUT_CONSTRUCT_LIMIT) {
			first.set(type, [construct, start, end]);
			small.add(type);
		} else if (!first.has(type)) {
			first.set(type, [construct, start, end]);
		}
	};
	// The stream skips a comment rather than returning it, so its callback is
	// the one place a comment is seen to cut inside.
	const stream = new TokenStream(css, 0, undefined, (_input, start, end) => {
		offer(TokenType.Comment, start, end);
		return end;
	});
	for (;;) {
		const token = stream.consume();
		const type = token.type;
		if (type === TokenType.EOF) break;
		offer(type, token.start, token.end);
		if (
			type === TokenType.Function ||
			type === TokenType.LeftParenthesis ||
			type === TokenType.LeftSquareBracket ||
			type === TokenType.LeftCurlyBracket
		) {
			depth++;
		} else if (
			depth !== 0 &&
			(type === TokenType.RightParenthesis ||
				type === TokenType.RightSquareBracket ||
				type === TokenType.RightCurlyBracket)
		) {
			depth--;
			if (depth === 0 && type === TokenType.RightCurlyBracket) {
				construct = token.end;
			}
		} else if (depth === 0 && type === TokenType.Semicolon) {
			construct = token.end;
		}
	}
	/** @type {[string, string][]} */
	const cuts = [];
	for (const [type, [from, start, end]] of first) {
		const name = TOKEN_TYPE_NAMES.get(type) || String(type);
		if (end - start > 1) {
			cuts.push([
				`inside a ${name}`,
				css.slice(from, start + ((end - start) >> 1))
			]);
		}
		cuts.push([`after a ${name}`, css.slice(from, end)]);
	}
	return cuts;
};

/**
 * What a stylesheet says, as a flat token stream: whitespace runs collapse to
 * one marker (dropping a comment leaves the run either side of it), so only a
 * token the printer actually rewrote separates two outputs. A respelling is one,
 * which is why `#FFF` -> `#fff` between two passes reads as `differs` here.
 * @param {string} css a stylesheet
 * @returns {string} its stream, as the JSON of every token in order
 */
const tokenStream = (css) => {
	const stream = new TokenStream(css);
	/** @type {string[]} */
	const out = [];
	for (;;) {
		const token = stream.consume();
		if (token.type === TokenType.EOF) break;
		if (token.type === TokenType.Whitespace) {
			if (out[out.length - 1] !== " ") out.push(" ");
			continue;
		}
		out.push(`${token.type}:${css.slice(token.start, token.end)}`);
	}
	return JSON.stringify(out);
};

/** @type {Record<number, string>} */
const NODE_TYPE_NAMES = {};
for (const [name, type] of Object.entries(NodeType)) {
	NODE_TYPE_NAMES[type] = name;
}

// Which types state a sub-range of their own. One accessor view answers every
// property for every node, so reading `nameStart` off a token reports whatever
// that column holds for it — the type decides, never what came back.
/** @type {Set<number>} */
const NAMED = new Set([
	NodeType.Declaration,
	NodeType.AtRule,
	NodeType.Function
]);
/** @type {Set<number>} */
const BLOCKED = new Set([NodeType.AtRule, NodeType.QualifiedRule]);

/**
 * The sub-ranges a node names, as the span relation reads them.
 * @param {import("../../../lib/css/syntax-parser").CssPath} nodePath the accessor
 * @returns {readonly [string, number, number][] | undefined} each `[name, start, end]`
 */
const cssInnerRanges = (nodePath) => {
	const type = nodePath.type();
	/** @type {[string, number, number][]} */
	const inner = [];
	const name = NAMED.has(type) ? nodePath.rangeOf(Part.name) : null;
	if (name !== null) inner.push(["name", name[0], name[1]]);
	if (BLOCKED.has(type)) {
		const block = nodePath.rangeOf(Part.block);
		inner.push([
			"block",
			block === null ? -1 : block[0],
			block === null ? -1 : block[1]
		]);
	}
	return inner.length === 0 ? undefined : inner;
};

/**
 * Hold the parser's ranges to what they claim about the stylesheet they came
 * from. CSS owes every part of the relation: a component value sits inside the
 * declaration that holds it, and two of them never overlap.
 * @param {string} css a stylesheet
 * @returns {import("./relations").Report[]} what the ranges broke
 */
const cssSpans = (css) =>
	spans({
		length: css.length,
		contains: true,
		siblings: true,
		walk: pathSpanWalk({
			length: css.length,
			run: (enter, exit) => {
				/** @type {Record<number, { enter: typeof enter, exit: typeof exit }>} */
				const visitors = {};
				for (const type of Object.values(NodeType)) {
					visitors[type] = { enter, exit };
				}
				new SourceProcessor().use(visitors).process(css, {});
			},
			start: (nodePath) => nodePath.range()[0],
			end: (nodePath) => nodePath.range()[1],
			name: (nodePath) => NODE_TYPE_NAMES[nodePath.type()],
			// A comment reaches the walk from the tokenizer rather than from the
			// tree, so it arrives before the rule holding it has opened.
			structural: (nodePath) => nodePath.type() !== NodeType.Comment,
			inner: cssInnerRanges
		})
	});

// What a node's own source has to be wrapped in to parse on its own. A rule
// stands alone; a declaration needs a rule around it and a component value a
// declaration, which is the offset shift each answer is read back through.
/** @type {Record<number, [string, string]>} */
const CSS_SLICE_CONTEXT = {
	[NodeType.AtRule]: ["", ""],
	[NodeType.QualifiedRule]: ["", ""],
	[NodeType.Declaration]: ["a{", "}"]
};

const CSS_VALUE_CONTEXT = /** @type {[string, string]} */ (["a{b:", "}"]);

// Reparsing every node costs a parse of its own, so a stylesheet would cost its
// size times its depth. Each one is capped at this many times its own bytes,
// spent leaves first, which is where a range is most likely to be wrong.
const SLICE_BUDGET_FACTOR = 4;

/**
 * @typedef {{ type: number, start: number, end: number, size: number }} NodeRun
 */

/**
 * Every node in one stylesheet, in post-order with the size of its subtree —
 * which is what lets a subtree be read as a run rather than walked again. A
 * comment is left out: it reaches the walk from the tokenizer, so it would land
 * in whichever node happened to be open.
 * @param {string} css a stylesheet
 * @returns {NodeRun[]} each node, children before parents
 */
const cssNodeRuns = (css) => {
	/** @type {NodeRun[]} */
	const runs = [];
	// How many nodes each open node has collected, so a size is a sum rather
	// than a second descent.
	/** @type {number[]} */
	const held = [0];
	/** @type {Record<number, { enter: () => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {};
	for (const type of Object.values(NodeType)) {
		visitors[type] = {
			enter: () => {
				held.push(0);
			},
			exit: (nodePath) => {
				const inside = /** @type {number} */ (held.pop());
				if (nodePath.type() === NodeType.Comment) return;
				const size = inside + 1;
				held[held.length - 1] += size;
				runs.push({
					type: nodePath.type(),
					start: nodePath.range()[0],
					end: nodePath.range()[1],
					size
				});
			}
		};
	}
	new SourceProcessor().use(visitors).process(css, {});
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
		out.push(
			`${NODE_TYPE_NAMES[one.type]}[${one.start - node.start},${
				one.end - node.start
			})`
		);
	}
	return out.join(" ");
};

/**
 * Hold each node's own source to the node it came from: the bytes between its
 * offsets, wrapped in the least context that lets them parse, give that node
 * back.
 * @param {string} css a stylesheet
 * @returns {{ reports: import("./relations").Report[], read: number, skipped: number, capped: number, repeats: number }} what broke, how many answered, and what was left out
 */
const cssSlices = (css) => {
	const runs = cssNodeRuns(css);
	/** @type {import("./relations").SliceCandidate[]} */
	const candidates = [];
	let budget = css.length * SLICE_BUDGET_FACTOR;
	let capped = 0;
	let repeats = 0;
	// One shape is one question: a bundle carries the same `Identifier[0,3)`
	// hundreds of thousands of times, and reparsing each one asks nothing the
	// first did not. Spends the budget on the shapes a source actually holds.
	/** @type {Set<string>} */
	const seen = new Set();
	for (let at = 0; at < runs.length; at++) {
		const node = runs[at];
		const said = runDigest(runs, at);
		// Before the budget, not after: a shape already asked about must not spend
		// what is left, or a bundle's millionth identifier crowds out every
		// composite node in it.
		if (seen.has(said)) {
			repeats++;
			continue;
		}
		seen.add(said);
		const text = css.slice(node.start, node.end);
		if (text.length > budget) {
			capped++;
			continue;
		}
		budget -= text.length;
		const [prefix, suffix] = CSS_SLICE_CONTEXT[node.type] || CSS_VALUE_CONTEXT;
		candidates.push({
			what: NODE_TYPE_NAMES[node.type],
			said,
			reparse: () => {
				/** @type {NodeRun[]} */
				let again;
				try {
					again = cssNodeRuns(`${prefix}${text}${suffix}`);
				} catch (_error) {
					return null;
				}
				// The node this slice is meant to be, where the wrapper put it. Read
				// out of its stylesheet the parser can take these bytes for something
				// else, or for nothing: what they lacked is context, not a range.
				const want = again.findIndex(
					(one) =>
						one.type === node.type &&
						one.start === prefix.length &&
						one.end === prefix.length + text.length
				);
				return want === -1 ? null : runDigest(again, want);
			}
		});
	}
	return { ...sliceRelation(candidates), capped, repeats };
};

/**
 * What one parse of a stylesheet amounts to: every node's type and range, the
 * names and values it derived, and the bytes the printer makes of it.
 *
 * WHY: the derived values are the point, not the offsets. An unescaped name or
 * a cached word can come back from the last parse with every offset still
 * right, and printing reads all of them — so the output is digested too, which
 * covers the derived fields a node type does not name here.
 * @param {string} css a stylesheet
 * @param {(css: string) => string} print the printer to read it back out with
 * @returns {string} the digest
 */
const cssPurityDigest = (css, print) => {
	const digest = hasher();
	/** @type {Record<number, { enter: () => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {};
	const read = (
		/** @type {import("../../../lib/css/syntax-parser").CssPath} */ nodePath
	) => {
		const type = nodePath.type();
		digest.update(`${NODE_TYPE_NAMES[type]}[${nodePath.range().join(",")})`);
		if (NAMED.has(type)) {
			const written = nodePath.source(
				.../** @type {[number, number]} */ (nodePath.rangeOf(Part.name))
			);
			digest.update(`|${written}|${nodePath.name()}`);
		}
		digest.update("\n");
	};
	for (const type of Object.values(NodeType)) {
		visitors[type] = { enter: () => {}, exit: read };
	}
	try {
		new SourceProcessor().use(visitors).process(css, {});
		digest.update(print(css));
	} catch (error) {
		return `refused: ${/** @type {Error} */ (error).message}`;
	}
	return digest.hex();
};

/**
 * What a stylesheet says, token by token, with each one's value as the parser
 * resolves it rather than as the source wrote it: an escape resolved, a string
 * without its delimiters, a number as its value and its unit folded.
 *
 * WHY: this is what a respelling has to be judged against. The raw stream
 * `idempotence` reads would call `8PX` and `8px`, or `"a"` and `'a'`, two
 * different outputs — so every respelling would report the printer for keeping
 * a spelling that says exactly what the other one says.
 * @param {string} css a stylesheet
 * @returns {string} its meaning, as the JSON of every token in order
 */
const tokenMeaning = (css) => {
	const stream = new TokenStream(css);
	/** @type {string[]} */
	const out = [];
	for (;;) {
		const token = stream.consume();
		if (token.type === TokenType.EOF) break;
		const text = css.slice(token.start, token.end);
		out.push(`${token.type}:${canonicalToken(token.type, text, token)}`);
	}
	return JSON.stringify(out);
};

/**
 * One token's value as the parser resolves it.
 * @param {number} type which token it is
 * @param {string} text the token as the source spelled it
 * @param {EXPECTED_ANY} token the token, for a dimension's unit
 * @returns {string} its value
 */
const canonicalToken = (type, text, token) => {
	if (type === TokenType.Ident) return unescapeIdentifier(text);
	// The sigil is not part of the name, and an at-rule name is matched
	// case-insensitively where an identifier is not.
	if (type === TokenType.AtKeyword) {
		return unescapeIdentifier(text.slice(1)).toLowerCase();
	}
	if (type === TokenType.Hash) return unescapeIdentifier(text.slice(1));
	if (type === TokenType.Function) {
		return unescapeIdentifier(text.slice(0, -1)).toLowerCase();
	}
	if (type === TokenType.String) return unescapeIdentifier(text.slice(1, -1));
	if (type === TokenType.Dimension) {
		const at = token.unitStart - token.start;
		return `${Number(text.slice(0, at))}${text.slice(at).toLowerCase()}`;
	}
	if (type === TokenType.Number || type === TokenType.Percentage) {
		return String(
			Number(type === TokenType.Percentage ? text.slice(0, -1) : text)
		);
	}
	return text;
};

/**
 * @typedef {object} Site
 * @property {number} start where the token begins
 * @property {number} end where it ends
 * @property {number} type which token it is
 * @property {string} text the token as the source spelled it
 * @property {number} unitStart where a dimension's unit begins, or -1
 */

/**
 * Where a declaration an escape cannot be respelled in sits: a custom property,
 * `@property`'s `initial-value`, `@function`'s `result` and a lone `{}` block
 * are kept as authored, and a `unicode-range` reads its tokens' representations.
 * @param {string} css a stylesheet
 * @returns {[number, number][]} each range, in source order
 */
const opaqueDeclarationRanges = (css) => {
	/** @type {[number, number][]} */
	const ranges = [];
	// The at-rules open around the walk: `result` stays `@function`'s inside a
	// condition nested in it.
	/** @type {string[]} */
	const atRules = [];
	/** @type {Record<number, { enter: (nodePath: EXPECTED_ANY) => void, exit: (nodePath: EXPECTED_ANY) => void }>} */
	const visitors = {
		[NodeType.AtRule]: {
			enter: (nodePath) => {
				atRules.push(unescapeIdentifier(nodePath.name()).toLowerCase());
			},
			exit: () => {
				atRules.pop();
			}
		},
		[NodeType.Declaration]: {
			enter: () => {},
			exit: (nodePath) => {
				const name = nodePath.name().toLowerCase();
				const first = nodePath.childCount() === 1 ? nodePath.child(0) : -1;
				if (
					name.startsWith("--") ||
					// CSS Syntax 3 §7.1 reads a urange off the source text, and Chromium
					// reads one only from a literal `u`.
					name === "unicode-range" ||
					(name === "initial-value" &&
						atRules[atRules.length - 1] === "property") ||
					(name === "result" && atRules.includes("function")) ||
					(first !== -1 &&
						nodePath.type(first) === NodeType.SimpleBlock &&
						nodePath.value(first) === "{")
				) {
					ranges.push([nodePath.range()[0], nodePath.range()[1]]);
				}
			}
		}
	};
	new SourceProcessor().use(visitors).process(css, {});
	// Visited in the order the walk finishes them, which puts a nested block's
	// declarations after its parent's later ones.
	return ranges.sort((a, b) => a[0] - b[0]);
};

/**
 * Every token a respelling could rewrite, in source order.
 * @param {string} css a stylesheet
 * @returns {Site[]} the sites
 */
const cssSites = (css) => {
	const kept = opaqueDeclarationRanges(css);
	const stream = new TokenStream(css);
	/** @type {Site[]} */
	const sites = [];
	// Both are in source order, so the ranges are walked alongside the tokens
	// rather than searched for each one: a stylesheet of custom properties holds
	// thousands, and asking every token about all of them is quadratic.
	let range = 0;
	// A container style query compares token streams as written, so the printer
	// keeps each `style()` whole (CSS Conditional 5 §5).
	let containerPrelude = false;
	let styleDepth = 0;
	for (;;) {
		const token = stream.consume();
		if (token.type === TokenType.EOF) break;
		if (styleDepth !== 0) {
			if (
				token.type === TokenType.Function ||
				token.type === TokenType.LeftParenthesis
			) {
				styleDepth++;
			} else if (token.type === TokenType.RightParenthesis) {
				styleDepth--;
			}
			continue;
		}
		if (token.type === TokenType.AtKeyword) {
			containerPrelude =
				unescapeIdentifier(
					css.slice(token.start + 1, token.end)
				).toLowerCase() === "container";
		} else if (
			token.type === TokenType.LeftCurlyBracket ||
			token.type === TokenType.Semicolon
		) {
			containerPrelude = false;
		} else if (
			containerPrelude &&
			token.type === TokenType.Function &&
			unescapeIdentifier(
				css.slice(token.start, token.end - 1)
			).toLowerCase() === "style"
		) {
			styleDepth = 1;
			continue;
		}
		while (range < kept.length && kept[range][1] <= token.start) range++;
		if (range < kept.length && token.start >= kept[range][0]) continue;
		sites.push({
			start: token.start,
			end: token.end,
			type: token.type,
			text: css.slice(token.start, token.end),
			unitStart: token.type === TokenType.Dimension ? token.unitStart : -1
		});
	}
	return sites;
};

/**
 * One character of an identifier written as the escape §4.3.7 resolves to the
 * same character, which is the spelling a minifier comparing raw text misses.
 * @param {string} name an identifier, or the name part of one
 * @returns {string | null} it with its first ASCII letter escaped, or null
 */
const asEscaped = (name) => {
	const at = name.search(/[a-z]/i);
	if (at === -1) return null;
	const code = name.charCodeAt(at).toString(16);
	// The space ends the escape, so the character after it stays its own.
	return `${name.slice(0, at)}\\${code} ${name.slice(at + 1)}`;
};

/**
 * @param {string} text a string token as written, delimiters included
 * @param {string} quote the delimiter to write it with
 * @returns {string | null} the same string under that delimiter, or null
 */
const asQuoted = (text, quote) => {
	const had = text[0];
	if (had !== '"' && had !== "'") return null;
	if (had === quote) return null;
	// Unterminated at end of input: re-delimiting it would close it.
	if (text.length < 2 || text[text.length - 1] !== had) return null;
	const body = text.slice(1, -1);
	// Already escaped for the old delimiter, and the new one is not escaped at
	// all: both would have to be rewritten, so leave those alone.
	if (body.includes("\\") || body.includes(quote)) return null;
	return `${quote}${body}${quote}`;
};

/**
 * @typedef {object} Respelling
 * @property {string} name how the row is labelled
 * @property {(site: Site) => string | null} write the token's new source text, or null to leave it alone
 */

/**
 * Each writes the same value a different way, which the spec says in so many
 * words: §4.3.7 for an escape, an ASCII case-insensitive match for a unit and
 * an at-rule name.
 *
 * WHY: an identifier is deliberately not case-respelled, though a property name
 * and a keyword are case-insensitive too. Which of those an identifier is
 * depends on where it sits, and a class, an id, a custom property, a font
 * family and a counter name are all case-sensitive — so a case respelling there
 * would report the printer for keeping a distinction the source made.
 * @type {Respelling[]}
 */
const CSS_RESPELLINGS = [
	{
		name: "escape",
		write: (site) =>
			site.type === TokenType.Ident ? asEscaped(site.text) : null
	},
	{
		name: "quote-double",
		write: (site) =>
			site.type === TokenType.String ? asQuoted(site.text, '"') : null
	},
	{
		name: "quote-single",
		write: (site) =>
			site.type === TokenType.String ? asQuoted(site.text, "'") : null
	},
	{
		name: "leading-zero",
		write: (site) => {
			if (site.type !== TokenType.Number && site.type !== TokenType.Dimension) {
				return null;
			}
			const written = site.text.replace(/^([+-]?)\./, "$10.");
			return written === site.text ? null : written;
		}
	},
	{
		name: "unit-case",
		write: (site) => {
			if (site.unitStart === -1) return null;
			const unit = site.text.slice(site.unitStart - site.start);
			const upper = unit.toUpperCase();
			return upper === unit
				? null
				: `${site.text.slice(0, site.unitStart - site.start)}${upper}`;
		}
	},
	{
		name: "at-keyword-case",
		write: (site) => {
			if (site.type !== TokenType.AtKeyword) return null;
			const upper = site.text.toUpperCase();
			return upper === site.text ? null : upper;
		}
	}
];

// A divergence the printer has not answered for yet, with what it is. Read by
// the report and the gate: an entry matching nothing is itself a finding, so
// the fix retires its entry rather than leaving it to rot.
/** @type {import("../../../tooling/compare-tools-harness").Expected[]} */
const EXPECTED = [
	{
		relation: "respelling escape",
		contains: "-> \\7a ",
		source: ["test/configCases/css/minimize","Tachyons 4"],
		why: "`*zoom: 1` is no declaration but the star hack an engine drops, which the printer writes back as authored, escape included"
	},
	{
		relation: "respelling escape",
		contains: "-> \\76 ",
		source: "parsing/cases/declaration.css",
		why: "`prop: {value}{value}` is no declaration: it reparses as a rule whose selector `prop:` is invalid, which the printer writes back as authored"
	},
	{
		relation: "agreement",
		contains: "css-tree unparsed module.exports = ",
		source: "entry/depend-on-non-js/",
		why: "JavaScript saved as `.css` opens no `{}` block, so the spec drops it as a rule without one; css-tree keeps it as raw text"
	},
	{
		relation: "agreement",
		contains: "css-tree unparsed \\, tool nothing",
		source: "parsing/cases/revers-solidus.css",
		why: "a lone `\\` opens no `{}` block, so the spec drops it as a rule without one; css-tree keeps it as raw text"
	},
	{
		relation: "agreement",
		contains: "css-tree rule color: red; .class, tool nothing",
		source: "css/css-modules/style.module.css",
		why: "an unknown at-rule's block holds declarations and rules, as any block does; css-tree reads it as rules alone"
	},
	{
		relation: "agreement",
		contains: "/@unknown[3]/.class[1]: css-tree nothing, tool rule .class",
		source: "css/css-modules/style.module.css",
		why: "an unknown at-rule's block holds declarations and rules, as any block does; css-tree reads it as rules alone"
	},
	{
		relation: "agreement",
		contains: "css-tree test: (1, 2) [3, 4], { 1: 2}, tool rule test:",
		source: "css/css-modules/style.module.css",
		why: "a value holding a `{}` block beside anything else is no declaration but a rule (§5.4.5); css-tree keeps the declaration"
	},
	{
		relation: "agreement",
		contains:
			"css-tree rule result: var(--wide); @media (width < 700px), tool result: var(--wide)",
		source: "css/css-modules/style.module.css",
		why: "a `@function` body holds declarations and conditional rules, as a style rule's block does; css-tree reads it as rules alone"
	},
	{
		relation: "agreement",
		contains: "css-tree unparsed color: red;, tool color: red",
		source: "parsing/cases/at-rule.css",
		why: "an unknown at-rule's block holds declarations and rules, as any block does; css-tree reads it as rules alone"
	},
	{
		relation: "agreement",
		contains: "css-tree f: (1) [2], { g: h }, tool rule f: (1) [2],",
		source: "minify-nested-idempotent/style.css",
		why: "a value holding a `{}` block beside anything else is no declaration but a rule (§5.4.5); css-tree keeps the declaration"
	},
	{
		relation: "agreement",
		contains: "css-tree prop: {value}{value}, tool rule prop:",
		source: "parsing/cases/declaration.css",
		why: "a value holding a `{}` block beside anything else is no declaration but a rule (§5.4.5); css-tree keeps the declaration"
	},
	{
		relation: "agreement",
		contains: "css-tree rule *zoom: 1; .t11, tool rule .t11",
		source: "minimize-dead-rules/style.css",
		why: "`*zoom: 1;` in a block opens no identifier and ends at its `;`, so the spec drops it; css-tree reads it into the next rule's selector"
	},
	{
		relation: "agreement",
		contains: "css-tree unparsed url('./inline.png')",
		source: "no-extra-runtime-with-asset-modules/style.css",
		why: "a statement opening with `url(` rather than an identifier and ending at its `;` is dropped by the spec; css-tree keeps it as raw text"
	},
	{
		relation: "agreement",
		contains: "css-tree @0media \\;, tool @0media\uFFFD;",
		source: "css/escape-at-end-of-input.css",
		why: "a `\\` the input ends after is a valid escape (§4.3.8) of EOF, U+FFFD in the at-rule's name (§4.3.7); css-tree reads it as its prelude"
	},
];

/**
 * @param {string} css a stylesheet
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {string} the stylesheet, respelled
 */
const respell = (css, sites, respelling) => {
	let out = "";
	let read = 0;
	for (const site of sites) {
		const written = respelling.write(site);
		if (written === null) continue;
		out += css.slice(read, site.start) + written;
		read = site.end;
	}
	return out + css.slice(read);
};

/** @typedef {{ kind: "differs" | "bytes" | "throws", delta: number, note: string }} Finding */

/**
 * Whether respelling these sites moved the output, and how. An output of the
 * same length saying the same thing is not a finding: webpack keeps the
 * source's spelling where nothing beats it.
 * @param {(css: string) => string} minify the printer under test
 * @param {string} css a stylesheet
 * @param {string} minified what it minifies to
 * @param {Site[]} sites the sites to respell
 * @param {Respelling} respelling how to respell them
 * @returns {Finding | null} what moved, or null
 */
const spellingFinding = (minify, css, minified, sites, respelling) => {
	const mutated = respell(css, sites, respelling);
	if (mutated === css) return null;
	// Verified against the tokenizer rather than argued for: a respelling that
	// moved the stylesheet is dropped instead of reported.
	if (tokenMeaning(mutated) !== tokenMeaning(css)) return null;
	/** @type {string} */
	let answer;
	try {
		answer = minify(mutated);
	} catch (error) {
		return { kind: "throws", delta: 0, note: thrownText(error) };
	}
	if (answer === minified) return null;
	const says = tokenMeaning(answer) !== tokenMeaning(minified);
	if (!says && answer.length === minified.length) return null;
	return {
		kind: says ? "differs" : "bytes",
		delta: answer.length - minified.length,
		note: ""
	};
};

/**
 * What the report shows for a set of sites: how they were written, and how the
 * respelling writes them, each cut to a line around the first place they part.
 * @param {Site[]} sites the sites carrying the finding
 * @param {Respelling} respelling how they are respelled
 * @returns {string} the repro
 */
const reproOf = (sites, respelling) => {
	const from = sites.map((site) => site.text).join(" ");
	const to = sites.map((site) => respelling.write(site) || site.text).join(" ");
	// Shown from where they part rather than from the start, which for sites
	// past the line is the same prefix twice with the respelling itself cut off
	// — where the entry answering for it, read off this string, misses it too.
	let at = 0;
	while (at < from.length && at < to.length && from[at] === to[at]) at++;
	const start = at < 60 ? 0 : at - 16;
	const cut = (/** @type {string} */ text) =>
		start === 0 ? text : `…${text.slice(start)}`;
	return `    ${oneLine(cut(from), 76)}\n      -> ${oneLine(cut(to), 76)}`;
};

/**
 * Every respelling this stylesheet's output depends on.
 * @param {(css: string) => string} minify the printer under test
 * @param {string} css a stylesheet
 * @param {string} minified what it minifies to
 * @returns {import("./relations").Report[]} what moved, and the smallest repro found for each
 */
const sweepRespellings = (minify, css, minified) => {
	/** @type {import("./relations").Report[]} */
	const reports = [];
	const sites = cssSites(css);
	for (const respelling of CSS_RESPELLINGS.filter((one) =>
		wantedRespelling(one.name)
	)) {
		/**
		 * @param {Site[]} subset the sites to respell
		 * @returns {Finding | null} what moved
		 */
		const holds = (subset) =>
			spellingFinding(minify, css, minified, subset, respelling);
		const found = holds(sites);
		if (found === null) continue;
		const relation = `respelling ${respelling.name}`;
		// Bisecting costs a minify of the whole stylesheet per step, and it is
		// there to name a repro for something that needs looking at. A divergence
		// already answered for needs none, so the sites it was found over stand.
		const answered = EXPECTED.some(
			(entry) =>
				entry.relation === relation &&
				reproOf(sites, respelling).includes(entry.contains)
		);
		const carried =
			found.kind === "throws" || answered
				? sites
				: shrink(holds, sites, found.kind);
		const blamed = (carried === sites ? found : holds(carried)) || found;
		reports.push({
			relation,
			what:
				blamed.kind === "throws"
					? `threw: ${blamed.note}`
					: `${blamed.kind}, ${signed(blamed.delta)}`,
			repro: reproOf(carried, respelling)
		});
	}
	return reports;
};

/** @type {import("./index").SyntaxInvariants} */
const invariants = {
	printers: () =>
		PRESETS.map(([name, options]) => ({
			name,
			minify: printerFor(options),
			says: tokenStream
		})),
	spans: cssSpans,
	slices: (css) => cssSlices(css).reports,
	digest: (css) => cssPurityDigest(css, printerFor(PRESETS[0][1])),
	respellings: (printer, css, printed) =>
		sweepRespellings(printer.minify, css, printed),
	cuts: cssCuts
};

module.exports = {
	...invariants,
	CSS_RESPELLINGS,
	DEFAULT_OPTIONS,
	EXPECTED,
	MODERN_BROWSERS,
	PRESETS,
	TARGET_OPTIONS,
	TARGET_VARS_OPTIONS,
	cssCuts,
	cssPurityDigest,
	cssSlices,
	cssSpans,
	printerFor,
	sweepRespellings,
	tokenStream
};
