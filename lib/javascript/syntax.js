/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @typedef {import("acorn").Options} AcornOptions */
/** @typedef {typeof import("acorn").Parser} AcornParser */
/** @typedef {import("acorn").Position} AcornPosition */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {[number, number]} Range */

// Mirrors acorn's `lineBreak` regexp, which its types don't export.
const LINE_BREAK_G = /\r\n?|\n|\u2028|\u2029/g;

// Symbol-keyed so it stays out of for-in, Object.keys and JSON.stringify
// over AST nodes.
const kSourcePositions = Symbol("source positions");

/**
 * Offset → line/column mapping for one parsed file. The line-start table is
 * built only when some node's `loc` is first read.
 */
class SourcePositions {
	/**
	 * @param {string} source source code
	 */
	constructor(source) {
		this.source = source;
		/** @type {number[] | undefined} */
		this.lineStarts = undefined;
	}

	/**
	 * @returns {number[]} offset of each line's first character
	 */
	_buildLineStarts() {
		const lineStarts = [0];
		LINE_BREAK_G.lastIndex = 0;
		let match;
		while ((match = LINE_BREAK_G.exec(this.source)) !== null) {
			lineStarts.push(match.index + match[0].length);
		}
		return (this.lineStarts = lineStarts);
	}

	/**
	 * @param {number} offset source offset
	 * @returns {AcornPosition} position (1-based line, 0-based column)
	 */
	position(offset) {
		const lineStarts = this.lineStarts || this._buildLineStarts();
		// binary search for the line containing offset
		let lo = 0;
		let hi = lineStarts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >>> 1;
			if (lineStarts[mid] <= offset) lo = mid;
			else hi = mid - 1;
		}
		return { line: lo + 1, column: offset - lineStarts[lo] };
	}
}

/**
 * Replaces this node's prototype `loc`/`range` accessor with a plain own data
 * property, so later reads are direct and consumers can mutate the value.
 * @param {object} node node
 * @param {"loc" | "range"} name property name
 * @param {unknown} value property value
 */
const materialize = (node, name, value) => {
	Object.defineProperty(node, name, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
};

/**
 * Drop-in replacement for acorn's `Node` that materializes `loc` and `range`
 * on first access instead of allocating them during parsing. Most nodes never
 * get either read, which saves three objects and an array per node.
 */
class LazyLocNode {
	/**
	 * @param {{ [kSourcePositions]: SourcePositions }} parser parser instance
	 * @param {number} pos start offset
	 */
	constructor(parser, pos) {
		this.type = "";
		this.start = pos;
		this.end = 0;
		this[kSourcePositions] = parser[kSourcePositions];
	}

	/**
	 * @returns {SourceLocation} source location, own property once the node is finished
	 */
	get loc() {
		const positions = this[kSourcePositions];
		const loc = {
			start: positions.position(this.start),
			end: positions.position(this.end)
		};
		// acorn reads `.loc.start` of still-unfinished nodes (import.meta /
		// new.target), so only cache when `end` has been set by finishNode
		if (this.end > 0) materialize(this, "loc", loc);
		return loc;
	}

	set loc(value) {
		materialize(this, "loc", value);
	}

	/**
	 * @returns {Range} source range, own property once the node is finished
	 */
	get range() {
		/** @type {Range} */
		const range = [this.start, this.end];
		if (this.end > 0) materialize(this, "range", range);
		return range;
	}

	set range(value) {
		materialize(this, "range", value);
	}
}

/**
 * Runs acorn with `locations`/`ranges` disabled and serves `loc`/`range`
 * through `LazyLocNode` instead. Activated per parse via the internal
 * `lazySourcePositions` option; without it the parser behaves like plain
 * acorn.
 * @type {(BaseParser: AcornParser) => AcornParser}
 */
const lazyLocations = (Parser) => {
	/** @typedef {{ startLoc?: AcornPosition, startNode: () => EXPECTED_ANY, startNodeAt: (pos: number, loc?: AcornPosition) => EXPECTED_ANY }} AcornParserInternals */

	// node creation methods are internal to acorn and absent from its types
	const base =
		/** @type {AcornParserInternals} */
		(/** @type {unknown} */ (Parser.prototype));

	return class extends Parser {
		/**
		 * @param {AcornOptions & { lazySourcePositions?: SourcePositions }} options options
		 * @param {string} input source code
		 * @param {number=} startPos start position
		 */
		constructor(options, input, startPos) {
			const sourcePositions = options.lazySourcePositions;
			if (sourcePositions) {
				options = { ...options, locations: false, ranges: false };
			}
			super(options, input, startPos);
			this[kSourcePositions] = sourcePositions;
		}

		/**
		 * @this {InstanceType<AcornParser> & { [kSourcePositions]?: SourcePositions, start: number }}
		 * @returns {EXPECTED_ANY} new node
		 */
		startNode() {
			if (!this[kSourcePositions]) return base.startNode.call(this);
			return new LazyLocNode(this, this.start);
		}

		/**
		 * @this {InstanceType<AcornParser> & { [kSourcePositions]?: SourcePositions }}
		 * @param {number} pos start offset
		 * @param {AcornPosition=} loc start position when acorn tracks locations
		 * @returns {EXPECTED_ANY} new node
		 */
		startNodeAt(pos, loc) {
			if (!this[kSourcePositions]) return base.startNodeAt.call(this, pos, loc);
			return new LazyLocNode(this, pos);
		}

		/**
		 * Mirror of acorn's `copyNode`, which bypasses `startNodeAt` via
		 * `new Node(...)` and would otherwise produce non-lazy nodes.
		 * @this {InstanceType<AcornParser> & AcornParserInternals}
		 * @param {EXPECTED_ANY} node node to copy
		 * @returns {EXPECTED_ANY} copied node
		 */
		copyNode(node) {
			const newNode = this.startNodeAt(node.start, this.startLoc);
			for (const prop in node) newNode[prop] = node[prop];
			return newNode;
		}
	};
};

module.exports.SourcePositions = SourcePositions;
module.exports.lazyLocations = lazyLocations;
