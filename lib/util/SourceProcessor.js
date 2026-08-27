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
 * Babel-style visitor map keyed by a numeric node-type discriminator; a bucket
 * is a function (enter-only) or `{ enter?, exit? }`.
 *
 * A visitor receives a single `path` argument (the Babel `path` shape): the
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
 * One write the print left a marker for, collected into the `deferEmbeddedSource`
 * print option by whichever grammar offered it — the other half of
 * {@link deferredWrite}. `source` is the text offered and `build` spells what is
 * printed around the answer, an untapped run's spelling where there is none. A
 * grammar carries whatever else describes the offer (`type`, `hostType`, `as`,
 * …) on the same object.
 * @typedef {{ source: string, build: (answer: string | undefined) => string }} DeferredWrite
 */
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

// Base64 VLQ, the source-map `mappings` encoding. Hand-rolled so producing a map
// pulls in no dependency (`source-map` is not a webpack dep).
const _B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * @param {number} n a signed integer
 * @returns {string} its Base64 VLQ encoding
 */
const _vlq = (n) => {
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
		// handles are dense integers, and a stylesheet prints ~300k nodes through
		// a store that never holds more than a few dozen of them at once.
		/** @type {string[]} each finished node's printed text */
		this._storeText = [];
		/** @type {Int32Array} the epoch each slot was written in */
		this._storeGen = new Int32Array(0);
		/** @type {number} current epoch; a slot from an older one reads as absent */
		this._gen = 1;
		// Output accumulates into `_tail`, a plain string append, so printing that
		// never takes anything back costs exactly what appending to one string
		// costs. A piece is cut off into `_chunks` only for text that may still be
		// taken back ({@link emitRetractable}) — that is what lets a printer emit
		// before it knows a later sibling overrides it, without every other emit
		// paying for the ability. The output is `_chunks` joined, then `_tail`.
		/** @type {string[]} pieces already cut off, in output order */
		this._chunks = [];
		/** @type {string} output after the last cut piece */
		this._tail = "";
		/** @type {number} characters in `_tail`, so its length is not read off a rope */
		this._tailLength = 0;
		/** @type {number} scratch for the flattening read in {@link _cutTail} */
		this._flattened = 0;
		/** @type {[number, number, number, number][]} `[chunkIndex, offsetInChunk, srcLine, srcCol]`, output-ordered; a `srcLine` of -1 is one {@link retract} took back with its piece */
		this._mappings = [];
		/** @type {Map<number, number> | null} a retractable piece -> the mapping anchored to it, so taking the piece back takes its mapping too */
		this._retractableMappings = null;
		// A map is built only for a caller that named the input, and that is known
		// before printing — so a print nobody asks a map of collects none.
		/** @type {boolean} whether {@link sourceMap} can still be asked for one */
		this.mapWanted =
			/** @type {{ source?: string }} */ (options).source !== undefined;
		/** @type {[number, string][]} source-anchored literals to keep (comments), source-ordered */
		this._inserts = [];
		/** @type {number} next `_inserts` entry not yet flushed */
		this._insertIdx = 0;
		// Openers of the nodes being printed in pieces, innermost last, held back
		// until one of them turns out to have content: a node whose children all
		// print to nothing can then still be dropped whole, which is the one thing
		// emitting an opener eagerly would give up.
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
	 * Widen both columns to hold `need` handles, keeping what they already hold.
	 * @param {number} need required capacity
	 */
	_growStore(need) {
		// From empty: a context that prints one inline `style=""` must not pay for
		// a stylesheet's worth of columns.
		const size = Math.max(need, this._storeText.length * 2, 16);
		// Appended, which keeps the column packed for the read every composed child
		// makes, and carries what it already holds across in the same pass.
		const held = this._storeText;
		const text = [];
		for (let i = 0; i < held.length; i++) text.push(held[i]);
		for (let i = held.length; i < size; i++) text.push("");
		const gen = new Int32Array(size);
		gen.set(this._storeGen);
		this._storeText = text;
		this._storeGen = gen;
	}

	/**
	 * Forget every node's printed text. A node printed in pieces does this once
	 * each child is emitted, so the store never holds more than one of them —
	 * which is also what keeps a recycled node id from reading as an earlier
	 * node's text.
	 */
	dropStore() {
		// Bumping the epoch invalidates every slot at once, so this stays O(1) —
		// it runs per node, and clearing a column by length would not.
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
	 * Run the node printer for `node` and store what it returns (the grammar calls
	 * this once the node's visitors and children are done). `path` is on `node`.
	 * @param {TNode} node the finished node
	 * @param {TPath} path the language accessor, positioned on `node`
	 */
	printNode(node, path) {
		const text = this._printer(path, this);
		const n = /** @type {EXPECTED_ANY} */ (node);
		if (n >= this._storeText.length) this._growStore(n + 1);
		this._storeText[n] = text;
		this._storeGen[n] = this._gen;
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
		const n = /** @type {EXPECTED_ANY} */ (node);
		return /** @type {string} */ (
			this._storeGen[n] === this._gen ? this._storeText[n] : undefined
		);
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
		// A printer returns its text as a rope of its children's pieces, and
		// appending a rope onto a rope keeps every fragment of every node reachable
		// until the output is finally flattened — on a stylesheet of many top-level
		// rules, a second copy of the whole output. So cut the tail off once it has
		// grown past a block and force that block flat, which drops every fragment
		// behind it. Per block rather than per piece: the flattening copy is one
		// the result would have paid for anyway, but paying it per piece means an
		// allocation for each, and the pieces are small.
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
		this._chunks[index] = "";
		if (this._retractableMappings === null) return;
		const mapping = this._retractableMappings.get(index);
		if (mapping !== undefined) this._mappings[mapping][2] = -1;
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
		this._chunks[index] = text;
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
		this._gen++;
		if (mapping !== -1) {
			if (this._retractableMappings === null) {
				this._retractableMappings = new Map();
			}
			this._retractableMappings.set(at, mapping);
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
		this._gen++;
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
			this._mappings.push([
				this._chunks.length,
				this._tailLength,
				srcLine,
				/** @type {number} */ (srcCol)
			]);
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
	 * @returns {SourceMap} the input->output source map
	 */
	sourceMap(options) {
		let out = "";
		let genLine = 0;
		let genCol = 0;
		let srcLine = 0;
		let srcCol = 0;
		let atLineStart = true;
		// Where each anchor landed, walked once alongside the mappings — both are
		// in output order, so this is one pass over the output, not a position
		// recomputed per mapping. An anchor can sit inside a piece rather than at
		// its start, since output accumulates into the piece it is appending to.
		const chunks = this._chunks;
		const tail = this._tail;
		/**
		 * @param {number} i piece index, `chunks.length` being the tail
		 * @returns {string} that piece
		 */
		const pieceAt = (i) => (i === chunks.length ? tail : chunks[i]);
		let atChunk = 0;
		let atOffset = 0;
		let atLine = 0;
		let atCol = 0;
		// Offset of the next newline at or after the cursor, `-1` for none left in
		// this piece. Carried rather than searched for per mapping: `indexOf` has no
		// end bound, so asking it again for each of a piece's mappings scans again to
		// the end of the piece every time — and minified output, the case with no
		// newlines at all, is the one where that is the whole piece.
		let nextNewline = pieceAt(0).indexOf("\n");
		/**
		 * @param {string} text the piece to walk
		 * @param {number} to offset to walk to
		 */
		const advanceOver = (text, to) => {
			while (nextNewline !== -1 && nextNewline < to) {
				atLine++;
				atCol = 0;
				atOffset = nextNewline + 1;
				nextNewline = text.indexOf("\n", atOffset);
			}
			atCol += to - atOffset;
			atOffset = to;
		};
		/**
		 * @param {number} chunk piece index to advance to
		 * @param {number} offset offset within it
		 */
		const advanceTo = (chunk, offset) => {
			while (atChunk < chunk) {
				const text = pieceAt(atChunk);
				advanceOver(text, text.length);
				atChunk++;
				atOffset = 0;
				nextNewline = pieceAt(atChunk).indexOf("\n");
			}
			if (offset > atOffset) advanceOver(pieceAt(atChunk), offset);
		};
		for (const [chunkIndex, chunkOffset, sl, sc] of this._mappings) {
			// Its piece was taken back, so there is no output left to anchor.
			if (sl === -1) continue;
			advanceTo(chunkIndex, chunkOffset);
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
		const chunks = this._chunks;
		const mappings = this._mappings;
		// Both pieces and mappings are output-ordered, so one cursor walks them
		// together rather than searching the mappings per piece.
		let at = 0;
		for (let i = 0; i <= chunks.length; i++) {
			const text = i === chunks.length ? this._tail : chunks[i];
			while (at < mappings.length && mappings[at][0] < i) at++;
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
			for (let k = at; k < mappings.length && mappings[k][0] === i; k++) {
				while (s < shifts.length && shifts[s][0] <= mappings[k][1]) s++;
				if (s !== 0) mappings[k][1] += shifts[s - 1][1];
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
		// Trailing kept comments (after the last top-level node) flush here.
		if (this._insertIdx < this._inserts.length) this._flushBefore(Infinity);
		// Nothing was ever cut into its own piece, so there is nothing to join.
		const chunks = this._chunks;
		return chunks.length === 0 ? this._tail : chunks.join("") + this._tail;
	}
}

/**
 * Visitor coordinator: owns the visitor registry and drives a language
 * `grammar` over the source. Language-agnostic — each syntax (CSS, HTML, …)
 * binds its own grammar, node-type enum and (optionally) node printer.
 * Babel-style usage:
 *
 * ```
 * processor.use({ [NodeType.X]: (path) => {}, [NodeType.Y]: { enter, exit } });
 * processor.process(source);
 * ```
 * @template TPath
 * @template TNode
 * @template [TProcessOptions=object]
 * @template [TPrintOptions=object]
 */
class SourceProcessor {
	/**
	 * @param {Grammar<TPath, TNode, TProcessOptions, TPrintOptions>} grammar the grammar to drive over the source
	 * @param {NodePrinter<TPath, TNode, TPrintOptions>=} printer the node printer, fired per node once its visitors and children are done; the same `path` a visitor gets plus the print context as its writer. Required to print (e.g. `mode`); a future API can let a developer supply their own
	 */
	constructor(grammar, printer) {
		/** @type {Grammar<TPath, TNode, TProcessOptions, TPrintOptions>} */
		this._grammar = grammar;
		/** @type {CompiledVisitorMap<TPath>} */
		this._visitors = [];
		/** @type {NodePrinter<TPath, TNode, TPrintOptions> | undefined} */
		this._printer = printer;
		// Set for the one print {@link processDeferred} holds open, so `process`
		// hands it the context instead of building the output straight away.
		/** @type {((ctx: PrintContext<TPath, TNode, TPrintOptions>, build: () => { code: string, map: SourceMap | undefined }) => void) | null} */
		this._deferred = null;
	}

	/**
	 * Register a Babel-style visitor map; calls accumulate per node type.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @param {VisitorMap<TPath>} map visitor map keyed by node type
	 * @returns {SourceProcessor<TPath, TNode, TProcessOptions, TPrintOptions>} `this`, for chaining
	 */
	use(map) {
		// `map`'s keys are node-type enum members; `Object.keys` stringifies them,
		// so index the compiled array by the number to match the numeric `node.type`.
		for (const type of Object.keys(map)) {
			const key = Number(type);
			const v = map[key];
			let bucket = this._visitors[key];
			if (!bucket) {
				bucket = { enter: [], exit: [] };
				this._visitors[key] = bucket;
			}
			if (typeof v === "function") {
				bucket.enter.push(v);
			} else {
				if (v.enter) bucket.enter.push(v.enter);
				if (v.exit) bucket.exit.push(v.exit);
			}
		}
		return this;
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
	 * @param {TProcessOptions & { mode: PrintOptions["mode"] } & { source: string, content?: string }} options process options, naming the input so a map is built
	 * @returns {{ code: string, map: SourceMap }} the output and its map
	 */
	/**
	 * @overload
	 * @param {string} input the source
	 * @param {TProcessOptions & { mode: PrintOptions["mode"] }} options process options, asking for output but no map
	 * @returns {{ code: string, map: undefined }} the output alone
	 */
	/**
	 * @overload
	 * @param {string} input the source
	 * @param {TProcessOptions=} options process options, asking for no output
	 * @returns {undefined} nothing — the walk alone
	 */
	/**
	 * @param {string} input source text
	 * @param {TProcessOptions=} options grammar-specific options (`skip`, …) plus `mode` and, for the map, `source` / `content`
	 * @returns {EXPECTED_ANY} `{ code, map }` when printing, else `undefined` — see the overloads
	 */
	process(input, options) {
		const opts = options || /** @type {TProcessOptions} */ ({});
		const asked = /** @type {{ mode?: PrintOptions["mode"] }} */ (opts).mode;
		if (this._printer === undefined || asked === undefined) {
			this._grammar(input, this._visitors, undefined, opts);
			return undefined;
		}
		// Handed over whole rather than copied entry by entry: which of them are
		// print options is the language's to say, and listing them here is what
		// made every new one an edit to this file. A grammar-only entry riding
		// along is inert — a printer reads only what its own type declares.
		const ctx = new PrintContext(
			/** @type {PrintOptions & TPrintOptions} */ (
				/** @type {unknown} */ ({ ...opts, mode: asked })
			),
			/** @type {NodePrinter<TPath, TNode, TPrintOptions>} */ (this._printer)
		);
		this._grammar(input, this._visitors, ctx, opts);
		const name = /** @type {{ source?: string, content?: string }} */ (opts);
		const build = () => ({
			code: ctx.result(),
			// Built only for a caller that named the input: building one walks the
			// whole output for its line breaks, and the minifier prints an inline
			// `style=""` — which asks for no map — thousands of times a document.
			map:
				name.source === undefined
					? undefined
					: ctx.sourceMap({ source: name.source, content: name.content })
		});
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
	 * @param {Omit<TProcessOptions, "renderEmbeddedSource"> & { mode: PrintOptions["mode"] } & { source?: string, content?: string, renderEmbeddedSource?: (source: string, hole: EXPECTED_ANY) => Promise<string | undefined> | string | undefined }} options process options; a print, so `mode` names which one, and naming the input builds a map. `renderEmbeddedSource` is the grammar's own option with a wider answer — it may answer asynchronously, and is handed each {@link DeferredWrite} whole. Absent, this is `process` with a promise around it
	 * @returns {Promise<{ code: string, map: SourceMap | undefined }>} the output and its map
	 */
	async processAsync(input, options) {
		const render = options.renderEmbeddedSource;

		// The cast, twice below: `options` is the grammar's own type with only the
		// renderer's answer widened, which `Omit` cannot say and nothing reads.
		const opts =
			/** @type {TProcessOptions & { mode: PrintOptions["mode"] }} */
			(/** @type {unknown} */ (options));

		if (render === undefined) {
			return /** @type {{ code: string, map: SourceMap | undefined }} */ (
				this.process(input, opts)
			);
		}

		/** @type {DeferredWrite[]} */
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

		return finish((id) => {
			const hole = deferred[id];

			return hole === undefined ? undefined : hole.build(answers[id]);
		});
	}

	/**
	 * Print `input` holding the deferred writes open: `finish` puts the answers
	 * in their place and only then builds the output and its map, so neither has
	 * to be corrected for what an answer changed in length. The one mechanism
	 * {@link processAsync} is built on, and private for that reason: a caller
	 * asks for an asynchronous print, not for the way one is arranged.
	 * @param {string} input the source
	 * @param {TProcessOptions & { mode: PrintOptions["mode"] } & { source?: string, content?: string }} options process options; a print, so `mode` names which one, and naming the input builds a map
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
module.exports.deferredWrite = deferredWrite;
