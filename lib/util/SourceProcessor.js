/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

// Stands in the output for text only an asynchronous caller can supply, until
// {@link PrintContext.substitute} puts the answer in its place. A NUL delimits
// it because both the CSS and the HTML preprocessor turn one in the input into
// U+FFFD, so printed output never holds one of its own account.
const DEFERRED_MARKER = "\u0000";

// The infix this print marks its writes with, chosen so that `NUL infix` occurs
// nowhere in the input — a NUL the source carried then spells no write of ours.
let deferredInfix = "0:";

/**
 * The text to print in place of a deferred write.
 * @param {number} id the write's index among this print's deferred writes
 * @returns {string} the marker to emit
 */
const deferredWrite = (id) =>
	`${DEFERRED_MARKER}${deferredInfix}${id}${DEFERRED_MARKER}`;

/**
 * An infix no NUL run in `input` already carries, so only this print can have
 * written one. An RCDATA element (`<textarea>`, `<title>`) and an attribute
 * value both keep the NUL they were written with, so the source can hold one.
 * @param {string} input the source about to be printed
 * @returns {string} the infix to mark this print's writes with
 */
const chooseDeferredInfix = (input) => {
	let n = 0;

	while (input.includes(`${DEFERRED_MARKER}${n}:`)) n++;

	return `${n}:`;
};

const DEFERRED_ID_RE = /^\d+$/;
// A character a stylesheet's bytes cannot spell without naming an encoding.
const NON_ASCII_RE = /[^\0-\u007F]/;

/**
 * Read the deferred write standing at `start`, if one does.
 * @param {string} text the text to read
 * @param {number} start offset of the marker's opening NUL
 * @param {(id: number) => string | undefined} resolve the write's final text, or undefined where it answers for no such write
 * @param {string} infix what this print marked its writes with
 * @returns {{ end: number, replacement: string } | null} where the write ends and what stands in for it, or null where none does
 */
const readDeferredWrite = (text, start, resolve, infix) => {
	const end = text.indexOf(DEFERRED_MARKER, start + 1);

	if (end === -1) return null;

	const body = text.slice(start + 1, end);

	if (!body.startsWith(infix)) return null;

	const id = body.slice(infix.length);

	if (!DEFERRED_ID_RE.test(id)) return null;

	const replacement = resolve(Number(id));

	return replacement === undefined ? null : { end, replacement };
};

/**
 * Stand the answers in for every write in one answer: a body offered whole
 * holds the markers of the bodies inside it.
 * @param {string} text one answer
 * @param {(id: number) => string | undefined} resolve the write's final text
 * @param {string} infix what this print marked its writes with
 * @returns {string} the answer with every write inside it resolved
 */
const expandDeferredWrites = (text, resolve, infix) => {
	let at = text.indexOf(DEFERRED_MARKER);

	if (at === -1) return text;

	let out = "";
	let from = 0;

	while (at !== -1) {
		const write = readDeferredWrite(text, at, resolve, infix);

		if (write === null) {
			at = text.indexOf(DEFERRED_MARKER, at + 1);
			continue;
		}

		out +=
			text.slice(from, at) +
			expandDeferredWrites(write.replacement, resolve, infix);
		from = write.end + 1;
		at = text.indexOf(DEFERRED_MARKER, from);
	}

	return out + text.slice(from);
};

/**
 * The text this print spells with every deferred write declined: each marker
 * replaced by what would stand there had no renderer answered. What a print
 * verifying itself by re-parsing has to read, since a marker otherwise parses
 * as text where its node stood. `build` rather than `source` so a write inside
 * an attribute comes back escaped for where it sits.
 * @param {string} text the printed output, holding this print's markers
 * @param {DeferredWrite[]} writes what the print deferred, indexed by id
 * @returns {string} the text with every marker put back
 */
const declineDeferredWrites = (text, writes) =>
	expandDeferredWrites(
		text,
		(id) => (id < writes.length ? writes[id].build(undefined) : undefined),
		deferredInfix
	);

/**
 * Visitor map keyed by a numeric node-type discriminator; a bucket
 * is a function (enter-only) or `{ enter?, exit? }`.
 *
 * A visitor receives a single `path` argument: the
 * language's AST accessor with the current position on it — `path.node`,
 * `path.parent` (null at a root) — plus `path.skipChildren()` (enter only)
 * to stop the walk descending, and every field-read method (which defaults
 * to the current node). The path is one reused object rebound before each callback:
 * it is only valid during the callback, and future per-node functionality
 * lands on it without changing any visitor signature.
 * @template TPath
 * @typedef {(path: TPath) => void} VisitorFn
 */
/**
 * The members every language's `path` has under the same name and meaning, so
 * a visitor written against it reads any grammar; see `docs/syntax.md`.
 * @template TNode
 * @template [TValue=unknown]
 * @typedef {NodePathReads<TNode, TValue> & NodePathFields<TNode>} NodePath
 */
/**
 * @template TNode
 * @template [TValue=unknown]
 * @typedef {object} NodePathReads
 * @property {TNode} node the current node
 * @property {TNode | null} parent the enclosing node (null at a root)
 * @property {number} index the current node's index among its siblings
 * @property {() => void} skipChildren stop the walk descending into the current node (enter only)
 * @property {() => void} stop end the walk: no visitor fires after the current one returns, and a print still completes
 * @property {unknown} state the run's state, as `process` was given it
 * @property {(n?: TNode) => number} type the node's `NodeType`
 * @property {(n?: TNode) => [number, number]} range start and end offsets in the input
 * @property {(n?: TNode) => number} start where the node starts in the input
 * @property {(n?: TNode) => number} end where the node ends in the input
 * @property {(n?: TNode) => [number, number, number, number]} loc start line and column, end line and column (lines from 1, columns from 0)
 * @property {(n?: TNode | number, end?: number) => string} source the node's source text, or the input between two offsets
 * @property {(n?: TNode) => string} name the node's name as the language defines it, decoded ("" when it has none)
 * @property {(n?: TNode) => TValue} value the node's value as the language defines it, decoded
 * @property {(n?: TNode) => number} childCount number of children
 * @property {(i: number, n?: TNode) => TNode} child the i-th child
 * @property {(n?: TNode) => TNode[]} children every child as a new array
 */
/**
 * Structure read through a language's `Field`, `Flag` and `Part`. Declared as
 * methods so a language's path may accept only the parts each node type has.
 * @template TNode
 * @typedef {{
 * field(i: number, field: number, n?: TNode): TNode,
 * fieldCount(field: number, n?: TNode): number,
 * fieldNamed(field: number, name: string, n?: TNode): TNode,
 * flag(flag: number, n?: TNode): boolean,
 * rangeOf(part: number, n?: TNode): [number, number] | null,
 * startOf(part: number, n?: TNode): number,
 * endOf(part: number, n?: TNode): number,
 * textOf(part: number, n?: TNode): string | null,
 * within(type: number): boolean,
 * }} NodePathFields
 */
/**
 * The members every language's path edits its tree with, under the same name
 * and meaning; see `docs/syntax.md`. Each acts on the node passed last, the
 * current one by default, and the walk visits what an edit adds.
 * @template TNode
 * @template [TValue=unknown]
 * @typedef {object} NodePathEdits
 * @property {(name: string, n?: TNode) => void} setName set the node's name, which later reads return
 * @property {(value: TValue, n?: TNode) => void} setValue set the node's value, which later reads return
 * @property {(flag: number, on: boolean, n?: TNode) => void} setFlag set or clear a `Flag`
 * @property {(part: number, text: string, n?: TNode) => void} setText set a `Part`'s text, `""` leaving an optional part out
 * @property {(replacement: string | TNode | (string | TNode)[], n?: TNode) => TNode[]} replaceWith put nodes, or text parsed as what the field holding the node takes, in its place
 * @property {(where: "before" | "after" | number, nodes: string | TNode | (string | TNode)[], n?: TNode) => TNode[]} insert insert nodes before or after the node, or at the end of one of its `Field`s
 * @property {(n?: TNode) => void} remove take the node out of the tree
 */
/**
 * A node that also says which `NodeType` it is, so reading a part that type
 * lacks fails to type-check; a plain `TNode` can be any node.
 * @template TNode
 * @template T
 * @typedef {TNode & { readonly __nodeType: T }} TypedNode
 */
/**
 * What part `M` gives the node type `R` says it is; every part `D` when `R`
 * says none (a plain node reads `number` there).
 * @template R
 * @template {Record<number, number>} M
 * @template D
 * @typedef {number extends (R & { readonly __nodeType: number })["__nodeType"] ? D : M[(R & { readonly __nodeType: number })["__nodeType"]]} PartOf
 */
/**
 * A language's parts, by node type: what its `Field`s and `Flag`s apply to.
 * @typedef {object} NodeParts
 * @property {number} types every `NodeType` member
 * @property {number} field every `Field`
 * @property {number} flag every `Flag`
 * @property {number} part every `Part` with a position
 * @property {number} text every `Part` with text beyond the name and value
 * @property {Record<number, number>} fields the `Field`s of each node type
 * @property {Record<number, number>} flags the `Flag`s of each node type
 * @property {Record<number, number>} parts the `Part`s with a position, by node type
 * @property {Record<number, number>} texts the `Part`s with text, by node type
 * @property {Record<number, number>} items the node type of each `Field`'s items
 */
/**
 * The path a visitor of node type `T` receives: its structure reads take only
 * the parts that type has, and its `state` is the run's.
 * @template TPath
 * @template TNode
 * @template {NodeParts} P
 * @template T
 * @template [S=unknown]
 * @typedef {Omit<TPath, "node" | "state" | "within" | "field" | "fieldCount" | "fieldNamed" | "flag" | "rangeOf" | "startOf" | "endOf" | "textOf"> & {
 *   readonly node: TypedNode<TNode, T>,
 *   readonly state: S,
 *   within(type: P["types"]): boolean,
 *   field<R extends TNode = TypedNode<TNode, T>, F extends number = number>(i: number, field: F & PartOf<R, P["fields"], P["field"]>, n?: R): TypedNode<TNode, P["items"][F]>,
 *   fieldCount<R extends TNode = TypedNode<TNode, T>>(field: PartOf<R, P["fields"], P["field"]>, n?: R): number,
 *   fieldNamed<R extends TNode = TypedNode<TNode, T>, F extends number = number>(field: F & PartOf<R, P["fields"], P["field"]>, name: string, n?: R): TypedNode<TNode, P["items"][F]>,
 *   flag<R extends TNode = TypedNode<TNode, T>>(flag: PartOf<R, P["flags"], P["flag"]>, n?: R): boolean,
 *   rangeOf<R extends TNode = TypedNode<TNode, T>>(part: PartOf<R, P["parts"], P["part"]>, n?: R): [number, number] | null,
 *   startOf<R extends TNode = TypedNode<TNode, T>>(part: PartOf<R, P["parts"], P["part"]>, n?: R): number,
 *   endOf<R extends TNode = TypedNode<TNode, T>>(part: PartOf<R, P["parts"], P["part"]>, n?: R): number,
 *   textOf<R extends TNode = TypedNode<TNode, T>>(part: PartOf<R, P["texts"], P["text"]>, n?: R): string | null
 * }} TypedNodePath
 */
/**
 * The parts of a language that names none: every node type has every part.
 * @typedef {{
 * types: number,
 * field: number,
 * flag: number,
 * part: number,
 * text: number,
 * fields: Record<number, number>,
 * flags: Record<number, number>,
 * parts: Record<number, number>,
 * texts: Record<number, number>,
 * items: Record<number, number>,
 * }} AnyParts
 */
/**
 * @template S
 * @typedef {{ state?: S }} RunState what a run hands its visitors as `path.state`
 */

