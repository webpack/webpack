/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// The relations every syntax's parser and printer are held to with no other
// tool to compare against: idempotence, spans, slices, purity and cut inputs.
// The unit tests and the comparison sweeps both read them from here.

const { createHash } = require("crypto");

/**
 * @param {EXPECTED_ANY} error what a tool threw, which can be any value
 * @returns {string} the first line of what it says
 */
const thrownText = (error) => {
	const said =
		error && /** @type {Error} */ (error).message
			? /** @type {Error} */ (error).message
			: error;
	return String(said).split("\n", 1)[0];
};


/**
 * A finding: which relation broke, what it did, and the smallest input found
 * that shows it.
 * @typedef {{ relation: string, what: string, repro: string }} Report
 */

/**
 * @param {number} delta a byte difference
 * @returns {string} it signed
 */
const signed = (delta) => `${delta > 0 ? "+" : ""}${delta} B`;

/**
 * @param {string} text any text
 * @param {number} limit how much of it to keep
 * @returns {string} it on one line, cut to the limit
 */
const oneLine = (text, limit) => {
	let shown = "";
	for (const character of text) {
		const code = /** @type {number} */ (character.codePointAt(0));
		// Tab, LF, FF and CR are left to the whitespace collapse below; every
		// other control character is shown, since holding one is some findings.
		shown +=
			code > 0x1f ||
			code === 0x9 ||
			code === 0xa ||
			code === 0xc ||
			code === 0xd
				? character
				: `\\x${code.toString(16).padStart(2, "0")}`;
	}
	const flat = shown.replace(/\s+/g, " ").trim();
	return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
};

/**
 * @param {string} before one text
 * @param {string} after another
 * @returns {number} the first index they differ at
 */
const firstDifference = (before, after) => {
	const shortest = Math.min(before.length, after.length);
	for (let i = 0; i < shortest; i++) {
		if (before.charCodeAt(i) !== after.charCodeAt(i)) return i;
	}
	return shortest;
};


// Each bisection step prints the whole source twice, so a page carrying
// thousands of sites stops shrinking rather than holding up the report.
const SHRINK_BUDGET = 40;

/**
 * Bisect a finding down to the sites that carry it. Where neither half keeps it
 * the sites interact, and what is left stands as the report's repro.
 * @template S
 * @template {{ kind: string }} F
 * @param {(sites: S[]) => F | null} holds whether a subset still shows it
 * @param {S[]} sites every mutated site
 * @param {string} kind the kind to keep
 * @returns {S[]} the smallest subset found
 */
const shrink = (holds, sites, kind) => {
	let current = sites;
	let budget = SHRINK_BUDGET;
	while (current.length > 1 && budget > 0) {
		const half = Math.ceil(current.length / 2);
		const left = current.slice(0, half);
		const right = current.slice(half);
		budget -= 2;
		const keptLeft = holds(left);
		if (keptLeft !== null && keptLeft.kind === kind) {
			current = left;
			continue;
		}
		const keptRight = holds(right);
		if (keptRight !== null && keptRight.kind === kind) {
			current = right;
			continue;
		}
		break;
	}
	return current;
};

/**
 * Whether printing an already-printed source changes it. A printer that is done
 * is done, so a second pass that moves is work every build repeats.
 * @param {object} options what to hold to the relation
 * @param {(source: string) => string} options.minify the printer under test
 * @param {((printed: string) => string)=} options.reprint how its output is printed again, where a second minify would change it rather than print it
 * @param {string} options.source the input
 * @param {(text: string) => string} options.says what a text says, as a digest
 * @param {((printed: string, at: number) => { source: string, again: string } | null)=} options.repro cuts the difference down to what reproduces it
 * @returns {{ printed: string | null, reports: Report[] }} what it printed, and what moved
 */
