/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Structure-of-Arrays AST backend (SoA migration phase C1 scaffolding, see
// SOA_MIGRATION_PLAN.md). Not yet wired into parsing: `syntax.js`'s `_emit*`
// seam swaps to `allocNode`-based emission once every node type is covered.

/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {number} NodeRef 1-based node id into the columns; 0 = no node */

// Numeric node types (facades map them back to estree strings). Grows with
// coverage; ids are internal only and may be renumbered freely.
const TYPE_IDENTIFIER = 1;
const TYPE_MEMBER_EXPRESSION = 2;
const TYPE_CALL_EXPRESSION = 3;
const TYPE_EXPRESSION_STATEMENT = 4;
const TYPE_BLOCK_STATEMENT = 5;
const TYPE_PROGRAM = 6;

const TYPE_NAMES = [
	"",
	"Identifier",
	"MemberExpression",
	"CallExpression",
	"ExpressionStatement",
	"BlockStatement",
	"Program"
];

// per-type packed flag bits
const FLAG_COMPUTED = 1;
const FLAG_OPTIONAL = 2;

// symbol slots: invisible to for-in / Object.keys / JSON.stringify
const kAst = Symbol("soa ast");
const kId = Symbol("soa id");
const kA = Symbol("memo a");
const kB = Symbol("memo b");
const kB2 = Symbol("memo b2");

// measured on the phase 0 corpus: one node per ≈ 10 source bytes
const NODES_PER_SOURCE_BYTE = 10;
const MIN_CAPACITY = 256;

/**
 * Column store for one parse plus the facade memo table. Owned per parse —
 * never a module-level singleton — so an escaped facade can never dangle
 * over recycled columns (the GC frees both together).
 */
class SoaAst {
	/**
	 * @param {string} source source code (facades derive strings from it)
	 */
	constructor(source) {
		const capacity = Math.max(
			MIN_CAPACITY,
			Math.ceil(source.length / NODES_PER_SOURCE_BYTE)
		);
		this.source = source;
		/** @type {number} next node id (slot 0 stays the null node) */
		this.count = 1;
		this.capacity = capacity;
		/** @type {Uint8Array} */
		this.types = new Uint8Array(capacity);
		/** @type {Int32Array} */
		this.starts = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.ends = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.kid0 = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.kid1 = new Int32Array(capacity);
		/** @type {Uint8Array} */
		this.flags = new Uint8Array(capacity);
		/** @type {Int32Array} */
		this.listStarts = new Int32Array(capacity);
		/** @type {Int32Array} */
		this.listLens = new Int32Array(capacity);
		/** @type {Int32Array} shared child-list buffer (`listStarts` spans) */
		this.flat = new Int32Array(Math.max(MIN_CAPACITY, capacity >> 1));
		this.flatTop = 0;
		// identity-stable facades; filled lazily on materialization
		/** @type {(EXPECTED_OBJECT | undefined)[]} */
		this.facades = [];
	}

	/**
	 * @param {number} need required node capacity
	 * @returns {void}
	 */
	_grow(need) {
		let capacity = this.capacity;
		do {
			capacity *= 2;
		} while (capacity < need);
		/**
		 * @param {Int32Array | Uint8Array} old previous column
		 * @param {boolean} u8 whether the column is byte-sized
		 * @returns {EXPECTED_ANY} grown column
		 */
		const grow = (old, u8) => {
			const next = u8 ? new Uint8Array(capacity) : new Int32Array(capacity);
			next.set(old);
			return next;
		};
		this.types = /** @type {Uint8Array} */ (grow(this.types, true));
		this.starts = /** @type {Int32Array} */ (grow(this.starts, false));
		this.ends = /** @type {Int32Array} */ (grow(this.ends, false));
		this.kid0 = /** @type {Int32Array} */ (grow(this.kid0, false));
		this.kid1 = /** @type {Int32Array} */ (grow(this.kid1, false));
		this.flags = /** @type {Uint8Array} */ (grow(this.flags, true));
		this.listStarts = /** @type {Int32Array} */ (grow(this.listStarts, false));
		this.listLens = /** @type {Int32Array} */ (grow(this.listLens, false));
		this.capacity = capacity;
	}

	/**
	 * @param {number} type numeric node type
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @returns {NodeRef} new node ref
	 */
	allocNode(type, start, end) {
		const id = this.count++;
		if (id >= this.capacity) this._grow(id + 1);
		this.types[id] = type;
		this.starts[id] = start;
		this.ends[id] = end;
		return id;
	}

	/**
	 * Seals a child list into the shared flat buffer.
	 * @param {NodeRef} id owning node
	 * @param {NodeRef[]} childRefs child refs (scratch array, not retained)
	 * @returns {void}
	 */
	setList(id, childRefs) {
		const len = childRefs.length;
		const top = this.flatTop;
		if (top + len > this.flat.length) {
			let capacity = this.flat.length;
			do {
				capacity *= 2;
			} while (capacity < top + len);
			const next = new Int32Array(capacity);
			next.set(this.flat);
			this.flat = next;
		}
		const flat = this.flat;
		for (let i = 0; i < len; i++) flat[top + i] = childRefs[i];
		this.listStarts[id] = top;
		this.listLens[id] = len;
		this.flatTop = top + len;
	}

	/**
	 * Identity-stable facade for a node ref (0 serves `null`).
	 * @param {NodeRef} id node ref
	 * @returns {EXPECTED_OBJECT | null} estree-shaped facade
	 */
	nodeAt(id) {
		if (id === 0) return null;
		const cached = this.facades[id];
		if (cached !== undefined) return cached;
		const facade = new FACADE_CLASSES[this.types[id]](this, id);
		this.facades[id] = facade;
		return facade;
	}

	/**
	 * @param {NodeRef} id owning node
	 * @returns {(EXPECTED_OBJECT | null)[]} materialized child list
	 */
	listAt(id) {
		const len = this.listLens[id];
		const start = this.listStarts[id];
		const flat = this.flat;
		/** @type {(EXPECTED_OBJECT | null)[]} */
		const out = Array.from({ length: len });
		for (let i = 0; i < len; i++) out[i] = this.nodeAt(flat[start + i]);
		return out;
	}
}

// ----- candidate-2 facades (C0 verdict): own scalar fields, child getters
// on the prototype, memoized into symbol slots. `Object.keys`/spread/JSON
// omit children by design; the opt-in defineProperties mode (full
// enumeration) arrives with the escape hatch in a later step. -----

/**
 * Shared base: `range` served like the parser's `LazyLocNode`.
 */
class FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 * @param {string} type estree type string
	 */
	constructor(ast, id, type) {
		this.type = type;
		this.start = ast.starts[id];
		this.end = ast.ends[id];
		this[kAst] = ast;
		this[kId] = id;
	}

	/**
	 * @returns {[number, number]} source range
	 */
	get range() {
		const cached = this[kB];
		if (cached !== undefined) return cached;
		return (this[kB] = /** @type {[number, number]} */ ([
			this.start,
			this.end
		]));
	}

	/**
	 * @param {[number, number]} value source range
	 */
	set range(value) {
		this[kB] = value;
	}
}

class IdentifierFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "Identifier");
		// names are hot and cheap: derive eagerly from the source
		this.name = ast.source.slice(this.start, this.end);
	}
}

class MemberExpressionFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "MemberExpression");
		const flags = ast.flags[id];
		this.computed = (flags & FLAG_COMPUTED) !== 0;
		this.optional = (flags & FLAG_OPTIONAL) !== 0;
	}

	get object() {
		const cached = this[kA];
		if (cached !== undefined) return cached;
		return (this[kA] = this[kAst].nodeAt(this[kAst].kid0[this[kId]]));
	}

	set object(value) {
		this[kA] = value;
	}

	get property() {
		const cached = this[kB2];
		if (cached !== undefined) return cached;
		return (this[kB2] = this[kAst].nodeAt(this[kAst].kid1[this[kId]]));
	}

	set property(value) {
		this[kB2] = value;
	}
}

class CallExpressionFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "CallExpression");
		this.optional = (ast.flags[id] & FLAG_OPTIONAL) !== 0;
	}

	get callee() {
		const cached = this[kA];
		if (cached !== undefined) return cached;
		return (this[kA] = this[kAst].nodeAt(this[kAst].kid0[this[kId]]));
	}

	set callee(value) {
		this[kA] = value;
	}

	get arguments() {
		const cached = this[kB2];
		if (cached !== undefined) return cached;
		return (this[kB2] = this[kAst].listAt(this[kId]));
	}

	set arguments(value) {
		this[kB2] = value;
	}
}

class ExpressionStatementFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "ExpressionStatement");
	}

	get expression() {
		const cached = this[kA];
		if (cached !== undefined) return cached;
		return (this[kA] = this[kAst].nodeAt(this[kAst].kid0[this[kId]]));
	}

	set expression(value) {
		this[kA] = value;
	}
}

class BlockStatementFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 */
	constructor(ast, id) {
		super(ast, id, "BlockStatement");
	}

	get body() {
		const cached = this[kA];
		if (cached !== undefined) return cached;
		return (this[kA] = this[kAst].listAt(this[kId]));
	}

	set body(value) {
		this[kA] = value;
	}
}

class ProgramFacade extends FacadeBase {
	/**
	 * @param {SoaAst} ast owning column store
	 * @param {NodeRef} id node ref
	 * @param {"module" | "script"} sourceType program source type
	 */
	constructor(ast, id, sourceType = "module") {
		super(ast, id, "Program");
		this.sourceType = sourceType;
	}

	get body() {
		const cached = this[kA];
		if (cached !== undefined) return cached;
		return (this[kA] = this[kAst].listAt(this[kId]));
	}

	set body(value) {
		this[kA] = value;
	}
}

/** @type {(new (ast: SoaAst, id: NodeRef) => FacadeBase)[]} */
const FACADE_CLASSES = [];
FACADE_CLASSES[TYPE_IDENTIFIER] = IdentifierFacade;
FACADE_CLASSES[TYPE_MEMBER_EXPRESSION] = MemberExpressionFacade;
FACADE_CLASSES[TYPE_CALL_EXPRESSION] = CallExpressionFacade;
FACADE_CLASSES[TYPE_EXPRESSION_STATEMENT] = ExpressionStatementFacade;
FACADE_CLASSES[TYPE_BLOCK_STATEMENT] = BlockStatementFacade;
FACADE_CLASSES[TYPE_PROGRAM] = ProgramFacade;

module.exports.FLAG_COMPUTED = FLAG_COMPUTED;
module.exports.FLAG_OPTIONAL = FLAG_OPTIONAL;
module.exports.SoaAst = SoaAst;
module.exports.TYPE_BLOCK_STATEMENT = TYPE_BLOCK_STATEMENT;
module.exports.TYPE_CALL_EXPRESSION = TYPE_CALL_EXPRESSION;
module.exports.TYPE_EXPRESSION_STATEMENT = TYPE_EXPRESSION_STATEMENT;
module.exports.TYPE_IDENTIFIER = TYPE_IDENTIFIER;
module.exports.TYPE_MEMBER_EXPRESSION = TYPE_MEMBER_EXPRESSION;
module.exports.TYPE_NAMES = TYPE_NAMES;
module.exports.TYPE_PROGRAM = TYPE_PROGRAM;