/**
 * @template TPath
 * @typedef {VisitorFn<TPath> | { enter?: VisitorFn<TPath>, exit?: VisitorFn<TPath> }} VisitorBucket
 */
/**
 * @template TPath
 * @typedef {{ [nodeType: number]: VisitorBucket<TPath> }} VisitorMap
 */
/**
 * @template TPath
 * @typedef {{ enter: VisitorFn<TPath>[], exit: VisitorFn<TPath>[] }} CompiledVisitorBucket
 */
/**
 * @template TPath
 * @typedef {CompiledVisitorBucket<TPath>[]} CompiledVisitorMap a sparse array indexed by node type
 */
/**
 * What every language's print options carry, read by the node printer via
 * `writer.options`. Only `mode` is here: what else a printer may be told is the
 * language's own business, and a language names it by instantiating
 * {@link PrintContext} with its own type — nothing CSS reads belongs in a
 * typedef HTML also depends on.
 * @typedef {{ mode: "minify" | "beautify" }} PrintOptions
 */
/**
 * What names one offer whatever print made it: every field but the functions,
 * so the second print of `processAsync` finds the first one's answer by it.
 * @param {Omit<DeferredWrite, "build">} offer an offer, `build` and all or without it
 * @returns {string} its key
 */
const deferredKey = (offer) => {
	let key = "";
	for (const name of Object.keys(offer).sort()) {
		const value =
			/** @type {Record<string, DeferredWrite[keyof DeferredWrite]>} */ (offer)[
				name
			];
		if (typeof value !== "function") key += `${name}\0${value}\0`;
	}
	return key;
};

/**
 * One write the print left a marker for, collected into the `deferEmbeddedSource`
 * print option by whichever grammar offered it — the other half of
 * {@link deferredWrite}. `source` is the text offered, `build` spells what is
 * printed around the answer (an untapped run's spelling where there is none), and
 * `decides` says whether the answer overturns a choice the print made without it.
 * A grammar carries whatever else describes the offer (`type`, `hostType`, `as`,
 * …) on the same object.
 * @typedef {{ source: string, build: (answer: string | undefined) => string, decides?: (answer: string | undefined) => boolean }} DeferredWrite
 */
/** @import { DeferredEmbeddedSource } from "./dataURL" */
/**
 * A version-3 source map. Written structurally (with the `3` literal) so it
 * satisfies both `webpack-sources` and the minimizer plugin's map types without
 * depending on either.
 * @typedef {{ version: 3, file: string, sources: string[], sourcesContent?: string[], names: string[], mappings: string }} SourceMap
 */
/**
 * The `process` source-map option: turns map collection on and names the input
 * (`sources[0]` / optional `sourcesContent[0]`). Present => `process` returns
 * `{ code, map }` instead of a bare string.
 * @typedef {{ source: string, content?: string }} SourceMapOptions
 */

/**
 * @param {SourceMapOptions} options the input's name / content
 * @param {string} mappings the VLQ `mappings` field
 * @returns {SourceMap} a version-3 source map
 */
const _makeMap = (options, mappings) => ({
	version: 3,
	file: options.source,
	sources: [options.source],
	sourcesContent: options.content === undefined ? undefined : [options.content],
	names: [],
	mappings
});

// How much output accumulates before it is cut off and forced flat (see
// `PrintContext._emit`). Large enough that the flattening copy is amortized away,
// small enough that the un-flattened fragments behind it stay bounded.
const FLATTEN_BLOCK = 64 * 1024;

// Most prints do not ask for a source map. Sharing their permanently empty
// mapping column avoids allocating an array for every inline CSS/HTML body.
/** @type {number[]} */
const EMPTY_MAPPINGS = [];

// Base64 VLQ, the source-map `mappings` encoding. Hand-rolled so producing a map
// pulls in no dependency (`source-map` is not a webpack dep).
const _B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * @param {number} n a signed integer
 * @returns {string} its Base64 VLQ encoding
 */
const _vlq = (n) => {
	// Most deltas are small, and each is spelled the same every time.
	if (n > -_VLQ_CACHED && n < _VLQ_CACHED) {
		if (_vlqCache === null) _vlqCache = Array.from({ length: _VLQ_CACHED * 2 });
		const cached = _vlqCache[n + _VLQ_CACHED];
		if (cached !== undefined) return cached;
		return (_vlqCache[n + _VLQ_CACHED] = _encodeVlq(n));
	}
	return _encodeVlq(n);
};

// `_vlq` of every delta within this of zero, filled in as they are written,
// and made only once a map is.
const _VLQ_CACHED = 1024;
/** @type {(string | undefined)[] | null} */
let _vlqCache = null;

/**
 * One value as a Base64 VLQ, spelled out.
 * @param {number} n the value
 * @returns {string} its VLQ
 */
const _encodeVlq = (n) => {
	let v = n < 0 ? (-n << 1) | 1 : n << 1;
	let out = "";
	do {
		let digit = v & 31;
		v >>>= 5;
		if (v > 0) digit |= 32;
		out += _B64[digit];
	} while (v > 0);
	return out;
};
/**
 * A language node printer, fired for one node once all its visitors have run and
 * its children are printed. It takes the same `path` a visitor gets plus the
 * print context as its `writer`; it switches on `path.type()` and **returns** the
 * node's serialized text, reading its children's text from `writer.get` — knowing
 * nothing of the walk. Returning (rather than writing to a buffer) is what lets a
 * parent compose / transform its text from its finished children.
 * @template TPath
 * @template TNode
 * @template [TPrintOptions=object]
 * @typedef {(path: TPath, writer: PrintContext<TPath, TNode, TPrintOptions>) => string} NodePrinter
 */
/**
 * A language grammar: parse `input` once and fire the compiled visitors in
 * source order. When `writer` is given it is also printing — after each node's
 * visitors have run and its children are printed, the grammar fires the node
 * printer into `writer`; a single parse with no re-tokenizing.
 * @template TPath
 * @template TNode
 * @template TProcessOptions
 * @template [TPrintOptions=object]
 * @typedef {(input: string, visitors: CompiledVisitorMap<TPath>, writer: PrintContext<TPath, TNode, TPrintOptions> | undefined, options: TProcessOptions) => void} Grammar
 */

/**
 * The per-node output store handed to a language node printer as its `writer`. It
 * carries the print `options` (today just `mode`) and one map: a finished node ->
 * its printed text. A printer *returns* its text (`printNode` stores it) and reads
 * a child's with `get`, so a parent composes its own text from its children's —
 * the map is what makes that composition (and the CSS value transforms built on
 * it) possible. `take` flushes a finished top-level node into the output and drops
 * the map, so a streaming grammar never holds more than one top-level subtree.
 * @template TPath
 * @template TNode
 * @template [TPrintOptions=object]
 */
class PrintContext {
	/**
	 * @param {PrintOptions & TPrintOptions} options the print options
	 * @param {NodePrinter<TPath, TNode, TPrintOptions>} printer the node printer
	 */
	constructor(options, printer) {
		/** @type {PrintOptions & TPrintOptions} */
		this.options = options;
		/** @type {NodePrinter<TPath, TNode, TPrintOptions>} */
		this._printer = printer;
		// Printed text by node handle, in two columns rather than one `Map`: the
		// handles are dense integers, and `_moveEpoch` keeps the live set small.
		/** @type {(string | null)[]} each finished node's printed text */
		this._storeText = [];
		/** @type {Int32Array} the epoch each slot was written in */
		this._storeGen = new Int32Array(0);
		// A slot holding `null` prints as its source, read only once asked for.
		/** @type {((node: TNode) => string) | undefined} reads a `null` slot's text */
		this._sourceText = undefined;
		/** @type {number} current epoch; a slot from an older one reads as absent */
		this._gen = 1;
		/** @type {number} lowest slot written since the epoch last moved */
		this._storeLow = 0x7fffffff;
		/** @type {number} highest slot written since the epoch last moved */
		this._storeHigh = -1;
		/** @type {Map<number, string> | null} the text a node prints as in place of its printer's, until it prints */
		this._replacements = null;
		// Output is `_chunks` joined, then `_tail`. Printing that never takes
		// anything back only appends to `_tail`; a piece is cut off into `_chunks`
		// for retractable text alone, so no other emit pays for that ability.
		/** @type {string[]} pieces already cut off, in output order */
		this._chunks = [];
		/** @type {Map<number, { readonly text: string }> | null} pieces whose text is read only once the output is */
		this._deferred = null;
		/** @type {string} output after the last cut piece */
		this._tail = "";
		/** @type {number} characters in `_tail`, so its length is not read off a rope */
		this._tailLength = 0;
		/** @type {number} scratch for the flattening read in {@link _cutTail} */
		this._flattened = 0;
		// A map is built only for a caller that named the input, and that is known
		// before printing — so a print nobody asks a map of collects none.
		/** @type {boolean} whether {@link sourceMap} can still be asked for one */
		this.mapWanted =
			/** @type {{ source?: string }} */ (options).source !== undefined;
		// Flat rather than one array per mapping: a stylesheet anchors every rule,
		// and those arrays live as long as the print does.
		/** @type {number[]} `chunkIndex, offsetInChunk, srcLine, srcCol` per mapping, output-ordered; a `srcLine` of -1 is one {@link retract} took back with its piece */
		this._mappings = this.mapWanted ? [] : EMPTY_MAPPINGS;
		/** @type {number[] | null} by retractable piece index, the index in `_mappings` of the mapping anchored to it, so taking the piece back takes its mapping too */
		this._retractableMappings = null;
		/** @type {[number, string][]} source-anchored literals to keep (comments), source-ordered */
		this._inserts = [];
		/** @type {number} next `_inserts` entry not yet flushed */
		this._insertIdx = 0;
		// Openers of the nodes printed in pieces, innermost last, held back until
		// one has content — which is what lets a node whose children all print to
		// nothing still be dropped whole.
		/** @type {string[]} openers not yet emitted, outermost first */
		this._pending = [];
		/** @type {[number | undefined, number | undefined, number | undefined] | null} anchor for the first pending opener */
		this._pendingAnchor = null;
	}

	/**
	 * Hold `text` back as the opener of a node being printed in pieces. Nothing
	 * reaches the output until {@link flushPending}, so {@link dropPending} can
	 * still take it back if the node turns out to be empty.
	 * @param {string} text the node's opener
	 * @returns {number} the opener's depth, for {@link isPending}
	 */
	pushPending(text) {
		return this._pending.push(text) - 1;
	}

	/**
	 * Rewrite a held-back opener — an opener whose text depends on what turns out
	 * to follow it can only be settled once something does.
	 * @param {number} depth the opener's depth, from {@link pushPending}
	 * @param {string} text its opener
	 */
	setPending(depth, text) {
		this._pending[depth] = text;
	}

	/**
	 * Emit every held-back opener, outermost first — something inside the
	 * innermost one has content, so all of them do.
	 * @returns {void}
	 */
	flushPending() {
		const pending = this._pending;
		if (pending.length === 0) return;
		const anchor = this._pendingAnchor;
		if (anchor !== null) {
			this._pendingAnchor = null;
			this.anchor(anchor[0], anchor[1], anchor[2]);
		}
		for (let i = 0; i < pending.length; i++) this._emit(pending[i]);
		pending.length = 0;
	}

	/**
	 * Anchor the outermost held-back opener, applied when it is flushed. Openers
	 * are flushed together, so only the outermost carries one.
	 * @param {number=} srcOffset the node's source offset (kept-comment flush boundary)
	 * @param {number=} srcLine 0-based source line of the node's start
	 * @param {number=} srcCol 0-based source column of the node's start
	 */
	anchorPending(srcOffset, srcLine, srcCol) {
		this._pendingAnchor = [srcOffset, srcLine, srcCol];
	}