const idempotence = ({ minify, reprint = minify, source, says, repro }) => {
	/** @type {string} */
	let printed;
	try {
		printed = minify(source);
	} catch (error) {
		return {
			printed: null,
			reports: [
				{ relation: "minify", what: "threw", repro: `    ${thrownText(error)}` }
			]
		};
	}
	/** @type {string} */
	let again;
	try {
		again = reprint(printed);
	} catch (error) {
		// A printer that reads its own output back and throws is the strongest
		// finding there is, so it is reported rather than ending the sweep.
		return {
			printed,
			reports: [
				{
					relation: "idempotence",
					what: "threw",
					repro: `    ${thrownText(error)}`
				}
			]
		};
	}
	if (again === printed) return { printed, reports: [] };
	const kind = says(again) === says(printed) ? "bytes" : "differs";
	const at = firstDifference(printed, again);
	const cut = repro === undefined ? null : repro(printed, at);
	return {
		printed,
		reports: [
			{
				relation: "idempotence",
				what: `${kind}, ${signed(again.length - printed.length)}`,
				repro:
					cut === null
						? `    ${oneLine(printed.slice(at, at + 70), 70)}\n      -> ${oneLine(again.slice(at, at + 70), 70)}`
						: `    ${oneLine(cut.source, 80)}\n      -> ${oneLine(cut.again, 80)}`
			}
		]
	};
};

/**
 * The range a node sits in, as a span check reads it.
 * @typedef {{ what: string, start: number, end: number }} SpanParent
 */

/**
 * A node a span check reads. `after` is the furthest any earlier sibling
 * reached, or `-1` for the first; `inner` names the sub-ranges the node states
 * itself, each `-1` where this node has none. `structural` is false for a node
 * the walk hands over without placing it in the tree — a CSS comment arrives
 * from the tokenizer, before the rule holding it has even opened — so it is
 * held to its own offsets and to nothing about where it sits.
 * @typedef {{ what: string, start: number, end: number, parent: SpanParent | null, after: number, structural?: boolean, inner?: readonly [string, number, number][] }} SpanNode
 */

/**
 * Offsets read against an origin, so one construct's finding reads the same
 * wherever in a file it was found and groups with itself.
 * @param {number} origin what to measure from
 * @param {number} start a range's start
 * @param {number} end its end
 * @returns {string} the range relative to the origin
 */
const _relative = (origin, start, end) => `[${start - origin},${end - origin})`;

/**
 * Whether a tree's ranges say what the source says: nothing inverted, nothing
 * off the end of the source, and every sub-range inside the node that names it.
 * `contains` and `siblings` are asked for rather than assumed, because two of
 * webpack's three parsers owe one of them nothing — each adapter says which.
 * @param {object} options what to hold to the relation
 * @param {number} options.length the source's length
 * @param {(visit: (node: SpanNode) => void) => void} options.walk hands every node over, each after its parent
 * @param {boolean} options.contains whether a node's range must sit inside its parent's
 * @param {boolean} options.siblings whether two siblings' ranges may not overlap
 * @param {((start: number, end: number) => boolean)=} options.shared whether two siblings may both read this range, which one piece of source built them from
 * @returns {Report[]} what the ranges broke
 */
const spans = ({ length, walk, contains, siblings, shared }) => {
	/** @type {Report[]} */
	const reports = [];
	/**
	 * @param {string} what the violation and what carried it
	 * @param {string} detail the ranges that show it
	 * @returns {void}
	 */
	const report = (what, detail) => {
		reports.push({ relation: "spans", what, repro: `    ${detail}` });
	};
	walk((node) => {
		const { what, start, end, parent, after, structural, inner } = node;
		if (start > end) report(`inverted (${what})`, `[${start},${end})`);
		if (start < 0) report(`starts before the source (${what})`, `${start}`);
		if (end > length) {
			report(`ends past the source (${what})`, `${end - length} past the end`);
		}
		const placed = structural !== false;
		if (
			placed &&
			contains &&
			parent !== null &&
			(start < parent.start || end > parent.end)
		) {
			report(
				`escapes parent (${what} in ${parent.what})`,
				`${_relative(parent.start, start, end)} not inside ${_relative(parent.start, parent.start, parent.end)}`
			);
		}
		if (
			placed &&
			siblings &&
			after !== -1 &&
			start < after &&
			(shared === undefined || !shared(start, Math.min(after, end)))
		) {
			report(
				`overlaps an earlier sibling (${what})`,
				`${_relative(start, start, end)} starts ${after - start} before that sibling ended`
			);
		}
		if (inner === undefined) return;
		for (const [name, innerStart, innerEnd] of inner) {
			// `-1` is the node saying it has no such sub-range, which is not a
			// range that fails to sit inside it.
			if (innerStart === -1) continue;
			if (innerStart > innerEnd || innerStart < start || innerEnd > end) {
				report(
					`${name} outside its node (${what})`,
					`${_relative(start, innerStart, innerEnd)} not inside ${_relative(start, start, end)}`
				);
			}
		}
	});
	return reports;
};

