/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { tokTypes } = require("acorn");

/** @typedef {import("acorn").Options} AcornOptions */
/** @typedef {typeof import("acorn").Parser} AcornParser */
/** @typedef {import("acorn").Position} AcornPosition */
/** @typedef {import("acorn").Parser} AcornParserInstance */
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
	 * Only constructed when the parser runs in lazy mode, so the positions
	 * mapping is always present.
	 * @param {{ [kSourcePositions]?: SourcePositions }} parser parser instance
	 * @param {number} pos start offset
	 */
	constructor(parser, pos) {
		this.type = "";
		this.start = pos;
		this.end = 0;
		this[kSourcePositions] =
			/** @type {SourcePositions} */
			(parser[kSourcePositions]);
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
		 * @this {AcornParserInstance & { [kSourcePositions]?: SourcePositions, start: number }}
		 * @returns {EXPECTED_ANY} new node
		 */
		startNode() {
			if (!this[kSourcePositions]) return base.startNode.call(this);
			return new LazyLocNode(this, this.start);
		}

		/**
		 * @this {AcornParserInstance & { [kSourcePositions]?: SourcePositions }}
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
		 * @this {AcornParserInstance & AcornParserInternals}
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

// acorn's BIND_LEXICAL scope binding type
const BIND_LEXICAL = 2;

/**
 * Methods and state internal to acorn, absent from its public types.
 * @typedef {AcornParserInstance & {
 * type: import("acorn").TokenType,
 * value: EXPECTED_ANY,
 * start: number,
 * startLoc?: AcornPosition,
 * containsEsc: boolean,
 * next: () => void,
 * eat: (type: import("acorn").TokenType) => boolean,
 * unexpected: (pos?: number) => never,
 * raise: (pos: number, message: string) => never,
 * raiseRecoverable: (pos: number, message: string) => void,
 * isContextual: (name: string) => boolean,
 * parseIdent: (liberal?: boolean) => EXPECTED_ANY,
 * checkLValSimple: (expr: EXPECTED_ANY, bindingType?: number) => void,
 * startNodeAt: (pos: number, loc?: AcornPosition) => EXPECTED_ANY,
 * finishNode: (node: EXPECTED_ANY, type: string) => EXPECTED_ANY,
 * parseImport: (node: EXPECTED_ANY) => EXPECTED_ANY,
 * parseImportSpecifiers: () => EXPECTED_ANY[],
 * parseExprImport: (forNew: boolean) => EXPECTED_ANY,
 * parseImportMeta: (node: EXPECTED_ANY) => EXPECTED_ANY,
 * parseDynamicImport: (node: EXPECTED_ANY) => EXPECTED_ANY,
 * _importPhase: "defer" | "source" | null,
 * }} ParserWithInternals
 */

/**
 * Supports the import phase proposals: static `import defer * as ns from ...`
 * / `import source x from ...` set `phase` on the ImportDeclaration, dynamic
 * `import.defer(...)` / `import.source(...)` yield an ImportExpression with
 * `phase`. Replaces the `acorn-import-phases` package; unlike it, acorn's
 * `!forNew` guard is kept, so `new import.defer(...)` is a SyntaxError just
 * like `new import(...)`.
 * @type {(BaseParser: AcornParser) => AcornParser}
 */
const importPhases = (Parser) => {
	const base = /** @type {ParserWithInternals} */ (
		/** @type {unknown} */ (Parser.prototype)
	);

	return class extends Parser {
		/**
		 * @this {ParserWithInternals}
		 * @param {EXPECTED_ANY} node import declaration node
		 * @returns {EXPECTED_ANY} finished node
		 */
		parseImport(node) {
			this._importPhase = null;
			const result = base.parseImport.call(this, node);
			if (this._importPhase) node.phase = this._importPhase;
			return result;
		}

		/**
		 * @this {ParserWithInternals}
		 * @returns {EXPECTED_ANY[]} import specifiers
		 */
		parseImportSpecifiers() {
			const phase = this.isContextual("defer")
				? "defer"
				: this.isContextual("source")
					? "source"
					: null;
			if (!phase) return base.parseImportSpecifiers.call(this);

			const phaseId = this.parseIdent();
			if (this.isContextual("from") || this.type === tokTypes.comma) {
				// `defer`/`source` was the default import name, not a phase modifier
				const defaultSpecifier = this.startNodeAt(
					phaseId.start,
					phaseId.loc && phaseId.loc.start
				);
				defaultSpecifier.local = phaseId;
				this.checkLValSimple(phaseId, BIND_LEXICAL);

				const nodes = [
					this.finishNode(defaultSpecifier, "ImportDefaultSpecifier")
				];
				if (this.eat(tokTypes.comma)) {
					if (this.type !== tokTypes.star && this.type !== tokTypes.braceL) {
						this.unexpected();
					}
					nodes.push(...base.parseImportSpecifiers.call(this));
				}
				return nodes;
			}

			this._importPhase = phase;

			if (phase === "defer") {
				if (this.type !== tokTypes.star) {
					this.raiseRecoverable(
						phaseId.start,
						"'import defer' can only be used with namespace imports ('import defer * as identifierName from ...')."
					);
				}
			} else if (this.type !== tokTypes.name) {
				this.raiseRecoverable(
					phaseId.start,
					"'import source' can only be used with direct identifier specifier imports."
				);
			}

			const specifiers = base.parseImportSpecifiers.call(this);

			if (
				phase === "source" &&
				specifiers.some(
					(/** @type {EXPECTED_ANY} */ s) => s.type !== "ImportDefaultSpecifier"
				)
			) {
				this.raiseRecoverable(
					phaseId.start,
					"'import source' can only be used with direct identifier specifier imports ('import source identifierName from ...')."
				);
			}

			return specifiers;
		}

		/**
		 * @this {ParserWithInternals}
		 * @param {boolean} forNew whether parsed as the operand of `new`
		 * @returns {EXPECTED_ANY} expression node
		 */
		parseExprImport(forNew) {
			const node = base.parseExprImport.call(this, forNew);

			if (
				node.type === "MetaProperty" &&
				(node.property.name === "defer" || node.property.name === "source")
			) {
				if (this.type === tokTypes.parenL) {
					if (forNew) {
						// same guard acorn applies to `new import(...)`
						this.raise(node.start, "import call cannot be the target of `new`");
					}
					const dynImport = this.parseDynamicImport(
						this.startNodeAt(node.start, node.loc && node.loc.start)
					);
					dynImport.phase = node.property.name;
					return dynImport;
				}
				this.raiseRecoverable(
					node.start,
					`'import.${node.property.name}' can only be used in a dynamic import.`
				);
			}

			return node;
		}

		/**
		 * @this {ParserWithInternals}
		 * @param {EXPECTED_ANY} node started node with `meta` set to `import`
		 * @returns {EXPECTED_ANY} MetaProperty node
		 */
		parseImportMeta(node) {
			this.next();

			const containsEsc = this.containsEsc;
			node.property = this.parseIdent(true);
			const { name } = node.property;

			if (name !== "meta" && name !== "defer" && name !== "source") {
				this.raiseRecoverable(
					node.property.start,
					"The only valid meta property for import is 'import.meta'"
				);
			}
			if (containsEsc) {
				this.raiseRecoverable(
					node.start,
					`'import.${name}' must not contain escaped characters`
				);
			}
			if (
				name === "meta" &&
				this.options.sourceType !== "module" &&
				!this.options.allowImportExportEverywhere
			) {
				this.raiseRecoverable(
					node.start,
					"Cannot use 'import.meta' outside a module"
				);
			}

			return this.finishNode(node, "MetaProperty");
		}
	};
};

module.exports.SourcePositions = SourcePositions;
module.exports.importPhases = importPhases;
module.exports.lazyLocations = lazyLocations;