	/**
	 * @param {number} depth an opener's depth, from {@link pushPending}
	 * @returns {boolean} whether it is still held back (nothing inside it printed)
	 */
	isPending(depth) {
		return this._pending.length > depth;
	}

	/**
	 * Drop the innermost held-back opener — its node printed to nothing.
	 * @returns {void}
	 */
	dropPending() {
		this._pending.pop();
		const anchor = this._pendingAnchor;
		if (this._pending.length !== 0 || anchor === null) return;
		// The node printed to nothing, but it was still a node here: {@link take}
		// anchors before it can know the text is empty, and the map has to read the
		// same either way. The kept comments before it are due for the same reason.
		this._pendingAnchor = null;
		this.anchor(anchor[0], anchor[1], anchor[2]);
	}

	/**
	 * Close off what has been emitted so far and return the index the next piece
	 * will take. Cutting is the point: a caller bounding a later edit by this
	 * (see {@link dropTrailing}) must not be able to reach output from before it,
	 * which a mark taken while the tail was still open would sit in the middle of.
	 * @returns {number} the index the next emitted piece will get
	 */
	markCut() {
		this._cutTail();
		return this._chunks.length;
	}

	/**
	 * Append a piece of a node that is being printed in pieces. Nothing takes it
	 * back, so it only extends the output.
	 * @param {string} text output text
	 */
	emitStreamed(text) {
		this._emit(text);
	}

	/**
	 * Make room for the handles below `count` before anything is printed, for a
	 * grammar that knows how many nodes it prints, so the columns grow once.
	 * @param {number} count how many handles
	 */
	reserve(count) {
		// Filled at once: pushed slot by slot, the column is reallocated as it grows.
		// eslint-disable-next-line unicorn/no-new-array
		this._storeText = new Array(count).fill("");
		this._storeGen = new Int32Array(count);
	}

	/**
	 * Widen both columns to hold `need` handles, keeping what they already hold.
	 * @param {number} need required capacity
	 */
	_growStore(need) {
		// From empty: a context that prints one inline `style=""` must not pay for
		// a stylesheet's worth of columns.
		const text = this._storeText;
		const size = Math.max(need, text.length * 2, 16);
		// Appended in place: `push` keeps the column packed for the read every
		// composed child makes, and what it already holds never moves — where
		// filling a second array would copy every slot again at each growth.
		for (let i = text.length; i < size; i++) text.push("");
		const gen = new Int32Array(size);
		gen.set(this._storeGen);
		this._storeGen = gen;
	}

	/**
	 * Forget every node's printed text. A node printed in pieces does this once
	 * each child is emitted, so the store never holds more than one of them —
	 * which is also what keeps a recycled node id from reading as an earlier
	 * node's text.
	 */
	dropStore() {
		this._moveEpoch();
	}

	/**
	 * Move the epoch on and release the text every slot written under the old one
	 * holds. Only the range actually written is walked, so the drop stays O(1)
	 * per node.
	 * @returns {void}
	 */
	_moveEpoch() {
		const high = this._storeHigh;
		if (high !== -1) {
			// `""` rather than a hole: the column is packed, and a hole in it would
			// cost every read after this one.
			const text = this._storeText;
			for (let i = this._storeLow; i <= high; i++) text[i] = "";
			this._storeLow = 0x7fffffff;
			this._storeHigh = -1;
		}
		this._gen++;
	}

	/**
	 * Drop trailing `charCode`s from the end of the output at or after `from` —
	 * the separator the piece before a terminator no longer needs. Walks back over
	 * pieces emptied by {@link retract}, so it sees what the output reads as.
	 * @param {number} from earliest piece index this may touch
	 * @param {number} charCode the character to drop
	 */
	dropTrailing(from, charCode) {
		this._settleDeferred();
		const chunks = this._chunks;
		for (let i = chunks.length; i >= from; i--) {
			let text = i === chunks.length ? this._tail : chunks[i];
			if (text.length === 0) continue;
			while (
				text.length !== 0 &&
				text.charCodeAt(text.length - 1) === charCode
			) {
				text = text.slice(0, -1);
			}
			if (i === chunks.length) {
				this._tail = text;
				this._tailLength = text.length;
			} else {
				chunks[i] = text;
			}
			if (text.length !== 0) return;
		}
	}

	/**
	 * Stand `text` in place of the output's end, where that is `printed` followed
	 * only by `closer`s — what the printer wrote after a value the input ran out in.
	 * @param {string} printed the text the output must end with, before the closers
	 * @param {string} text what to write in place of it and them
	 * @param {number} closer the character that may follow `printed`
	 * @returns {boolean} true when the output ended that way and was rewritten
	 */
	replaceEnd(printed, text, closer) {
		this._settleDeferred();
		this._cutTail();
		const chunks = this._chunks;
		// Joined once: this runs only where a value ran into the end of the input.
		const output = chunks.join("");
		let end = output.length;
		while (end > 0 && output.charCodeAt(end - 1) === closer) end--;
		// The closers the printed text wrote itself are its own, not the blocks'.
		let own = printed.length;
		while (own > 0 && printed.charCodeAt(own - 1) === closer) own--;
		end += printed.length - own;
		if (end > output.length || !output.slice(0, end).endsWith(printed)) {
			return false;
		}
		let remove = output.length - end + printed.length;
		for (let i = chunks.length - 1; remove > 0; i--) {
			const kept = Math.max(0, chunks[i].length - remove);
			remove -= chunks[i].length - kept;
			chunks[i] = chunks[i].slice(0, kept);
			// A mapping into what went would point past its piece.
			const mappings = this._mappings;
			let to = 0;
			for (let at = 0; at < mappings.length; at += 4) {
				if (mappings[at] === i && mappings[at + 1] > kept) continue;
				for (let k = 0; k < 4; k++) mappings[to + k] = mappings[at + k];
				to += 4;
			}
			mappings.length = to;
		}
		this._emit(text);
		return true;
	}

	/**
	 * Run the node printer for `node` and store what it returns (the grammar calls
	 * this once the node's visitors and children are done). `path` is on `node`.
	 * @param {TNode} node the finished node
	 * @param {TPath} path the language accessor, positioned on `node`
	 * @returns {boolean} whether it stored the text {@link replace} gave instead
	 */
	printNode(node, path) {
		const text = this._printer(path, this);
		const replacements = this._replacements;
		if (replacements !== null) {
			const n = /** @type {number} */ (node);
			const replacement = replacements.get(n);
			if (replacement !== undefined) {
				replacements.delete(n);
				this.printedAs(node, replacement);
				return true;
			}
		}
		this.printedAs(node, text);
		return false;
	}

	/**
	 * Have `node` print as `text` in place of what its printer returns, from its
	 * next {@link printNode}. The printer still runs, for what it records.
	 * @param {TNode} node a node not yet printed
	 * @param {string} text what it prints as
	 * @returns {void}
	 */
	replace(node, text) {
		if (this._replacements === null) this._replacements = new Map();
		this._replacements.set(/** @type {number} */ (node), text);
	}

	/**
	 * Drop what {@link replace} gave `node`, for a node the grammar writes out
	 * without {@link printNode}.
	 * @param {TNode} node the node
	 * @returns {void}
	 */
	discardReplacement(node) {
		if (this._replacements !== null) {
			this._replacements.delete(/** @type {number} */ (node));
		}
	}

	/**
	 * Store `text` as what `node` printed, where the grammar already knows what
	 * the node printer would return and so does not call it.
	 * @param {TNode} node the finished node
	 * @param {string} text its printed text
	 */
	printedAs(node, text) {
		const n = /** @type {number} */ (node);
		if (n >= this._storeText.length) this._growStore(n + 1);
		this._storeText[n] = text;
		this._storeGen[n] = this._gen;
		if (n < this._storeLow) this._storeLow = n;
		if (n > this._storeHigh) this._storeHigh = n;
	}

	/**
	 * Store that `node` printed as its source, which `sourceText` reads only once
	 * something asks for its text.
	 * @param {TNode} node the finished node
	 * @param {(node: TNode) => string} sourceText reads a node's source
	 */
	printedSource(node, sourceText) {
		const n = /** @type {number} */ (node);
		if (n >= this._storeText.length) this._growStore(n + 1);
		this._sourceText = sourceText;
		this._storeText[n] = null;
		this._storeGen[n] = this._gen;
		if (n < this._storeLow) this._storeLow = n;
		if (n > this._storeHigh) this._storeHigh = n;
	}

	/**
	 * Print one node and hand its text straight back — for a node inside one being
	 * printed in pieces, whose text is emitted as it is printed, so the store
	 * would only ever be written and read once.
	 * @param {TPath} path path positioned on the node
	 * @returns {string} its printed text
	 */
	printPiece(path) {
		return this._printer(path, this);
	}

	/**
	 * @param {TNode} node a child node whose printer already ran
	 * @returns {string} its printed text
	 */
	get(node) {
		const n = /** @type {number} */ (node);
		if (this._storeGen[n] !== this._gen) {
			return /** @type {string} */ (/** @type {unknown} */ (undefined));
		}
		const text = this._storeText[n];
		if (text !== null) return text;
		const source = /** @type {(node: TNode) => string} */ (this._sourceText)(
			node
		);
		this._storeText[n] = source;
		return source;
	}

	/**
	 * Read a child's text for the one time anything reads it: the slot lets go
	 * of it, so a printer composing a large output from its children's text
	 * holds each piece only until it is composed. Read again, it is empty.
	 * @param {TNode} node a child node whose printer already ran
	 * @returns {string} its printed text
	 */
	consume(node) {
		const text = this.get(node);
		this._storeText[/** @type {number} */ (node)] = "";
		return text;
	}

	/**
	 * Append `text` to the output. Where in the output that lands is worked out
	 * only if a source map is asked for (see {@link sourceMap}), so printing
	 * without one never walks the text looking for newlines.
	 * @param {string} text output text
	 */
	_emit(text) {
		this._tail += text;
		this._tailLength += text.length;
		// WHY: A printer returns a rope of its children's pieces, and appending a
		// rope onto a rope keeps every fragment reachable until the output is
		// flattened — a second copy of a large stylesheet. Cutting the tail once it
		// passes a block forces that block flat and drops the fragments behind it.
		// Per block rather than per piece: the copy is one the result pays anyway,
		// while per piece it would be an allocation each, and the pieces are small.
		if (this._tailLength >= FLATTEN_BLOCK) this._cutTail();
	}

	/**
	 * Move the accumulated tail into the finished pieces, flattened.
	 */
	_cutTail() {
		// A run of retractable pieces cuts after each; an empty piece would only pad
		// the output, and an anchor into an empty tail already points past it.
		if (this._tailLength === 0) return;
		// Reading a character is what forces it flat; the value is not wanted, and
		// it is kept only so the read cannot be optimized away.
		this._flattened = this._tail.charCodeAt(0);
		this._chunks.push(this._tail);
		this._tail = "";
		this._tailLength = 0;
	}

	/**
	 * Append `text` as a piece of its own, so {@link retract} can still take it
	 * back once a later sibling turns out to override it. Cuts the accumulating
	 * tail off in front of it, so it is for the text that may actually be taken
	 * back and not for output at large.
	 * @param {string} text output text
	 * @returns {number} the piece's index, for {@link retract}
	 */
	emitRetractable(text) {
		this._cutTail();
		return this._chunks.push(text) - 1;
	}

