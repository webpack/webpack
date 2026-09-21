/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// Discovers the proper intersections of a family of sets in bounded rounds.
// Sets and intersections live as dense bit words in one growing buffer, so a
// round costs word-wise AND and popcount per pair and allocates nothing.

/** A set of members, as bit words at `index * words` in the buffer. */
/** @typedef {number} SetIndex */

/**
 * An intersection of at least two of the input sets.
 * @typedef {object} Intersection
 * @property {number[]} members the members it holds
 * @property {number[]} support the input sets holding all of them
 */

/**
 * Options of a discovery run.
 * @typedef {object} DiscoveryOptions
 * @property {number} setCount number of input sets
 * @property {number} memberCount number of distinct members
 * @property {Int32Array} offsets start of each set in `members`, plus its end
 * @property {Int32Array} members members of every set, ordered by set
 * @property {number} depth rounds of discovery, `1` intersects the input sets
 * @property {number} minMembers smallest intersection worth discovering
 * @property {Float64Array | undefined} sizes size of each input set, when a size bound applies
 * @property {number} minSize size an intersection's support must reach
 * @property {number} maxIntersections most intersections a run may discover
 * @property {number} maxWork most words a run may intersect, one per word of every pair it reaches
 */

/**
 * What a discovery run found, and whether a limit cut it short.
 * @typedef {object} DiscoveryResult
 * @property {Intersection[]} intersections the intersections, largest first
 * @property {boolean} capped true when `maxIntersections` or `maxWork` stopped the run
 */

/** @type {Intersection[]} */
const NO_INTERSECTIONS = [];

/** Reported when nothing was discovered, so callers skip every later step. */
const EMPTY_RESULT = { intersections: NO_INTERSECTIONS, capped: false };

/**
 * Counts the bits of a word.
 * @param {number} word the word
 * @returns {number} number of bits set
 */
const popcount = (word) => {
	word -= (word >>> 1) & 0x55555555;
	word = (word & 0x33333333) + ((word >>> 2) & 0x33333333);
	word = (word + (word >>> 4)) & 0x0f0f0f0f;
	return (word * 0x01010101) >>> 24;
};

/**
 * An open addressed set of bit patterns. Entries are indices into the buffer
 * the patterns live in, so nothing is copied and rehashing stays cheap.
 */
class BitPatternSet {
	/**
	 * @param {number} capacity number of patterns to make room for
	 */
	constructor(capacity) {
		let slots = 16;
		while (slots < capacity * 2) slots *= 2;
		/** @type {Int32Array} */
		this._slots = new Int32Array(slots);
		this._mask = slots - 1;
		this._size = 0;
	}

	/**
	 * Adds a pattern unless an equal one is already known.
	 * @param {Uint32Array} words the buffer holding both the pattern and the entries
	 * @param {number} offset first word of the pattern
	 * @param {number} length number of words per pattern
	 * @param {number} entry value to store for the pattern, added to `1`
	 * @returns {boolean} true when the pattern was added
	 */
	add(words, offset, length, entry) {
		let hash = 0x811c9dc5;
		for (let i = 0; i < length; i++) {
			hash = (hash ^ words[offset + i]) >>> 0;
			hash = (Math.imul(hash, 0x01000193) + (hash >>> 24)) >>> 0;
		}
		const slots = this._slots;
		let slot = hash & this._mask;
		while (slots[slot] !== 0) {
			const other = (slots[slot] - 1) * length;
			let equal = true;
			for (let i = 0; i < length; i++) {
				if (words[other + i] !== words[offset + i]) {
					equal = false;
					break;
				}
			}
			if (equal) return false;
			slot = (slot + 1) & this._mask;
		}
		slots[slot] = entry + 1;
		this._size++;
		if (this._size * 2 > slots.length) this._grow(words, length);
		return true;
	}

	/**
	 * Doubles the table and reinserts every entry.
	 * @param {Uint32Array} words the buffer holding the patterns
	 * @param {number} length number of words per pattern
	 * @returns {void}
	 */
	_grow(words, length) {
		const previous = this._slots;
		const slots = new Int32Array(previous.length * 2);
		const mask = slots.length - 1;
		for (const value of previous) {
			if (value === 0) continue;
			const offset = (value - 1) * length;
			let hash = 0x811c9dc5;
			for (let i = 0; i < length; i++) {
				hash = (hash ^ words[offset + i]) >>> 0;
				hash = (Math.imul(hash, 0x01000193) + (hash >>> 24)) >>> 0;
			}
			let slot = hash & mask;
			while (slots[slot] !== 0) slot = (slot + 1) & mask;
			slots[slot] = value;
		}
		this._slots = slots;
		this._mask = mask;
	}
}

/**
 * Discovers intersections of the input sets that are not input sets themselves.
 *
 * Each round freezes its inputs: the first intersects the input sets, and every
 * later one also intersects what the round before it found, so `depth` bounds
 * how deep the discovery goes. Only proper intersections of at least
 * `minMembers` members are kept, and an intersection is reported only with the
 * input sets that hold all of its members. When `sizes` is given, the last round
 * skips a pair sharing a member no set reaches `minSize` through, and an
 * intersection whose support cannot reach `minSize` is not reported at all.
 * @param {DiscoveryOptions} options what to discover
 * @returns {DiscoveryResult} the intersections, largest first
 */
