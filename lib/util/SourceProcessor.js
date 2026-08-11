/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

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
 * The print options a {@link PrintContext} carries, read by the node printer via
 * `writer.options` (e.g. `writer.options.mode`). More entries slot in here as
 * print options grow. `environment` is what the target can read (the language's
 * slice of `output.environment`), keyed by feature name, so a printer never
 * reaches for a spelling the target would not understand.
 * @typedef {{ mode: "minify" | "beautify", environment?: Readonly<Record<string, boolean>>, convertLengthUnits?: boolean, collapseWhitespace?: boolean, dropOverriddenDeclarations?: boolean }} PrintOptions
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
 * @typedef {(path: TPath, writer: PrintContext<TPath, TNode>) => string} NodePrinter
 */
/**
 * A language grammar: parse `input` once and fire the compiled visitors in
 * source order. When `writer` is given it is also printing — after each node's
 * visitors have run and its children are printed, the grammar fires the node
 * printer into `writer`; a single parse with no re-tokenizing.
 * @template TPath
 * @template TNode
 * @template TProcessOptions
 * @typedef {(input: string, visitors: CompiledVisitorMap<TPath>, writer: PrintContext<TPath, TNode> | undefined, options: TProcessOptions) => void} Grammar
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
 */
class PrintContext {
	/**
	 * @param {PrintOptions} options the print options
	 * @param {NodePrinter<TPath, TNode>} printer the node printer
	 */
	constructor(options, printer) {
		/** @type {PrintOptions} */
		this.options = options;
		/** @type {NodePrinter<TPath, TNode>} */
		this._printer = printer;
		/** @type {Map<TNode, string>} printed text of each finished node */
		this._store = new Map();
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
		/** @type {[number, number, number, number][]} `[chunkIndex, offsetInChunk, srcLine, srcCol]`, output-ordered */
		this._mappings = [];
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
	 * Forget every node's printed text. A node printed in pieces does this once
	 * each child is emitted, so the store never holds more than one of them —
	 * which is also what keeps a recycled node id from reading as an earlier
	 * node's text.
	 */
	dropStore() {
		this._store.clear();
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
		this._store.set(node, this._printer(path, this));
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
		return /** @type {string} */ (this._store.get(node));
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
	 * later one overrides it. Pieces after it keep their place, so this must not
	 * be used on a piece something was anchored to (see {@link take}).
	 * @param {number} index the piece's index, from {@link emitRetractable}
	 */
	retract(index) {
		this._chunks[index] = "";
	}

	/**
	 * Emit one finished top-level node: first any kept comments that precede it,
	 * then a source mapping anchoring its output start to `[srcLine, srcCol]`, then
	 * its text — and drop the per-node store so the next top-level node starts
	 * clean. `srcOffset` / `srcLine` / `srcCol` are the node's source position; a
	 * grammar that doesn't map positions (e.g. HTML) omits them (no comments, no
	 * mapping — the map ends up empty).
	 * @param {TNode} node the top-level node
	 * @param {number=} srcOffset the node's source offset (kept-comment flush boundary)
	 * @param {number=} srcLine 0-based source line of the node's start
	 * @param {number=} srcCol 0-based source column of the node's start
	 * @param {string=} text what to emit instead of the node's own printed text,
	 * for a printer that folded a later node into this one
	 */
	take(node, srcOffset, srcLine, srcCol, text) {
		this.anchor(srcOffset, srcLine, srcCol);
		this._emit(text === undefined ? this.get(node) : text);
		this._store.clear();
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
		if (srcLine !== undefined) {
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
	 * @returns {string} the printed output
	 */
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
 */
class SourceProcessor {
	/**
	 * @param {Grammar<TPath, TNode, TProcessOptions>} grammar the grammar to drive over the source
	 * @param {NodePrinter<TPath, TNode>=} printer the node printer, fired per node once its visitors and children are done; the same `path` a visitor gets plus the print context as its writer. Required to print (e.g. `minimize`); a future API can let a developer supply their own
	 */
	constructor(grammar, printer) {
		/** @type {Grammar<TPath, TNode, TProcessOptions>} */
		this._grammar = grammar;
		/** @type {CompiledVisitorMap<TPath>} */
		this._visitors = [];
		/** @type {NodePrinter<TPath, TNode> | undefined} */
		this._printer = printer;
	}

	/**
	 * Register a Babel-style visitor map; calls accumulate per node type.
	 * A bucket is a function (= `{ enter }`) or `{ enter?, exit? }`.
	 * @param {VisitorMap<TPath>} map visitor map keyed by node type
	 * @returns {SourceProcessor<TPath, TNode, TProcessOptions>} `this`, for chaining
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
	 * — `mode`, or `minimize: true` for the `"minify"` it is shorthand for — makes
	 * the same walk print, given a printer supplied at construction: a
	 * {@link PrintContext} is created, each node's printer fires into it as the node
	 * finishes, and the result is returned as `{ code, map }`: the serialized output
	 * and its input->output source map, always, independent of the pipeline's own
	 * source-map setting (`source` / `content` name the map's input). Asking for
	 * none of it only walks and returns `undefined`. A single parse — printing
	 * never re-parses; all configuration is per-call.
	 * @overload
	 * @param {string} input
	 * @param {TProcessOptions & ({ minimize: true } | { mode: PrintOptions["mode"] }) & { source?: string, content?: string }} options
	 * @returns {{ code: string, map: SourceMap }}
	 */
	/**
	 * @overload
	 * @param {string} input
	 * @param {TProcessOptions=} options
	 * @returns {undefined}
	 */
	/**
	 * @param {string} input source text
	 * @param {TProcessOptions=} options grammar-specific options (`skip`, …) plus `mode` / `minimize` and, for the map, `source` / `content`
	 * @returns {EXPECTED_ANY} `{ code, map }` when printing, else `undefined` — see the overloads
	 */
	process(input, options) {
		const opts = options || /** @type {TProcessOptions} */ ({});
		const printOpts =
			/** @type {{ mode?: PrintOptions["mode"], minimize?: boolean, environment?: Readonly<Record<string, boolean>>, convertLengthUnits?: boolean, collapseWhitespace?: boolean, dropOverriddenDeclarations?: boolean }} */ (
				opts
			);
		// `minimize: true` is the shorthand `optimization.minimize` reads as, so it
		// names the mode it asks for rather than a second way to switch printing on.
		const asked =
			printOpts.mode || (printOpts.minimize === true ? "minify" : undefined);
		if (this._printer === undefined || asked === undefined) {
			this._grammar(input, this._visitors, undefined, opts);
			return undefined;
		}
		const ctx = new PrintContext(
			{
				mode: asked,
				environment: printOpts.environment,
				convertLengthUnits: printOpts.convertLengthUnits,
				collapseWhitespace: printOpts.collapseWhitespace,
				dropOverriddenDeclarations: printOpts.dropOverriddenDeclarations
			},
			/** @type {NodePrinter<TPath, TNode>} */ (this._printer)
		);
		this._grammar(input, this._visitors, ctx, opts);
		const name = /** @type {{ source?: string, content?: string }} */ (opts);
		return {
			code: ctx.result(),
			map: ctx.sourceMap({ source: name.source || "", content: name.content })
		};
	}
}

module.exports = SourceProcessor;
module.exports.PrintContext = PrintContext;