	/**
	 * Take back an already-emitted piece — the printer has since found that a
	 * later one overrides it. Pieces after it keep their place. A piece emitted by
	 * {@link takeRetractable} takes the mapping anchored to it back as well; any
	 * other anchor into the piece would be left pointing at what follows it, so
	 * this must not be used on one (see {@link take}).
	 * @param {number} index the piece's index, from {@link emitRetractable}
	 */
	retract(index) {
		if (this._deferred !== null) this._deferred.delete(index);
		this._chunks[index] = "";
		if (this._retractableMappings === null) return;
		const mapping = this._retractableMappings[index];
		if (mapping !== undefined) this._mappings[mapping + 2] = -1;
	}

	/**
	 * Whether the output after a piece holds a character outside ASCII, the
	 * comments still waiting to be placed included.
	 * @param {number} index the piece's index, from {@link emitRetractable}
	 * @returns {boolean} true when it does
	 */
	writesNonAscii(index) {
		this._settleDeferred();
		const chunks = this._chunks;
		for (let i = index + 1; i < chunks.length; i++) {
			if (NON_ASCII_RE.test(chunks[i])) return true;
		}
		const inserts = this._inserts;
		for (let i = this._insertIdx; i < inserts.length; i++) {
			if (NON_ASCII_RE.test(inserts[i][1])) return true;
		}
		return NON_ASCII_RE.test(this._tail);
	}

	/**
	 * Fold `text` into an already-emitted piece, in front of the character it ends
	 * with — a later sibling whose body belongs inside that piece, as a repeated
	 * named `@layer` block's does. Mappings are piece-relative and this only grows
	 * the piece past everything already anchored in it, so they keep their
	 * positions; the folded text carries none of its own.
	 * @param {number} index the piece's index, from {@link emitRetractable}
	 * @param {string} text what to fold in, its own closer included
	 */
	foldIntoRetractable(index, text) {
		this._settleDeferred();
		const piece = this._chunks[index];
		this._chunks[index] = `${piece.slice(0, -1)}${text}`;
	}

	/**
	 * Write an already-emitted piece again, shorter — a rule inside it a later
	 * copy makes dead. Mappings anchored in the piece keep the offsets they were
	 * given, so one inside what was cut names what now follows it.
	 * @param {number} index the piece's index, from {@link emitRetractable}
	 * @param {string} text what the piece says now
	 */
	rewriteRetractable(index, text) {
		if (this._deferred !== null) this._deferred.delete(index);
		this._chunks[index] = text;
	}

	/**
	 * {@link rewriteRetractable} with text that is asked for only once the output
	 * is read: a piece rewritten many times over is then built once, not each time.
	 * @param {number} index the piece's index, from {@link emitRetractable}
	 * @param {{ readonly text: string }} source what holds the piece's text
	 */
	deferRetractable(index, source) {
		if (this._deferred === null) this._deferred = new Map();
		this._deferred.set(index, source);
	}

	/**
	 * Write every deferred piece's text in, before anything reads the pieces.
	 */
	_settleDeferred() {
		const deferred = this._deferred;
		if (deferred === null) return;
		this._deferred = null;
		for (const [index, source] of deferred) this._chunks[index] = source.text;
	}

	/**
	 * {@link take} for a top-level node a later sibling may still make dead — the
	 * unprefixed twin of a vendor-prefixed rule, which can stand anywhere after
	 * it. The node is emitted as a piece of its own, with its mapping recorded
	 * against that piece, so {@link retract} takes both back.
	 * @param {TNode} node the top-level node
	 * @param {number=} srcOffset the node's source offset (kept-comment flush boundary)
	 * @param {number=} srcLine 0-based source line of the node's start
	 * @param {number=} srcCol 0-based source column of the node's start
	 * @param {string=} text what to emit instead of the node's own printed text
	 * @returns {number} the piece's index, for {@link retract}
	 */
	takeRetractable(node, srcOffset, srcLine, srcCol, text) {
		const before = this._mappings.length;
		this.anchor(srcOffset, srcLine, srcCol);
		const mapping = this._mappings.length > before ? before : -1;
		const at = this.emitRetractable(text === undefined ? this.get(node) : text);
		this._moveEpoch();
		if (mapping !== -1) {
			// Indexed by piece rather than a `Map`: pieces are dense integers, and
			// nearly every rule minifying goes out as one.
			if (this._retractableMappings === null) this._retractableMappings = [];
			this._retractableMappings[at] = mapping;
		}
		return at;
	}

	/**
	 * Emit one finished top-level node: first any kept comments that precede it,
	 * then a source mapping anchoring its output start to `[srcLine, srcCol]`, then
	 * its text — and drop the per-node store so the next top-level node starts
	 * clean. `srcOffset` / `srcLine` / `srcCol` are the node's source position; a
	 * grammar that doesn't map positions (e.g. HTML) omits them (no comments, no
	 * mapping — the map ends up empty).
	 * @param {TNode | undefined} node the top-level node, or undefined where `text` is given and no node is the whole of it
	 * @param {number=} srcOffset the node's source offset (kept-comment flush boundary)
	 * @param {number=} srcLine 0-based source line of the node's start
	 * @param {number=} srcCol 0-based source column of the node's start
	 * @param {string=} text what to emit instead of the node's own printed text,
	 * for a printer that folded a later node into this one
	 */
	take(node, srcOffset, srcLine, srcCol, text) {
		this.anchor(srcOffset, srcLine, srcCol);
		this._emit(
			text === undefined ? this.get(/** @type {TNode} */ (node)) : text
		);
		this._moveEpoch();
	}

	/**
	 * Tie whatever is emitted next to a source position: flush the kept comments
	 * that precede it, then record the mapping. Split out of {@link take} for a
	 * node printed in pieces, whose first piece is emitted well after the printer
	 * for it began.
	 * @param {number=} srcOffset the node's source offset (kept-comment flush boundary)
	 * @param {number=} srcLine 0-based source line of the node's start
	 * @param {number=} srcCol 0-based source column of the node's start
	 */
	anchor(srcOffset, srcLine, srcCol) {
		if (srcOffset !== undefined && this._insertIdx < this._inserts.length) {
			this._flushBefore(srcOffset);
		}
		if (srcLine !== undefined && this.mapWanted) {
			// `_chunks.length` is where the tail will land once it is cut off, so
			// this stays right whether or not a piece is cut after it.
			this._mappings.push(
				this._chunks.length,
				this._tailLength,
				srcLine,
				/** @type {number} */ (srcCol)
			);
		}
	}

	/**
	 * Whether a kept literal is queued to land before `pos`. A printer folding two
	 * top-level nodes together asks first: the literal belongs between them, so
	 * the fold would move it past what it was written above.
	 * @param {number} pos source offset
	 * @returns {boolean} true if a kept literal lands before `pos`
	 */
	hasInsertBefore(pos) {
		return (
			this._insertIdx < this._inserts.length &&
			this._inserts[this._insertIdx][0] < pos
		);
	}

	/**
	 * Emit the kept literals landing before `pos`. A printer holding a node back
	 * calls this at hold time, so what was written above it is still emitted
	 * above it — and {@link hasInsertBefore} then answers about the gap to the
	 * next node rather than the whole span since the last node taken.
	 * @param {number} pos source offset to flush up to
	 * @returns {void}
	 */
	flushInsertsBefore(pos) {
		if (this._insertIdx < this._inserts.length) this._flushBefore(pos);
	}

	/**
	 * Queue a literal to carry through to the output at source offset `pos` — a
	 * comment the printer chose to keep (e.g. a `/*!` license banner). Calls
	 * arrive in source order; each lands just before the first top-level node
	 * starting after `pos` (or at the end, via {@link result}).
	 * @param {number} pos source offset the literal sits before
	 * @param {string} text the literal text
	 */
	insert(pos, text) {
		this._inserts.push([pos, text]);
	}

	/**
	 * Take the queued inserts sitting in `[start, end)` — a printer that writes
	 * that source range out itself places them, so the writer must not flush
	 * them ahead of the next top-level node as well.
	 * @param {number} start first source offset of the range
	 * @param {number} end offset past its last
	 * @returns {string} their text, in source order
	 */
	takeInserts(start, end) {
		const inserts = this._inserts;
		// `_insertIdx` only moves on a flush, so walking from it would scan every
		// insert the enclosing rule queued before this range again — quadratic over
		// a rule's declarations. They arrive in source order, so binary search in.
		let low = this._insertIdx;
		let high = inserts.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (inserts[middle][0] < start) low = middle + 1;
			else high = middle;
		}
		let out = "";
		for (let i = low; i < inserts.length && inserts[i][0] < end; i++) {
			out += inserts[i][1];
			inserts[i][1] = "";
		}
		return out;
	}

	/**
	 * Emit every queued insert positioned before source offset `pos` (all of them
	 * for `Infinity`), in source order, so kept comments keep their place relative
	 * to the rules.
	 * @param {number} pos source offset to flush up to
	 */
	_flushBefore(pos) {
		const inserts = this._inserts;
		let i = this._insertIdx;
		while (i < inserts.length && inserts[i][0] < pos) {
			if (inserts[i][1] !== "") this._emit(inserts[i][1]);
			i++;
		}
		this._insertIdx = i;
	}

	/**
	 * @param {SourceMapOptions} options the input's name / content
	 * @param {string=} code the output {@link result} built, walked for its line breaks
	 * @returns {SourceMap} the input->output source map
	 */
	sourceMap(options, code) {
		this._settleDeferred();
		let out = "";
		let genLine = 0;
		let genCol = 0;
		let srcLine = 0;
		let srcCol = 0;
		let atLineStart = true;
		// Walked over the flat output rather than piece by piece: a piece is a rope
		// until something reads it, and reading each one flattens each one.
		const text = code === undefined ? this.result() : code;
		const chunks = this._chunks;
		let atChunk = 0;
		let chunkStart = 0;
		let atOffset = 0;
		let atLine = 0;
		let atCol = 0;
		// Offset of the next newline at or after the cursor, `-1` for none left.
		// Carried rather than searched for per mapping: `indexOf` has no end bound.
		let nextNewline = text.indexOf("\n");
		const mappings = this._mappings;
		for (let at = 0; at < mappings.length; at += 4) {
			const chunkIndex = mappings[at];
			const chunkOffset = mappings[at + 1];
			const sl = mappings[at + 2];
			const sc = mappings[at + 3];
			// Its piece was taken back, so there is no output left to anchor.
			if (sl === -1) continue;
			// A piece's length is stored, so summing them costs nothing per byte.
			while (atChunk < chunkIndex) chunkStart += chunks[atChunk++].length;
			const to = chunkStart + chunkOffset;
			if (to > atOffset) {
				while (nextNewline !== -1 && nextNewline < to) {
					atLine++;
					atCol = 0;
					atOffset = nextNewline + 1;
					nextNewline = text.indexOf("\n", atOffset);
				}
				atCol += to - atOffset;
				atOffset = to;
			}
			const gl = atLine;
			const gc = atCol;
			while (genLine < gl) {
				out += ";";
				genLine++;
				genCol = 0;
				atLineStart = true;
			}
			if (!atLineStart) out += ",";
			atLineStart = false;
			// Single source, so the source-index delta is always 0 (`_vlq(0)`).
			out +=
				_vlq(gc - genCol) + _vlq(0) + _vlq(sl - srcLine) + _vlq(sc - srcCol);
			genCol = gc;
			srcLine = sl;
			srcCol = sc;
		}
		return _makeMap(options, out);
	}

	/**
	 * Stand the text `resolve` gives back in place of every deferred write left
	 * in the output, and move the mappings that follow one in the same piece by
	 * what its text changed in length. Runs before {@link result} and
	 * {@link sourceMap}, so both read the substituted output rather than
	 * correcting for it.
	 *
	 * The marker is `NUL id NUL`. A NUL mostly cannot reach printed output on its
	 * own account — both preprocessors turn one into U+FFFD — but an RCDATA
	 * element and an attribute value keep the one they were written with, so a
	 * pair of them is read as a write only where what stands between spells an id
	 * this answers for. Anything else is the source's own text and is left alone.
	 * @param {(id: number) => string | undefined} resolve the final text for a deferred write, or undefined where it answers for no such write
	 * @param {string} infix what this print marked its writes with
	 * @returns {void}
	 */
	substitute(resolve, infix) {
		this._settleDeferred();
		const chunks = this._chunks;
		const mappings = this._mappings;
		// Both pieces and mappings are output-ordered, so one cursor walks them
		// together rather than searching the mappings per piece.
		let at = 0;
		for (let i = 0; i <= chunks.length; i++) {
			const text = i === chunks.length ? this._tail : chunks[i];
			while (at < mappings.length && mappings[at] < i) at += 4;
			let start = text.indexOf(DEFERRED_MARKER);
			if (start === -1) continue;
			let out = "";
			let read = 0;
			let delta = 0;
			/** @type {[number, number][]} `[offset past the marker, delta so far]` */
			const shifts = [];
			while (start !== -1) {
				const write = readDeferredWrite(text, start, resolve, infix);

				// Not a write of ours — a NUL the source carried. Left where it is,
				// and the scan goes on past it so a real write behind it still lands.
				if (write === null) {
					start = text.indexOf(DEFERRED_MARKER, start + 1);
					continue;
				}

				const { end } = write;
				const replacement = expandDeferredWrites(
					write.replacement,
					resolve,
					infix
				);

				out += text.slice(read, start) + replacement;
				read = end + 1;
				delta += replacement.length - (read - start);
				shifts.push([read, delta]);
				start = text.indexOf(DEFERRED_MARKER, read);
			}
			out += text.slice(read);
			if (i === chunks.length) {
				this._tail = out;
				this._tailLength = out.length;
			} else {
				chunks[i] = out;
			}
			let s = 0;
			for (let k = at; k < mappings.length && mappings[k] === i; k += 4) {
				while (s < shifts.length && shifts[s][0] <= mappings[k + 1]) s++;
				if (s !== 0) mappings[k + 1] += shifts[s - 1][1];
			}
		}
	}

	/**
	 * @returns {string} the printed output
	 */
	/**
	 * Throw away everything printed and stand `text` in its place. For the one
	 * caller that can only tell its output is wrong once it has all of it.
	 * @param {string} text the output to keep instead
	 */
	replaceAll(text) {
		this._deferred = null;
		this._chunks.length = 0;
		this._tail = text;
		this._tailLength = text.length;
		this._mappings.length = 0;
		this._inserts.length = 0;
		this._insertIdx = 0;
		this._pending.length = 0;
		this._pendingAnchor = null;
	}

	result() {
		this._settleDeferred();
		// Trailing kept comments (after the last top-level node) flush here.
		if (this._insertIdx < this._inserts.length) this._flushBefore(Infinity);
		// Nothing was ever cut into its own piece, so there is nothing to join.
		const chunks = this._chunks;
		if (chunks.length === 0) return this._tail;
		// The tail joins as a piece of its own, so the output comes back flat
		// rather than as a rope over the join that every reader flattens again.
		this._cutTail();
		return chunks.join("");
	}
}