/**
 * Turn a walk over one of webpack's accessor-based parsers into span nodes.
 *
 * WHY: neither a node's own range nor a ref to it is final while the walk is
 * inside it. Both parsers stream — an `@layer` rule is entered holding only its
 * six-byte prelude and has its end set once the body is read — and both recycle
 * refs per top-level node, so a range read on the way in, or read back through
 * a retained ref, is whatever was known at the time. Every range is therefore
 * read on the way out, and a node is held to its parent when the parent leaves,
 * which is the first moment both are settled.
 * @template P
 * @param {object} options how to drive that parser
 * @param {number} options.length the source's length
 * @param {(enter: (path: P) => void, exit: (path: P) => void) => void} options.run registers the pair for every node type and runs the walk
 * @param {(path: P) => string} options.name what to call the current node in a report
 * @param {(path: P) => readonly [string, number, number][] | undefined} options.inner the sub-ranges the current node states
 * @param {(path: P) => number} options.start the current node's start
 * @param {(path: P) => number} options.end its end
 * @param {((path: P) => boolean)=} options.structural whether the walk places this node in the tree (default: every node)
 * @returns {(visit: (node: SpanNode) => void) => void} the walk `spans` reads
 */
const pathSpanWalk =
	({ length, run, name, inner, start, end, structural = () => true }) =>
	(visit) => {
		/**
		 * @typedef {object} SpanFrame
		 * @property {string} what what to call it
		 * @property {number} start its start, once it has left
		 * @property {number} end its end, once it has left
		 * @property {readonly [string, number, number][] | undefined} inner its sub-ranges
		 * @property {boolean} placed whether the walk put it where it belongs
		 * @property {SpanFrame[]} children what it held, each settled
		 */
		/** @type {SpanFrame} */
		const root = {
			what: "source",
			start: 0,
			end: length,
			inner: undefined,
			placed: true,
			children: []
		};
		/** @type {SpanFrame[]} */
		const stack = [root];
		/**
		 * Hand one settled node's children over, each against the node and against
		 * how far the ones before it reached.
		 * @param {SpanFrame} frame the node they sat in
		 * @returns {void}
		 */
		const emit = (frame) => {
			let reached = -1;
			// WHY: source order, not visit order — CSS consumes a block into
			// separate declaration and child-rule lists (§5.4.2), so a rule written
			// between two declarations is walked after both. What is owed is that
			// two siblings' ranges do not overlap, never the order they arrive in.
			frame.children.sort((a, b) => a.start - b.start || a.end - b.end);
			for (const child of frame.children) {
				visit({
					what: child.what,
					start: child.start,
					end: child.end,
					parent: { what: frame.what, start: frame.start, end: frame.end },
					after: reached,
					structural: child.placed,
					inner: child.inner
				});
				// A node the walk never placed says nothing about how far its
				// siblings reach, so it does not move the mark either.
				if (child.placed) reached = Math.max(reached, child.end);
			}
			// Held no longer than they are read: a document is one walk, and keeping
			// every node's children would retain the whole tree a second time.
			frame.children.length = 0;
		};
		run(
			(path) => {
				stack.push({
					what: name(path),
					start: 0,
					end: 0,
					inner: undefined,
					placed: true,
					children: []
				});
			},
			(path) => {
				// A walk that exits more than it entered would pop the root and read
				// every node after it against nothing.
				if (stack.length === 1) return;
				const frame = /** @type {SpanFrame} */ (stack.pop());
				frame.start = start(path);
				frame.end = end(path);
				frame.inner = inner(path);
				frame.placed = structural(path);
				stack[stack.length - 1].children.push(frame);
				emit(frame);
			}
		);
		emit(root);
	};

/**
 * One node to hold to its own source. `said` is the subtree digested as it
 * stands, which has to be read while the tree it came from is still current;
 * `reparse` digests what the node's own bytes parse to on their own, and
 * answers null where the parser will not take them out of context.
 * @typedef {{ what: string, said: string, reparse: () => string | null }} SliceCandidate
 */