const discoverIntersections = ({
	setCount,
	memberCount,
	offsets,
	members,
	depth,
	minMembers,
	sizes,
	minSize,
	maxIntersections,
	maxWork
}) => {
	if (depth < 1 || setCount < 2 || memberCount < minMembers) {
		return EMPTY_RESULT;
	}
	const words = Math.ceil(memberCount / 32);
	// One size bound per member, and the number of sets holding it. The rarest
	// member of an intersection drives the support scan below.
	const memberCounts = new Int32Array(memberCount);
	const memberSizes =
		sizes === undefined ? undefined : new Float64Array(memberCount);
	let totalSize = 0;
	let capacity = setCount + Math.min(setCount, maxIntersections);
	let patterns = new Uint32Array(capacity * words);
	let lengths = new Int32Array(capacity);
	let count = setCount;
	for (let set = 0; set < setCount; set++) {
		const end = offsets[set + 1];
		const size = sizes === undefined ? 0 : sizes[set];
		totalSize += size;
		const offset = set * words;
		for (let i = offsets[set]; i < end; i++) {
			const member = members[i];
			patterns[offset + (member >>> 5)] |= 1 << (member & 31);
			memberCounts[member]++;
			if (memberSizes !== undefined) memberSizes[member] += size;
		}
		lengths[set] = end - offsets[set];
	}
	if (sizes !== undefined && totalSize < minSize) return EMPTY_RESULT;
	// An intersection holding a member no set reaches `minSize` through cannot
	// carry a split, so the last round drops the pair rather than the member: a
	// round before it may still find a descendant that leaves the member behind.
	const excluded = new Uint32Array(words);
	let hasExcluded = false;
	if (memberSizes !== undefined) {
		for (let member = 0; member < memberCount; member++) {
			if (memberSizes[member] >= minSize) continue;
			excluded[member >>> 5] |= 1 << (member & 31);
			hasExcluded = true;
		}
	}
	const known = new BitPatternSet(setCount * 2);
	for (let set = 0; set < setCount; set++) {
		known.add(patterns, set * words, words, set);
	}
	const scratch = new Uint32Array(words);
	let work = maxWork;
	let capped = false;
	let first = 0;
	// Postings of the sets holding each member, rebuilt for every round. A pair
	// of sets sharing no member intersects to nothing, so the postings of the
	// sparse sets of a real graph reach far fewer pairs than every pair does.
	const roundPostingOffsets = new Int32Array(memberCount + 1);
	/** @type {Int32Array} */
	let roundPostings = new Int32Array(0);

	/**
	 * Writes the postings of the sets discovered so far.
	 * @returns {void}
	 */
	const writeRoundPostings = () => {
		roundPostingOffsets.fill(0);
		for (let set = 0; set < count; set++) {
			const offset = set * words;
			for (let word = 0; word < words; word++) {
				let value = patterns[offset + word];
				while (value !== 0) {
					roundPostingOffsets[
						word * 32 + (31 - Math.clz32(value & -value)) + 1
					]++;
					value &= value - 1;
				}
			}
		}
		for (let member = 0; member < memberCount; member++) {
			roundPostingOffsets[member + 1] += roundPostingOffsets[member];
		}
		if (roundPostings.length < roundPostingOffsets[memberCount]) {
			roundPostings = new Int32Array(roundPostingOffsets[memberCount]);
		}
		const cursors = roundPostingOffsets.slice(0, memberCount);
		for (let set = 0; set < count; set++) {
			const offset = set * words;
			for (let word = 0; word < words; word++) {
				let value = patterns[offset + word];
				while (value !== 0) {
					const member = word * 32 + (31 - Math.clz32(value & -value));
					value &= value - 1;
					roundPostings[cursors[member]++] = set;
				}
			}
		}
	};

	/**
	 * Intersects two sets, keeping what they share when it is new.
	 * @param {number} i one set
	 * @param {number} j the other set
	 * @param {boolean} applyExcluded whether to skip a pair sharing an excluded member
	 * @param {number} atMember the member the pair is being intersected at, or `-1`
	 * @returns {boolean} false when a limit was reached
	 */
	const intersectPair = (i, j, applyExcluded, atMember) => {
		const iOffset = i * words;
		const jOffset = j * words;
		let intersected = 0;
		let lowest = -1;
		for (let word = 0; word < words; word++) {
			const value = patterns[iOffset + word] & patterns[jOffset + word];
			if (applyExcluded && (value & excluded[word]) !== 0) return true;
			scratch[word] = value;
			if (value !== 0) {
				if (lowest === -1) {
					lowest = word * 32 + (31 - Math.clz32(value & -value));
				}
				intersected += popcount(value);
			}
		}
		// Reached through its lowest member alone, so a pair sharing several
		// members is intersected once
		if (atMember !== -1 && lowest !== atMember) return true;
		// Anything as large as a side is that side, and a set already holding
		// every member needs no intersection to be found.
		if (
			intersected < minMembers ||
			intersected >= lengths[i] ||
			intersected >= lengths[j]
		) {
			return true;
		}
		if (count - setCount >= maxIntersections) {
			capped = true;
			return false;
		}
		if (count === capacity) {
			capacity = Math.min(capacity * 2, setCount + maxIntersections);
			const grownPatterns = new Uint32Array(capacity * words);
			grownPatterns.set(patterns);
			patterns = grownPatterns;
			const grownLengths = new Int32Array(capacity);
			grownLengths.set(lengths);
			lengths = grownLengths;
		}
		const offset = count * words;
		patterns.set(scratch, offset);
		if (!known.add(patterns, offset, words, count)) return true;
		lengths[count] = intersected;
		count++;
		return true;
	};

	// Every pair costs the same to intersect, so the cheaper way to reach them
	// is the one reaching fewer.
	let pairsThroughMembers = 0;
	for (let member = 0; member < memberCount; member++) {
		const holders = memberCounts[member];
		pairsThroughMembers += (holders * (holders - 1)) / 2;
	}
	const throughMembers = pairsThroughMembers < (setCount * (setCount - 1)) / 2;

	discovery: for (let round = 0; round < depth; round++) {
		const end = count;
		const applyExcluded = hasExcluded && round + 1 === depth;
		if (throughMembers) {
			writeRoundPostings();
			for (let member = 0; member < memberCount; member++) {
				const to = roundPostingOffsets[member + 1];
				for (let a = roundPostingOffsets[member]; a < to; a++) {
					const i = roundPostings[a];
					if (lengths[i] <= minMembers) continue;
					for (let b = roundPostingOffsets[member]; b < a; b++) {
						const j = roundPostings[b];
						// A pair of sets an earlier round already intersected holds
						// nothing new
						if (lengths[j] <= minMembers || (i < first && j < first)) {
							continue;
						}
						work -= words;
						if (work < 0) {
							capped = true;
							break discovery;
						}
						if (!intersectPair(i, j, applyExcluded, member)) break discovery;
					}
				}
			}
		} else {
			for (let i = first; i < end; i++) {
				if (lengths[i] <= minMembers) continue;
				for (let j = 0; j < i; j++) {
					if (lengths[j] <= minMembers) continue;
					work -= words;
					if (work < 0) {
						capped = true;
						break discovery;
					}
					if (!intersectPair(i, j, applyExcluded, -1)) break discovery;
				}
			}
		}
		if (count === end) break;
		first = end;
	}

	if (count === setCount) return { intersections: NO_INTERSECTIONS, capped };
	// Postings of the sets holding each member, to scan an intersection's
	// support from its rarest member instead of every set.
	const postingOffsets = new Int32Array(memberCount + 1);
	for (let member = 0; member < memberCount; member++) {
		postingOffsets[member + 1] = postingOffsets[member] + memberCounts[member];
	}
	const postings = new Int32Array(postingOffsets[memberCount]);
	const cursors = postingOffsets.slice(0, memberCount);
	for (let set = 0; set < setCount; set++) {
		const end = offsets[set + 1];
		for (let i = offsets[set]; i < end; i++) {
			postings[cursors[members[i]]++] = set;
		}
	}
	/** @type {Intersection[]} */
	const intersections = [];
	for (let candidate = setCount; candidate < count; candidate++) {
		const offset = candidate * words;
		/** @type {number[]} */
		const candidateMembers = [];
		let anchor = -1;
		for (let word = 0; word < words; word++) {
			let value = patterns[offset + word];
			while (value !== 0) {
				const bit = 31 - Math.clz32(value & -value);
				const member = word * 32 + bit;
				value &= value - 1;
				candidateMembers.push(member);
				if (anchor === -1 || memberCounts[member] < memberCounts[anchor]) {
					anchor = member;
				}
			}
		}
		/** @type {number[]} */
		const support = [];
		let size = 0;
		const postingsEnd = postingOffsets[anchor + 1];
		for (let i = postingOffsets[anchor]; i < postingsEnd; i++) {
			const set = postings[i];
			const setOffset = set * words;
			let holdsAll = true;
			for (let word = 0; word < words; word++) {
				if ((patterns[offset + word] & ~patterns[setOffset + word]) !== 0) {
					holdsAll = false;
					break;
				}
			}
			if (!holdsAll) continue;
			support.push(set);
			if (sizes !== undefined) size += sizes[set];
		}
		if (sizes !== undefined && size < minSize) continue;
		intersections.push({ members: candidateMembers, support });
	}
	// Largest first, as the combinations they extend are ordered, and by members
	// so that discovery order never reaches the output.
	intersections.sort((a, b) => {
		if (a.members.length !== b.members.length) {
			return b.members.length - a.members.length;
		}
		for (let i = 0; i < a.members.length; i++) {
			if (a.members[i] !== b.members[i]) return a.members[i] - b.members[i];
		}
		return 0;
	});
	return { intersections, capped };
};

module.exports.discoverIntersections = discoverIntersections;