// Where an edited walk is with each node: not reached, inside it, inside it
// and owing it children an edit added, done with it, or out of the tree.
const MARK_NONE = 0;
const MARK_ENTERED = 1;
const MARK_GREW = 2;
const MARK_DONE = 3;
const MARK_REMOVED = 4;

/**
 * Where an edit puts nodes: in a node's place, before or after it, or at
 * the end of one of its fields.
 * @typedef {"replace" | "before" | "after" | "end"} EditPlace
 */

/**
 * What a language's tree and walk give the edits {@link EditContext} makes:
 * where a node stands, its fields written, text parsed into nodes, and the
 * walk's steps, which the context takes over once a visitor edits.
 * @typedef {object} EditableTree
 * @property {string} language the language, which opens every error
 * @property {boolean=} ordered whether the print writes children out as the walk reaches them, so nodes added just behind it are walked before it goes on
 * @property {() => number} root the node the walk started at
 * @property {() => number} size the highest node id, nodes counting from `1`
 * @property {(node: number) => boolean} isNode whether an id names a node of the tree
 * @property {(node: number) => number[]} childrenOf the node's children in walk order, as edits left them
 * @property {(node: number) => string} typeName the node's type, for an error
 * @property {(field: number) => string} fieldName a `Field`'s name, for an error
 * @property {(container: number, field: number) => boolean} isList whether the node's field holds a list, throwing where its type has no such field
 * @property {(container: number, field: number) => boolean} isOptional whether the field may hold no node
 * @property {(container: number, node: number) => { field: number, index: number } | undefined} locate where the node stands in the container: its field and index, `-1` in a single-node field
 * @property {(container: number, field: number) => number[]} itemsOf the field's items, `0` for a hole
 * @property {(container: number, field: number, index: number, removeCount: number, items: number[]) => void} write writes nodes in place of `removeCount` items from `index`, `-1` for a single-node field
 * @property {(container: number, field: number, text: string, offset: number) => number[]} parse parses text into nodes added to the tree, as what the field takes
 * @property {(container: number, field: number, added: number[], after: number[], emptied: boolean) => void} check throws where the field would not hold `after`, `added` being the nodes the edit brings in
 * @property {((container: number, field: number, near: number, place: EditPlace) => number)=} offsetOf where nodes an edit puts in a field stand in the input, for a language that orders children by it
 * @property {((nodes: number[], offset: number) => void)=} moved the moved nodes now stand at `offset`
 * @property {((node: number) => number)=} holderOf the node holding one the walk never visits, such as an HTML attribute
 * @property {((node: number, own: boolean) => string | null)=} written once the output holds the node, or with `own` some of its own text, until when it could be edited
 * @property {() => number} current the node whose visitors fire
 * @property {() => boolean} exiting whether they are `exit` visitors
 * @property {() => boolean} printing whether the walk prints
 * @property {() => boolean} halted whether the walk stopped and prints nothing
 * @property {() => void} began the first edit: the walk hands over to {@link EditContext.resume}
 * @property {(node: number, index: number, visits: boolean) => boolean} enter fires the node's `enter` visitors where it `visits`, returning whether the walk descends
 * @property {((node: number, descends: boolean) => void)=} entered the node's `enter` visitors are done and it is still in the tree
 * @property {((node: number) => boolean)=} opens whether a print walks what the node holds where its visitors do not descend into it
 * @property {(node: number, index: number, visits: boolean) => void} exit fires the node's `exit` visitors where it `visits`
 * @property {(node: number, index: number) => void} print prints the node, once the walk is done with it
 * @property {() => () => void} suspend keeps where the walk is for a nested walk of added nodes, returning what puts it back
 */

/**
 * @param {string} name a type's name
 * @returns {string} it after its indefinite article, for an error
 */
const withArticle = (name) =>
	`${/^(?:A|E|I|O|U)/.test(name) ? "an" : "a"} ${name}`;

/**
 * The edits a language's `path` makes, alike in every language: nodes put in
 * place of one, beside it or at the end of a field, or taken out, and the walk
 * taking each edit up as Babel's does. The language gives the tree's reads and
 * writes and its walk's steps as an {@link EditableTree}.
 */
class EditContext {
	/**
	 * @param {EditableTree} tree the language's tree and walk
	 * @param {number[]} parents the nodes the walk is inside, outermost first, which the language reads too
	 */
	constructor(tree, parents) {
		/** @type {EditableTree} */
		this.tree = tree;
		/** @type {number[]} */
		this.parents = parents;
		/** @type {Uint8Array | null} by node, where the walk is with it, made by the first edit */
		this.marks = null;
		/** @type {Int32Array | null} by node, the node holding it, `0` at the root and out of the tree */
		this.holders = null;
		// Where the first edit left the walk, which unwinds to take it up again.
		/** @type {{ node: number, exiting: boolean, descends: boolean }} */
		this._began = { node: 0, exiting: false, descends: false };
	}

	/**
	 * Forgets the walk's edits, at its start and end.
	 * @returns {void}
	 */
	reset() {
		this.marks = null;
		this.holders = null;
		this._began.node = 0;
	}

	/**
	 * @param {string} message what is wrong
	 * @returns {Error} the error, in the language's name
	 */
	error(message) {
		return new Error(`${this.tree.language} syntax: ${message}`);
	}

	/**
	 * @param {number} node a node
	 * @returns {string} its type after its article, for an error
	 */
	describe(node) {
		return withArticle(this.tree.typeName(node));
	}

	/**
	 * Reads where the walk is with every node, on its first edit: the nodes it
	 * left behind are done, the ones it is inside entered, and each node's
	 * holder read off the tree.
	 * @returns {void}
	 */
	start() {
		if (this.marks !== null) return;
		const tree = this.tree;
		const marks = new Uint8Array(tree.size() + 1);
		const holders = new Int32Array(tree.size() + 1);
		const current = tree.current();
		const exiting = tree.exiting();
		let reached = false;
		/**
		 * @param {number} node a node, the walk's order reaching it
		 * @param {boolean} done whether the walk is done with it
		 * @returns {void}
		 */
		const read = (node, done) => {
			const children = tree.childrenOf(node);
			for (let i = 0; i < children.length; i++) holders[children[i]] = node;
			if (done || reached) {
				if (done) marks[node] = MARK_DONE;
				for (let i = 0; i < children.length; i++) read(children[i], done);
				return;
			}
			marks[node] = MARK_ENTERED;
			if (node === current) {
				reached = true;
				// An `exit` visitor's node has its children walked already.
				for (let i = 0; i < children.length; i++) read(children[i], exiting);
				return;
			}
			for (let i = 0; i < children.length; i++) read(children[i], false);
			if (!reached) marks[node] = MARK_DONE;
		};
		read(tree.root(), false);
		this.marks = marks;
		this.holders = holders;
		const parents = this.parents;
		parents.length = 0;
		for (let n = holders[current]; n !== 0; n = holders[n]) parents.push(n);
		parents.reverse();
		tree.began();
	}

	/**
	 * @param {number} node a node
	 * @returns {number} the node holding it, `0` for the root and one out of the tree
	 */
	holderOf(node) {
		if (node < 0) {
			return /** @type {(node: number) => number} */ (this.tree.holderOf)(node);
		}
		return /** @type {Int32Array} */ (this.holders)[node];
	}

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether the walk printed it already
	 */
	isPrinted(node) {
		return (
			node > 0 &&
			this.tree.printing() &&
			/** @type {Uint8Array} */ (this.marks)[node] === MARK_DONE
		);
	}

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether the walk is inside it
	 */
	isWalking(node) {
		if (node < 0) return false;
		const mark = /** @type {Uint8Array} */ (this.marks)[node];
		return mark === MARK_ENTERED || mark === MARK_GREW;
	}

	/**
	 * @param {number} node a node the walk is inside
	 * @returns {boolean} whether an edit took it out of the tree or moved it, so the walk leaves it
	 */
	isLeft(node) {
		const mark = /** @type {Uint8Array} */ (this.marks)[node];
		return mark === MARK_REMOVED || mark === MARK_NONE;
	}