/**
 * Whether a node's own source says what the node does: the bytes between its
 * offsets, parsed on their own, give that node back.
 *
 * WHY: the candidates are collected before any of them is reparsed, and each
 * carries its digest rather than a way to compute one. Every parser here keeps
 * one set of node columns, so a reparse in the middle of a walk pulls the tree
 * out from under it — it crashed in `_walkRule` rather than reporting anything.
 *
 * A node the parser refuses out of context is skipped rather than reported:
 * `await x` outside an async function, a `<td>` outside its table. What each
 * language can normalize it does first — HTML reparses in the node's own
 * insertion mode, handing its parent to the fragment parsing algorithm — so
 * what is skipped is what no context would settle.
 * @param {Iterable<SliceCandidate>} candidates every node worth slicing, already digested
 * @returns {{ reports: Report[], read: number, skipped: number }} what broke, and how many answered
 */
const sliceRelation = (candidates) => {
	/** @type {Report[]} */
	const reports = [];
	let read = 0;
	let skipped = 0;
	for (const candidate of candidates) {
		const again = candidate.reparse();
		if (again === null) {
			skipped++;
			continue;
		}
		read++;
		if (again === candidate.said) continue;
		reports.push({
			relation: "slices",
			what: `parses to something else on its own (${candidate.what})`,
			repro: `    ${candidate.said}\n      -> ${again}`
		});
	}
	return { reports, read, skipped };
};

/**
 * An incremental digest, so a source's whole tree never has to be held as one
 * string to be compared with another run of it.
 * @returns {{ update: (text: string) => void, hex: () => string }} the digest
 */
const hasher = () => {
	const hash = createHash("sha256");
	return {
		update: (text) => {
			hash.update(text);
		},
		hex: () => hash.digest("hex")
	};
};

/**
 * One source to parse more than once. `digest` has to carry what the parse
 * derived and not only where it read — an interned name or a cached word is
 * exactly what a second parse can get wrong while every offset stays right.
 * @typedef {{ what: string, digest: () => string }} PuritySource
 */

/**
 * Whether a parser carries nothing from one source into the next: reading the
 * same bytes again gives the same answer.
 *
 * Every source is read once before any is read a second time, so what sits
 * between a source's two readings is every other source — which is the shape a
 * build has, and the one a cache keyed on the last input gets wrong. A source
 * that disagrees is read a third time back to back, which says which of the two
 * it is: state another parse left, or a parse that is not even repeatable.
 * @param {readonly PuritySource[]} sources every source, each read twice
 * @returns {{ reports: Report[], read: number }} what disagreed, and how many were read
 */
const purityRelation = (sources) => {
	const first = sources.map((source) => source.digest());
	/** @type {Report[]} */
	const reports = [];
	for (let index = 0; index < sources.length; index++) {
		const again = sources[index].digest();
		if (again === first[index]) continue;
		const third = sources[index].digest();
		reports.push({
			relation: "purity",
			what:
				third === again
					? "reads differently once something else has been read"
					: "reads differently every time",
			repro: `    ${sources[index].what}`
		});
	}
	return { reports, read: sources.length };
};


/**
 * The source cut short just inside the first of each construct past its
 * midpoint, or the first anywhere when none lies past it: the end of the input
 * is where the tokenizer closes what the source left open.
 * @param {string} source a document
 * @param {readonly [string, RegExp][]} patterns each construct, global, ending where its cut lands
 * @returns {[string, string][]} `[where, cut]` for each construct it holds
 */
const cutsAt = (source, patterns) => {
	/** @type {[string, string][]} */
	const cuts = [];
	for (const [where, pattern] of patterns) {
		pattern.lastIndex = source.length >> 1;
		let match = pattern.exec(source);
		if (match === null) {
			pattern.lastIndex = 0;
			match = pattern.exec(source);
		}
		if (match === null) continue;
		const at = match.index + match[0].length;
		if (at < source.length) cuts.push([where, source.slice(0, at)]);
	}
	return cuts;
};


module.exports = {
	cutsAt,
	firstDifference,
	hasher,
	idempotence,
	oneLine,
	pathSpanWalk,
	purityRelation,
	shrink,
	signed,
	sliceRelation,
	spans,
	thrownText
};