	/**
	 * Reads the nodes a parse added, ids `first` to `last`: the columns grow
	 * to hold them, and each one's children are its.
	 * @param {number} first the first node
	 * @param {number} last the last node
	 * @returns {void}
	 */
	added(first, last) {
		const tree = this.tree;
		let marks = /** @type {Uint8Array} */ (this.marks);
		if (last >= marks.length) {
			const size = Math.max(last + 1, marks.length * 2);
			marks = new Uint8Array(size);
			marks.set(/** @type {Uint8Array} */ (this.marks));
			const holders = new Int32Array(size);
			holders.set(/** @type {Int32Array} */ (this.holders));
			this.marks = marks;
			this.holders = holders;
		}
		const holders = /** @type {Int32Array} */ (this.holders);
		for (let node = first; node <= last; node++) {
			const children = tree.childrenOf(node);
			for (let i = 0; i < children.length; i++) holders[children[i]] = node;
		}
	}

	/**
	 * @param {number} node what an edit was given as a node
	 * @returns {void}
	 */
	checkNode(node) {
		if (!Number.isInteger(node) || node === 0 || !this.tree.isNode(node)) {
			throw this.error(`${node} is no node`);
		}
	}

	/**
	 * Throws where the output holds the node, or some of it, already.
	 * @param {number} node a node
	 * @param {boolean=} own whether only its own text counts, not what it holds: what goes in its place or before it
	 * @returns {void}
	 */
	checkWritable(node, own = false) {
		const until =
			!own && this.isPrinted(node)
				? "its exit visitors return"
				: this.tree.written === undefined
					? null
					: this.tree.written(node, own);
		if (until !== null) {
			throw this.error(
				`${this.describe(node)} the walk printed already can no longer be edited; edit it before ${until}`
			);
		}
	}

	/**
	 * @param {number} node a node in the tree
	 * @returns {{ container: number, field: number, index: number }} the node holding it, the field it is in, and its index there, `-1` in a single-node field
	 */
	locate(node) {
		const tree = this.tree;
		if (node === tree.root()) {
			throw this.error(`the ${tree.typeName(node)} is in no field`);
		}
		const container = this.holderOf(node);
		const at = container === 0 ? undefined : tree.locate(container, node);
		if (at === undefined) {
			throw this.error(`the ${tree.typeName(node)} is not in the tree`);
		}
		return { container, field: at.field, index: at.index };
	}

	/**
	 * Sets a node and everything under it as not reached, to be walked where
	 * an edit moved it.
	 * @param {number} node the node
	 * @returns {void}
	 */
	_resetMarks(node) {
		const marks = /** @type {Uint8Array} */ (this.marks);
		if (node < 0 || marks[node] === MARK_NONE) return;
		marks[node] = MARK_NONE;
		const children = this.tree.childrenOf(node);
		for (let i = 0; i < children.length; i++) this._resetMarks(children[i]);
	}

	/**
	 * The nodes now stand in the container: the walk reads its children again
	 * where it is inside it, or walks them where it is done with it and prints
	 * nothing.
	 * @param {number} container the node
	 * @param {number[]} items the nodes, `0` for a hole
	 * @returns {void}
	 */
	_attached(container, items) {
		const marks = /** @type {Uint8Array} */ (this.marks);
		const holders = /** @type {Int32Array} */ (this.holders);
		for (let i = 0; i < items.length; i++) {
			if (items[i] <= 0) continue;
			holders[items[i]] = container;
			this._resetMarks(items[i]);
		}
		if (container < 0) return;
		const mark = marks[container];
		if (mark === MARK_ENTERED) {
			marks[container] = MARK_GREW;
		} else if (mark === MARK_DONE && !this.tree.printing()) {
			this._walkAdded(container, items);
		}
	}

	/**
	 * The node left the container, to stand elsewhere where `moving`.
	 * @param {number} node the node
	 * @param {number} container the node that held it
	 * @param {boolean} moving whether it moves rather than leaves the tree
	 * @returns {void}
	 */
	_detached(node, container, moving) {
		if (node < 0) return;
		const marks = /** @type {Uint8Array} */ (this.marks);
		/** @type {Int32Array} */ (this.holders)[node] = 0;
		// Taken out while the walk is inside it, the nodes it holds go with it.
		if (marks[node] === MARK_ENTERED || marks[node] === MARK_GREW) {
			const at = this.parents.indexOf(node);
			if (at !== -1) {
				for (let i = at + 1; i < this.parents.length; i++) {
					marks[this.parents[i]] = MARK_REMOVED;
				}
				marks[this.tree.current()] = MARK_REMOVED;
			}
		}
		marks[node] = MARK_REMOVED;
		// Moved, it is walked anew: the walk inside the container must not find it there.
		if (moving && container > 0 && marks[container] === MARK_ENTERED) {
			marks[container] = MARK_GREW;
		}
	}

	/**
	 * What a field holds once `removeCount` items from `index` give way to
	 * `items`, those of them it held moving.
	 * @param {number} container the node
	 * @param {number} field the `Field`
	 * @param {number} index the first item replaced, `-1` for a single-node field
	 * @param {number} removeCount how many items go
	 * @param {number[]} items what takes their place
	 * @returns {number[]} the field's items after
	 */
	_after(container, field, index, removeCount, items) {
		if (index === -1) return items;
		const current = this.tree.itemsOf(container, field);
		/** @type {number[]} */
		const after = [];
		let at = 0;
		for (let i = 0; i < current.length; i++) {
			if (i === index) at = after.length;
			if (i >= index && i < index + removeCount) continue;
			if (current[i] !== 0 && items.includes(current[i])) continue;
			after.push(current[i]);
		}
		if (index >= current.length) at = after.length;
		after.splice(at, 0, ...items);
		return after;
	}

	/**
	 * Reads what an edit puts in a field: text parsed for it, and nodes moved
	 * from where they stand, checked before anything is changed.
	 * @param {string | number | (string | number)[]} input text or nodes
	 * @param {number} container the node the field is of
	 * @param {number} field the `Field`
	 * @param {number} offset where parsed nodes stand in the input
	 * @returns {{ items: number[], moved: number[] }} what stands in the field, and which of it moves from elsewhere
	 */
	_readItems(input, container, field, offset) {
		const tree = this.tree;
		const entries = Array.isArray(input) ? input : [input];
		/** @type {number[]} */
		const items = [];
		/** @type {number[]} */
		const moved = [];
		for (const entry of entries) {
			if (typeof entry === "string") {
				const first = tree.size() + 1;
				for (const item of tree.parse(container, field, entry, offset)) {
					items.push(item);
				}
				if (tree.size() >= first) this.added(first, tree.size());
				continue;
			}
			if (entry === 0) {
				items.push(0);
				continue;
			}
			this.checkNode(entry);
			for (let n = container; n !== 0; n = this.holderOf(n)) {
				if (n === entry) {
					throw this.error(
						`${this.describe(entry)} cannot be put inside itself`
					);
				}
			}
			if (entry !== tree.current() && this.isWalking(entry)) {
				throw this.error(
					`the walk is inside the ${tree.typeName(entry)}, which cannot move until it leaves it`
				);
			}
			if (this.holderOf(entry) !== 0) {
				const from = this.locate(entry);
				this.checkWritable(from.container);
				if (from.index === -1 && !tree.isOptional(from.container, from.field)) {
					throw this.error(
						`moving the ${tree.typeName(entry)} would leave ${this.describe(from.container)}'s ${tree.fieldName(from.field)} empty`
					);
				}
				moved.push(entry);
			}
			items.push(entry);
		}
		return { items, moved };
	}

	/**
	 * Takes nodes out of where they stand, to stand at `offset` elsewhere.
	 * @param {number[]} moved the nodes
	 * @param {number} offset where they go in the input
	 * @returns {void}
	 */
	_takeOut(moved, offset) {
		for (const node of moved) {
			const from = this.locate(node);
			this.tree.write(from.container, from.field, from.index, 1, []);
			this._detached(node, from.container, true);
		}
		if (moved.length !== 0 && this.tree.moved !== undefined) {
			this.tree.moved(moved, offset);
		}
	}

	/**
	 * Writes nodes into a field in place of `removeCount` items from `index`.
	 * @param {number} container the node
	 * @param {number} field the `Field`
	 * @param {number} index where they go, `-1` for a single-node field
	 * @param {number} removeCount how many items they replace
	 * @param {number[]} items the nodes
	 * @returns {void}
	 */
	_write(container, field, index, removeCount, items) {
		this.tree.write(container, field, index, removeCount, items);
		this._attached(container, items);
	}

	/**
	 * @param {number} container the node
	 * @param {number} field the `Field`
	 * @param {number} near the node the edit is made at
	 * @param {EditPlace} place where it puts nodes
	 * @returns {number} where they stand in the input
	 */
	_offsetOf(container, field, near, place) {
		return this.tree.offsetOf === undefined
			? 0
			: this.tree.offsetOf(container, field, near, place);
	}

	/**
	 * @param {string | number | (string | number)[]} replacement text or nodes
	 * @param {number} node the node replaced
	 * @returns {number[]} the nodes in its place
	 */
	replaceWith(replacement, node) {
		this.checkNode(node);
		const location = this.locate(node);
		this.checkWritable(location.container);
		this.checkWritable(node, true);
		const { container, field } = location;
		const offset = this._offsetOf(container, field, node, "replace");
		const { items, moved } = this._readItems(
			replacement,
			container,
			field,
			offset
		);
		this.tree.check(
			container,
			field,
			items,
			this._after(container, field, location.index, 1, items),
			location.index === -1 && items.length === 0
		);
		this._takeOut(
			moved.filter((item) => item !== node),
			offset
		);
		const at = this.locate(node);
		this._write(at.container, at.field, at.index, 1, items);
		if (!items.includes(node)) this._detached(node, at.container, false);
		return items;
	}

	/**
	 * @param {"before" | "after" | number} where before or after the node, or a `Field` of it
	 * @param {string | number | (string | number)[]} nodes text or nodes
	 * @param {number} node the node
	 * @returns {number[]} the nodes inserted
	 */
	insert(where, nodes, node) {
		this.checkNode(node);
		const tree = this.tree;
		if (where === "before" || where === "after") {
			const location = this.locate(node);
			const { container, field } = location;
			if (location.index === -1) {
				throw this.error(
					`${this.describe(container)}'s ${tree.fieldName(field)} holds one node; replace it instead`
				);
			}
			this.checkWritable(container);
			if (where === "before") this.checkWritable(node, true);
			const offset = this._offsetOf(container, field, node, where);
			const { items, moved } = this._readItems(nodes, container, field, offset);
			const index = where === "before" ? location.index : location.index + 1;
			tree.check(
				container,
				field,
				items,
				this._after(container, field, index, 0, items),
				false
			);
			this._takeOut(moved, offset);
			const at = this.locate(node);
			this._write(
				at.container,
				at.field,
				where === "before" ? at.index : at.index + 1,
				0,
				items
			);
			return items;
		}
		if (typeof where !== "number") {
			throw this.error(
				`insert() takes "before", "after" or a Field, not ${String(where)}`
			);
		}
		const list = tree.isList(node, where);
		this.checkWritable(node);
		const count = tree.itemsOf(node, where).length;
		if (!list && count !== 0) {
			throw this.error(
				`${this.describe(node)}'s ${tree.fieldName(where)} holds a node already; replace it instead`
			);
		}
		const offset = this._offsetOf(node, where, node, "end");
		const { items, moved } = this._readItems(nodes, node, where, offset);
		tree.check(
			node,
			where,
			items,
			this._after(node, where, list ? count : -1, 0, items),
			false
		);
		this._takeOut(moved, offset);
		this._write(
			node,
			where,
			list ? tree.itemsOf(node, where).length : -1,
			0,
			items
		);
		return items;
	}

	/**
	 * @param {number} node the node removed
	 * @returns {void}
	 */
	remove(node) {
		this.checkNode(node);
		const location = this.locate(node);
		const { container, field, index } = location;
		this.checkWritable(container);
		this.checkWritable(node, true);
		this.tree.check(
			container,
			field,
			[],
			this._after(container, field, index, 1, []),
			index === -1
		);
		this.tree.write(container, field, index, 1, []);
		this._detached(node, container, false);
	}

	/**
	 * Walks the items an edit left in a field that the walk has not reached,
	 * for a language whose own walk goes on once edits begin, reading the
	 * marks: the items are read again where an edit adds to the node meanwhile.
	 * @param {number} node the node
	 * @param {number} field the `Field`
	 * @param {(item: number, index: number) => void} walk walks one item and what it holds
	 * @returns {void}
	 */
	walkRest(node, field, walk) {
		const tree = this.tree;
		const marks = /** @type {Uint8Array} */ (this.marks);
		let items = tree.itemsOf(node, field);
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item > 0 && marks[item] === MARK_NONE) {
				walk(item, i);
				if (tree.halted()) return;
			}
			if (this.isLeft(node)) return;
			if (marks[node] === MARK_GREW) {
				marks[node] = MARK_ENTERED;
				items = tree.itemsOf(node, field);
				i = -1;
			}
		}
	}

	/**
	 * Marks a node the walk enters, or with `done` leaves, once edits begin.
	 * @param {number} node the node
	 * @param {boolean} done whether the walk is done with it
	 * @returns {void}
	 */
	mark(node, done) {
		/** @type {Uint8Array} */ (this.marks)[node] = done
			? MARK_DONE
			: MARK_ENTERED;
	}

	/**
	 * Where the first edit leaves the walk, thrown to unwind it so that
	 * {@link resume} takes it up again.
	 * @param {number} node the node whose visitor made the edit
	 * @param {boolean} exiting whether its `exit` visitors made it
	 * @param {boolean} descends whether the walk descends into it
	 * @returns {{ node: number, exiting: boolean, descends: boolean }} what to throw
	 */
	unwind(node, exiting, descends) {
		const began = this._began;
		began.node = node;
		began.exiting = exiting;
		began.descends = descends;
		return began;
	}

	/**
	 * @param {unknown} thrown what a walk threw
	 * @returns {boolean} whether it is {@link unwind}'s
	 */
	isUnwind(thrown) {
		return thrown === this._began;
	}

	/**
	 * Takes the walk up again from the root, after {@link unwind}: the nodes it
	 * was inside are resumed past their `enter` visitors, as the marks read.
	 * @returns {void}
	 */
	resume() {
		this.parents.length = 0;
		this._resumeNode(this.tree.root(), 0, true);
	}

	/**
	 * @param {number} node a node the walk was inside
	 * @param {number} index its index among its siblings
	 * @param {boolean} visits whether its visitors fire
	 * @returns {void}
	 */
	_resumeNode(node, index, visits) {
		const began = this._began;
		if (node !== began.node) {
			this._resumeEdited(node, index, visits, true);
			return;
		}
		began.node = 0;
		if (began.exiting) {
			this._resumeExited(node, index, visits && began.descends);
		} else {
			this._entered(node, visits, began.descends);
			this._resumeEdited(node, index, visits, began.descends);
		}
	}

	/**
	 * Walks a node's children, skipping those the walk is done with. Where an
	 * edit adds children to the node meanwhile, they are read again and the
	 * ones not yet walked are.
	 * @param {number} node the node
	 * @param {boolean} visits whether their visitors fire
	 * @returns {void}
	 */
	_walkChildren(node, visits) {
		const tree = this.tree;
		let children = tree.childrenOf(node);
		/** @type {Uint8Array} */ (this.marks)[node] = MARK_ENTERED;
		this.parents.push(node);
		for (let i = 0; i < children.length; i++) {
			const mark = /** @type {Uint8Array} */ (this.marks)[children[i]];
			if (mark === MARK_NONE) {
				this._walkNode(children[i], i, visits);
				if (tree.halted()) break;
			} else if (
				this._began.node !== 0 &&
				(mark === MARK_ENTERED || mark === MARK_GREW)
			) {
				this._resumeNode(children[i], i, visits);
			}
			if (this.isLeft(node)) break;
			if (/** @type {Uint8Array} */ (this.marks)[node] === MARK_GREW) {
				/** @type {Uint8Array} */ (this.marks)[node] = MARK_ENTERED;
				children = tree.childrenOf(node);
				i = -1;
			}
		}
		this.parents.pop();
	}

	/**
	 * Walks a node and everything under it, as the language's walk does,
	 * reading where the walk is off the marks.
	 * @param {number} node the node
	 * @param {number} index its index among its siblings
	 * @param {boolean} visits whether its visitors fire
	 * @returns {void}
	 */
	_walkNode(node, index, visits) {
		/** @type {Uint8Array} */ (this.marks)[node] = MARK_ENTERED;
		const descends = this.tree.enter(node, index, visits);
		this._entered(node, visits, descends);
		this._resumeEdited(node, index, visits, descends);
	}

	/**
	 * A node's `enter` visitors are done: for a print that writes children as
	 * the walk reaches them, the nodes they put just before it are walked first.
	 * @param {number} node the node
	 * @param {boolean} visits whether its visitors fire
	 * @param {boolean} descends whether the walk descends into it
	 * @returns {void}
	 */
	_entered(node, visits, descends) {
		if (this.isLeft(node)) return;
		const tree = this.tree;
		const marks = /** @type {Uint8Array} */ (this.marks);
		const holder = this.holderOf(node);
		if (tree.ordered && holder > 0 && marks[holder] === MARK_GREW) {
			const siblings = tree.childrenOf(holder);
			for (let i = 0; i < siblings.length && siblings[i] !== node; i++) {
				if (marks[siblings[i]] === MARK_NONE) {
					this._walkNode(siblings[i], i, visits);
				}
			}
		}
		if (!this.isLeft(node) && tree.entered !== undefined) {
			tree.entered(node, descends);
		}
	}

	/**
	 * Goes on with a node past its `enter` visitors: the children not yet
	 * walked, its `exit` visitors, its printer.
	 * @param {number} node the node
	 * @param {number} index its index among its siblings
	 * @param {boolean} visits whether its visitors fire
	 * @param {boolean} descends whether the walk descends into it
	 * @returns {void}
	 */
	_resumeEdited(node, index, visits, descends) {
		const tree = this.tree;
		if (tree.halted()) return;
		// An edit took it out of the tree, or moved it to be walked where it went.
		if (this.isLeft(node)) return;
		if (
			descends ||
			(tree.printing() && (tree.opens === undefined || tree.opens(node)))
		) {
			this._walkChildren(node, visits && descends);
			if (this.isLeft(node)) return;
		}
		tree.exit(node, index, visits);
		this._resumeExited(node, index, visits && descends);
	}

	/**
	 * Goes on with a node past its `exit` visitors: the children they added,
	 * then its printer.
	 * @param {number} node the node
	 * @param {number} index its index among its siblings
	 * @param {boolean} visits whether its children's visitors fire
	 * @returns {void}
	 */
	_resumeExited(node, index, visits) {
		if (/** @type {Uint8Array} */ (this.marks)[node] === MARK_GREW) {
			this._walkChildren(node, visits);
		}
		if (this.isLeft(node)) return;
		/** @type {Uint8Array} */ (this.marks)[node] = MARK_DONE;
		if (this.tree.printing()) this.tree.print(node, index);
	}

	/**
	 * Walks nodes an edit added to a node the walk is done with, where it
	 * prints nothing: as Babel's does, every node an edit adds is visited.
	 * @param {number} container the node they were added to
	 * @param {number[]} items the nodes
	 * @returns {void}
	 */
	_walkAdded(container, items) {
		const parents = this.parents;
		const saved = [...parents];
		const restore = this.tree.suspend();
		parents.length = 0;
		for (let n = container; n !== 0; n = this.holderOf(n)) parents.push(n);
		parents.reverse();
		try {
			const siblings = this.tree.childrenOf(container);
			for (let i = 0; i < items.length; i++) {
				if (
					items[i] <= 0 ||
					/** @type {Uint8Array} */ (this.marks)[items[i]] !== MARK_NONE
				) {
					continue;
				}
				this._walkNode(items[i], siblings.indexOf(items[i]), true);
			}
		} finally {
			parents.length = 0;
			for (let i = 0; i < saved.length; i++) parents.push(saved[i]);
			restore();
		}
	}
}

/**
 * Visitor coordinator: owns the visitor registry and drives a language
 * `grammar` over the source. Language-agnostic — each syntax (CSS, HTML, …)
 * binds its own grammar, node-type enum and (optionally) node printer.
 * Usage:
 *
 * ```
 * processor.use({ [NodeType.X]: (path) => {}, [NodeType.Y]: { enter, exit } });
 * processor.process(source);
 * ```
 * @template {NodePath<TNode>} TPath
 * @template TNode
 * @template [TProcessOptions=object]
 * @template [TPrintOptions=object]
 * @template {NodeParts} [TParts=AnyParts] the language's parts, which type each visitor's path by node type
 * @template [TState=unknown] what `process` hands every visitor as `path.state`
 * @template [TVisitors=VisitorMap<TPath>] the language's visitor map, each path typed by its key and with `TState`
 */
class SourceProcessor {
	/**
	 * @param {Grammar<TPath, TNode, TProcessOptions, TPrintOptions>} grammar the grammar to drive over the source
	 * @param {NodePrinter<TPath, TNode, TPrintOptions>=} printer the node printer, fired per node once its visitors and children are done; the same `path` a visitor gets plus the print context as its writer. Required to print (e.g. `mode`); a future API can let a developer supply their own
	 * @param {(() => NodePrinter<TPath, TNode, TPrintOptions>)=} loadPrinter asked for the printer the first time something prints, for a language that keeps its printer in a module of its own — so a walk that never prints never loads it
	 * @param {TPath=} path the path the grammar hands its visitors, whose `state` a run sets
	 */
	constructor(grammar, printer, loadPrinter, path) {
		/** @type {Grammar<TPath, TNode, TProcessOptions, TPrintOptions>} */
		this._grammar = grammar;
		/** @type {CompiledVisitorMap<TPath>} */
		this._visitors = [];
		/** @type {NodePrinter<TPath, TNode, TPrintOptions> | undefined} */
		this._printer = printer;
		/** @type {(() => NodePrinter<TPath, TNode, TPrintOptions>) | undefined} */
		this._loadPrinter = loadPrinter;
		/** @type {TPath | undefined} */
		this._path = path;
		// Set for the one print {@link processDeferred} holds open, so `process`
		// hands it the context instead of building the output straight away.
		/** @type {((ctx: PrintContext<TPath, TNode, TPrintOptions>, build: () => { code: string, map: SourceMap | undefined }) => void) | null} */
		this._deferred = null;
	}

	/**
	 * Register one bucket for several node types, as a map naming each would;
	 * its path takes only the parts those types have.
	 * @template {number} T
	 * @overload
	 * @param {T[]} types the node types the bucket visits
	 * @param {VisitorBucket<TypedNodePath<TPath, TNode, TParts, T, TState>>} bucket the visitor
	 * @returns {SourceProcessor<TPath, TNode, TProcessOptions, TPrintOptions, TParts, TState, TVisitors>} `this`, for chaining
	 */
	/**
	 * Register a visitor map; calls accumulate per node type, and each
	 * visitor's path takes only its type's parts.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @overload
	 * @param {TVisitors} map visitor map keyed by node type
	 * @returns {SourceProcessor<TPath, TNode, TProcessOptions, TPrintOptions, TParts, TState, TVisitors>} `this`, for chaining
	 */
	/**
	 * Register a visitor map built at runtime, keyed by any node type.
	 * @overload
	 * @param {VisitorMap<TPath>} map visitor map keyed by node type
	 * @returns {SourceProcessor<TPath, TNode, TProcessOptions, TPrintOptions, TParts, TState, TVisitors>} `this`, for chaining
	 */
	/**
	 * @param {number[] | TVisitors | VisitorMap<TPath>} map visitor map, or the node types `bucket` visits
	 * @param {VisitorBucket<TypedNodePath<TPath, TNode, TParts, number, TState>>=} bucket the visitor, with an array of types
	 * @returns {SourceProcessor<TPath, TNode, TProcessOptions, TPrintOptions, TParts, TState, TVisitors>} `this`, for chaining
	 */
	use(map, bucket) {
		if (Array.isArray(map)) {
			if (bucket === undefined) {
				throw new TypeError(
					"SourceProcessor.use(types, bucket): a visitor is required"
				);
			}
			for (let i = 0; i < map.length; i++) {
				this._add(
					map[i],
					/** @type {VisitorBucket<TPath>} */ (
						/** @type {VisitorBucket<TPath> | VisitorBucket<TypedNodePath<TPath, TNode, TParts, number, TState>>} */ (
							bucket
						)
					)
				);
			}
			return this;
		}
		// `map`'s keys are node-type enum members; `Object.keys` stringifies them,
		// so index the compiled array by the number to match the numeric `node.type`.
		for (const type of Object.keys(/** @type {VisitorMap<TPath>} */ (map))) {
			const key = Number(type);
			this._add(key, /** @type {VisitorMap<TPath>} */ (map)[key]);
		}
		return this;
	}

	/**
	 * @param {number} type node type
	 * @param {VisitorBucket<TPath>} visitor its visitor
	 */
	_add(type, visitor) {
		let compiled = this._visitors[type];
		if (!compiled) {
			compiled = { enter: [], exit: [] };
			this._visitors[type] = compiled;
		}
		if (typeof visitor === "function") {
			compiled.enter.push(visitor);
		} else {
			if (visitor.enter) compiled.enter.push(visitor.enter);
			if (visitor.exit) compiled.exit.push(visitor.exit);
		}
	}

	/**
	 * Run the grammar with the path's `state` set to the run's, put back after so
	 * a run nested in a visitor leaves its caller's.
	 * @param {string} input the source
	 * @param {PrintContext<TPath, TNode, TPrintOptions> | undefined} ctx the print context, when printing
	 * @param {TProcessOptions} opts process options
	 */
	_run(input, ctx, opts) {
		const path = this._path;
		if (path === undefined) {
			this._grammar(input, this._visitors, ctx, opts);
			return;
		}
		const outer = path.state;
		path.state = /** @type {RunState<TState>} */ (opts).state;
		try {
			this._grammar(input, this._visitors, ctx, opts);
		} finally {
			path.state = outer;
		}
	}

	/**
	 * Parse `input` once and fire the visitors in source order. Asking for output
	 * — `mode`, the one thing that names it — makes the same walk print, given a
	 * printer supplied at construction: a
	 * {@link PrintContext} is created, each node's printer fires into it as the node
	 * finishes, and the result is returned as `{ code, map }`: the serialized output
	 * and, for a caller that named its input with `source` / `content`, the
	 * input->output source map — `map` is `undefined` without one. Asking for
	 * none of it only walks and returns `undefined`. A single parse — printing
	 * never re-parses; all configuration is per-call.
	 * @overload
	 * @param {string} input the source
	 * @param {TProcessOptions & RunState<TState> & { mode: PrintOptions["mode"] } & { source: string, content?: string }} options process options, naming the input so a map is built
	 * @returns {{ code: string, map: SourceMap }} the output and its map
	 */
	/**
	 * @overload
	 * @param {string} input the source
	 * @param {TProcessOptions & RunState<TState> & { mode: PrintOptions["mode"] }} options process options, asking for output but no map
	 * @returns {{ code: string, map: undefined }} the output alone
	 */
	/**
	 * @overload
	 * @param {string} input the source
	 * @param {(TProcessOptions & RunState<TState>)=} options process options, asking for no output
	 * @returns {undefined} nothing — the walk alone
	 */
	/**
	 * @param {string} input source text
	 * @param {(TProcessOptions & RunState<TState>)=} options grammar-specific options (`skip`, …) plus `mode`, for the map `source` / `content`, and the visitors' `state`
	 * @returns {{ code: string, map: SourceMap | undefined } | undefined} `{ code, map }` when printing, else `undefined` — see the overloads
	 */
	process(input, options) {
		const opts = options || /** @type {TProcessOptions} */ ({});
		const asked = /** @type {{ mode?: PrintOptions["mode"] }} */ (opts).mode;
		// Asked for once per `process` and never per node, which is what lets a
		// language hold its printer back until something actually prints.
		if (
			this._printer === undefined &&
			asked !== undefined &&
			this._loadPrinter
		) {
			this._printer = this._loadPrinter();
		}
		if (this._printer === undefined || asked === undefined) {
			this._run(input, undefined, opts);
			return undefined;
		}
		// Handed over whole rather than copied entry by entry: which entries are
		// print options is the language's to say, and a grammar-only one riding
		// along is inert, since a printer reads only what its own type declares.
		const ctx = new PrintContext(
			/** @type {PrintOptions & TPrintOptions} */ (
				/** @type {typeof opts | (PrintOptions & TPrintOptions)} */ (opts)
			),
			this._printer
		);
		this._run(input, ctx, opts);
		const name = /** @type {{ source?: string, content?: string }} */ (opts);
		const build = () => {
			const code = ctx.result();
			return {
				code,
				// Built only for a caller that named the input: a map walks the whole
				// output, and an inline `style=""` asks for none thousands of times a page.
				map:
					name.source === undefined
						? undefined
						: ctx.sourceMap(
								{ source: name.source, content: name.content },
								code
							)
			};
		};
		if (this._deferred !== null) {
			const finish = this._deferred;

			this._deferred = null;
			finish(ctx, build);
			return undefined;
		}
		return build();
	}

	/**
	 * {@link process}, for a caller whose renderer answers asynchronously. Code
	 * generation is synchronous — a printer returns its node's text, it cannot
	 * await one — so the walk leaves a marker where each answer goes, they are
	 * asked for together, and {@link PrintContext.substitute} stands each in its
	 * place before the output and its map are built. One parse either way, and
	 * the async boundary stays at the top rather than on every node.
	 *
	 * This is the shape `process` itself takes once it is async: how the answers
	 * are waited for is this method's business, so nothing above it changes.
	 * @param {string} input the source
	 * @param {Omit<TProcessOptions, "renderEmbeddedSource"> & RunState<TState> & { mode: PrintOptions["mode"] } & { source?: string, content?: string, renderEmbeddedSource?: (source: string, hole: DeferredEmbeddedSource) => Promise<string | undefined> | string | undefined }} options process options; a print, so `mode` names which one, and naming the input builds a map. `renderEmbeddedSource` is the grammar's own option with a wider answer — it may answer asynchronously, and is handed each {@link DeferredWrite} whole. Absent, this is `process` with a promise around it
	 * @returns {Promise<{ code: string, map: SourceMap | undefined }>} the output and its map
	 */
	async processAsync(input, options) {
		const render = options.renderEmbeddedSource;

		// The cast, twice below: `options` is the grammar's own type with only the
		// renderer's answer widened, which `Omit` cannot say and nothing reads.
		const opts =
			/** @type {TProcessOptions & { mode: PrintOptions["mode"] }} */
			(
				/** @type {typeof options | (TProcessOptions & { mode: PrintOptions["mode"] })} */
				(options)
			);

		if (render === undefined) {
			return /** @type {{ code: string, map: SourceMap | undefined }} */ (
				this.process(input, opts)
			);
		}

		/** @type {DeferredEmbeddedSource[]} */
		const deferred = [];
		const { finish } = this._processDeferred(input, {
			...opts,
			// The grammar collects into this rather than asking, and it takes
			// precedence over a synchronous renderer — which is not passed on.
			renderEmbeddedSource: undefined,
			deferEmbeddedSource: deferred
		});
		// Asked together rather than one after another: they are independent, and
		// a renderer that goes out to a worker pool would otherwise serialize.
		const answers = await Promise.all(
			deferred.map((hole) => render(hole.source, hole))
		);

		if (
			!deferred.some(
				(hole, id) => hole.decides !== undefined && hole.decides(answers[id])
			)
		) {
			return finish((id) => {
				const hole = deferred[id];

				return hole === undefined ? undefined : hole.build(answers[id]);
			});
		}

		// An answer overturned a choice the print made on the source, so it runs
		// again with every answer in hand. Nothing is asked twice: this print offers
		// a subset of the first's, and an offer it alone made is left as written.
		/** @type {Map<string, string | undefined>} */
		const known = new Map();
		for (let id = 0; id < deferred.length; id++) {
			known.set(deferredKey(deferred[id]), answers[id]);
		}
		/**
		 * @param {Omit<DeferredWrite, "build">} offer an offer, `build` and all or without it
		 * @returns {string | undefined} what the first print was answered for it
		 */
		const embeddedAnswers = (offer) => known.get(deferredKey(offer));
		/** @type {DeferredWrite[]} */
		const again = [];
		const reprint = this._processDeferred(input, {
			...opts,
			renderEmbeddedSource: undefined,
			deferEmbeddedSource: again,
			embeddedAnswers
		});
		return reprint.finish((id) => {
			const hole = again[id];

			return hole === undefined ? undefined : hole.build(embeddedAnswers(hole));
		});
	}

	/**
	 * Print `input` holding the deferred writes open: `finish` puts the answers
	 * in their place and only then builds the output and its map, so neither has
	 * to be corrected for what an answer changed in length. The one mechanism
	 * {@link processAsync} is built on, and private for that reason: a caller
	 * asks for an asynchronous print, not for the way one is arranged.
	 * @param {string} input the source
	 * @param {TProcessOptions & RunState<TState> & { mode: PrintOptions["mode"] } & { source?: string, content?: string }} options process options; a print, so `mode` names which one, and naming the input builds a map
	 * @returns {{ finish: (resolve: (id: number) => string | undefined) => { code: string, map: SourceMap | undefined } }} the deferred print
	 */
	_processDeferred(input, options) {
		/** @type {PrintContext<TPath, TNode, TPrintOptions> | undefined} */
		let held;
		/** @type {(() => { code: string, map: SourceMap | undefined }) | undefined} */
		let heldBuild;

		/** @type {NonNullable<typeof this._deferred>} */
		const deferred = (ctx, build) => {
			held = ctx;
			heldBuild = build;
		};

		this._deferred = deferred;

		const infix = chooseDeferredInfix(input);
		// Restored rather than cleared: a nested print runs inside this one's
		// `finish`, and the writes it left are still marked with this infix.
		const outer = deferredInfix;

		deferredInfix = infix;

		try {
			this.process(input, options);
		} finally {
			deferredInfix = outer;
			// A throw never reaches where `process` clears this, and the next print
			// on this processor would take it for its own. Only ours: a nested print
			// during the walk may have left a newer one.
			if (this._deferred === deferred) this._deferred = null;
		}

		return {
			finish: (resolve) => {
				/** @type {PrintContext<TPath, TNode, TPrintOptions>} */
				(held).substitute(resolve, infix);
				return /** @type {() => { code: string, map: SourceMap | undefined }} */ (
					heldBuild
				)();
			}
		};
	}
}

SourceProcessor.PrintContext = PrintContext;

module.exports = SourceProcessor;
module.exports.declineDeferredWrites = declineDeferredWrites;
module.exports.deferredWrite = deferredWrite;
module.exports.EditContext = EditContext;
