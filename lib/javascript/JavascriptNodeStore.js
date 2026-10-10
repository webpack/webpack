/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @typedef {import("estree").Node} EstreeNode */

// A field holds a child node, a list of them, a string, a flag, any value
// (a literal's), or a string the node lacks altogether while unset.
const NODE = 0;
const LIST = 1;
const STRING = 2;
const FLAG = 3;
const VALUE = 4;
const OPTIONAL_STRING = 5;

/** @type {Record<string, number>} */
const FIELD_KINDS = {
	node: NODE,
	list: LIST,
	string: STRING,
	flag: FLAG,
	value: VALUE,
	optional: OPTIONAL_STRING
};

const FUNCTION_FIELDS =
	"id:node expression:flag generator:flag async:flag params:list body:node";
const CLASS_FIELDS = "id:node superClass:node body:node";

// Each type's fields, in the order the parser's objects hold them.
/** @type {Record<string, string>} */
const NODE_TYPES = {
	Identifier: "name:string",
	PrivateIdentifier: "name:string",
	Literal: "value:value raw:string",
	MemberExpression: "object:node property:node computed:flag optional:flag",
	CallExpression: "callee:node arguments:list optional:flag",
	NewExpression: "callee:node arguments:list",
	ExpressionStatement: "expression:node directive:optional",
	VariableDeclarator: "id:node init:node",
	VariableDeclaration: "declarations:list kind:string",
	Property:
		"method:flag shorthand:flag computed:flag key:node value:node kind:string",
	BinaryExpression: "left:node operator:string right:node",
	LogicalExpression: "left:node operator:string right:node",
	AssignmentExpression: "operator:string left:node right:node",
	AssignmentPattern: "left:node right:node",
	BlockStatement: "body:list",
	StaticBlock: "body:list",
	ClassBody: "body:list",
	Program: "body:list sourceType:string",
	ReturnStatement: "argument:node",
	ThrowStatement: "argument:node",
	AwaitExpression: "argument:node",
	SpreadElement: "argument:node",
	RestElement: "argument:node",
	YieldExpression: "delegate:flag argument:node",
	UnaryExpression: "operator:string prefix:flag argument:node",
	UpdateExpression: "operator:string prefix:flag argument:node",
	ArrayExpression: "elements:list",
	ArrayPattern: "elements:list",
	ObjectExpression: "properties:list",
	ObjectPattern: "properties:list",
	ThisExpression: "",
	Super: "",
	EmptyStatement: "",
	DebuggerStatement: "",
	FunctionExpression: FUNCTION_FIELDS,
	FunctionDeclaration: FUNCTION_FIELDS,
	ArrowFunctionExpression: FUNCTION_FIELDS,
	IfStatement: "test:node consequent:node alternate:node",
	ConditionalExpression: "test:node consequent:node alternate:node",
	ParenthesizedExpression: "expression:node",
	PropertyDefinition: "static:flag computed:flag key:node value:node",
	MethodDefinition: "static:flag computed:flag key:node kind:string value:node",
	TemplateElement: "value:value tail:flag",
	TemplateLiteral: "expressions:list quasis:list",
	TaggedTemplateExpression: "tag:node quasi:node",
	SequenceExpression: "expressions:list",
	SwitchCase: "consequent:list test:node",
	SwitchStatement: "discriminant:node cases:list",
	ForStatement: "init:node test:node update:node body:node",
	ForInStatement: "left:node right:node body:node",
	ForOfStatement: "await:flag left:node right:node body:node",
	WhileStatement: "test:node body:node",
	DoWhileStatement: "body:node test:node",
	WithStatement: "object:node body:node",
	LabeledStatement: "body:node label:node",
	BreakStatement: "label:node",
	ContinueStatement: "label:node",
	TryStatement: "block:node handler:node finalizer:node",
	CatchClause: "param:node body:node",
	ClassDeclaration: CLASS_FIELDS,
	ClassExpression: CLASS_FIELDS,
	ChainExpression: "expression:node",
	ImportDeclaration:
		"specifiers:list source:node attributes:list phase:optional",
	ImportSpecifier: "imported:node local:node",
	ImportDefaultSpecifier: "local:node",
	ImportNamespaceSpecifier: "local:node",
	ImportAttribute: "key:node value:node",
	ImportExpression: "source:node options:node phase:optional",
	ExportNamedDeclaration:
		"declaration:node specifiers:list source:node attributes:list",
	ExportDefaultDeclaration: "declaration:node",
	ExportAllDeclaration: "exported:node source:node attributes:list",
	ExportSpecifier: "local:node exported:node",
	MetaProperty: "meta:node property:node"
};

// WHY: the parser turns an expression into a pattern in place (`toAssignable`),
// so a pattern's slots must be a prefix of its expression's: an assignment's
// operator goes last, after the `left` and `right` an `AssignmentPattern` keeps.
/** @type {Record<string, string[]>} */
const SLOT_ORDERS = {
	AssignmentExpression: ["left", "right", "operator"]
};

/**
 * @typedef {object} FieldDescriptor
 * @property {string} name the property the ESTree object holds it under
 * @property {number} kind what the field holds
 * @property {number} slot its slot in the node's record, or its flag bit
 */

/**
 * @typedef {object} TypeDescriptor
 * @property {string} name the ESTree type
 * @property {FieldDescriptor[]} fields the fields, in the object's order
 * @property {Map<string, FieldDescriptor>} byName the fields by name
 * @property {number} slotCount how many slots a node's record takes
 */

/** @type {TypeDescriptor[]} */
const TYPES = [];
/** @type {Map<string, number>} */
const TYPE_IDS = new Map();

for (const name of Object.keys(NODE_TYPES)) {
	const spec = NODE_TYPES[name];
	/** @type {FieldDescriptor[]} */
	const fields = [];
	for (const part of spec === "" ? [] : spec.split(" ")) {
		const [fieldName, kindName] = part.split(":");
		fields.push({ name: fieldName, kind: FIELD_KINDS[kindName], slot: 0 });
	}
	const slotted = fields.filter((field) => field.kind !== FLAG);
	const order = SLOT_ORDERS[name];
	if (order !== undefined) {
		slotted.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
	}
	for (let i = 0; i < slotted.length; i++) slotted[i].slot = i;
	let bit = 0;
	for (const field of fields) if (field.kind === FLAG) field.slot = bit++;
	TYPE_IDS.set(name, TYPES.length);
	TYPES.push({
		name,
		fields,
		byName: new Map(fields.map((field) => [field.name, field])),
		slotCount: slotted.length
	});
}

const LITERAL = /** @type {number} */ (TYPE_IDS.get("Literal"));
const EMPTY = -1;
const kRange = Symbol("range");

/**
 * A node `toEstreeObject` builds: ESTree's fields, with `range` read off its
 * offsets on first access, as the parser's own nodes serve it.
 */
class EstreeObject {
	/**
	 * @param {string} type the ESTree type
	 * @param {number} start where it starts
	 * @param {number} end where it ends
	 */
	constructor(type, start, end) {
		this.type = type;
		this.start = start;
		this.end = end;
	}

	/**
	 * @returns {[number, number]} the source range
	 */
	get range() {
		const cached = /** @type {[number, number] | undefined} */ (
			/** @type {EXPECTED_ANY} */ (this)[kRange]
		);
		if (cached !== undefined) return cached;
		/** @type {[number, number]} */
		const range = [this.start, this.end];
		/** @type {EXPECTED_ANY} */ (this)[kRange] = range;
		return range;
	}

	/**
	 * @param {[number, number]} value the source range
	 */
	set range(value) {
		/** @type {EXPECTED_ANY} */ (this)[kRange] = value;
	}
}

/**
 * @template {Int32Array | Uint8Array} T
 * @param {T} array the column to grow
 * @param {number} capacity the length it needs at least
 * @returns {T} the column, or a copy holding at least `capacity` entries
 */
const grow = (array, capacity) => {
	if (capacity <= array.length) return array;
	let length = Math.max(array.length * 2, 1024);
	while (length < capacity) length *= 2;
	const copy = /** @type {T} */ (
		new /** @type {EXPECTED_ANY} */ (array.constructor)(length)
	);
	copy.set(array);
	return copy;
};

/**
 * A JavaScript syntax tree held as a struct of arrays: a node is an integer
 * ref, its fields live in typed-array columns, and `toEstreeObject` builds the
 * ESTree object a consumer that wants one reads.
 */
class JavascriptNodeStore {
	constructor() {
		this._count = 0;
		this._types = new Uint8Array(0);
		this._starts = new Int32Array(0);
		this._ends = new Int32Array(0);
		this._flags = new Uint8Array(0);
		this._bases = new Int32Array(0);
		this._complete = new Uint8Array(0);
		this._slots = new Int32Array(0);
		this._slotTop = 0;
		this._listStarts = new Int32Array(0);
		this._listLengths = new Int32Array(0);
		this._listCount = 0;
		this._listItems = new Int32Array(0);
		this._listItemTop = 0;
		/** @type {unknown[]} */
		this._values = [];
		/** @type {(EstreeObject | undefined)[]} */
		this._objects = [];
	}

	/**
	 * Forgets every node, keeping the columns for the next tree.
	 * @returns {void}
	 */
	reset() {
		this._complete.fill(0, 0, this._count);
		this._count = 0;
		this._slotTop = 0;
		this._listCount = 0;
		this._listItemTop = 0;
		this._values.length = 0;
		this._objects = [];
	}

	/**
	 * @param {string} type the node's ESTree type
	 * @param {number} start where it starts
	 * @param {number} end where it ends
	 * @returns {number} the new node's ref
	 */
	add(type, start, end) {
		const id = TYPE_IDS.get(type);
		if (id === undefined) throw new Error(`Unknown node type ${type}`);
		const ref = this._count++;
		if (ref >= this._types.length) {
			const capacity = ref + 1;
			this._types = grow(this._types, capacity);
			this._starts = grow(this._starts, capacity);
			this._ends = grow(this._ends, capacity);
			this._flags = grow(this._flags, capacity);
			this._bases = grow(this._bases, capacity);
			this._complete = grow(this._complete, capacity);
		}
		const { slotCount } = TYPES[id];
		const base = this._slotTop;
		this._slotTop += slotCount;
		this._slots = grow(this._slots, this._slotTop);
		this._slots.fill(EMPTY, base, this._slotTop);
		this._types[ref] = id;
		this._starts[ref] = start;
		this._ends[ref] = end;
		this._flags[ref] = 0;
		this._bases[ref] = base;
		return ref;
	}

	/**
	 * @param {number} ref the node
	 * @returns {string} its ESTree type
	 */
	typeOf(ref) {
		return TYPES[this._types[ref]].name;
	}

	/**
	 * Sets one field of a node: a child's ref for a node, an array of refs for
	 * a list, `-1` or null where ESTree has null.
	 * @param {number} ref the node
	 * @param {string} name the field
	 * @param {unknown} value what it holds
	 * @returns {void}
	 */
	set(ref, name, value) {
		const field = TYPES[this._types[ref]].byName.get(name);
		if (field === undefined) {
			throw new Error(`${this.typeOf(ref)} has no field ${name}`);
		}
		const index = this._bases[ref] + field.slot;
		switch (field.kind) {
			case NODE:
				this._slots[index] =
					value === null ? EMPTY : /** @type {number} */ (value);
				break;
			case LIST:
				this._slots[index] = this._addList(
					/** @type {(number | null)[]} */ (value)
				);
				break;
			case FLAG:
				if (value) this._flags[ref] |= 1 << field.slot;
				else this._flags[ref] &= ~(1 << field.slot);
				break;
			default:
				this._slots[index] =
					(field.kind === OPTIONAL_STRING && value === undefined) ||
					(field.kind !== VALUE && value === null)
						? EMPTY
						: this._values.push(value) - 1;
		}
	}

	/**
	 * @param {(number | null)[]} refs the list's items, null for a hole
	 * @returns {number} the list's index
	 */
	_addList(refs) {
		const list = this._listCount++;
		this._listStarts = grow(this._listStarts, this._listCount);
		this._listLengths = grow(this._listLengths, this._listCount);
		const start = this._listItemTop;
		this._listItemTop += refs.length;
		this._listItems = grow(this._listItems, this._listItemTop);
		for (let i = 0; i < refs.length; i++) {
			const item = refs[i];
			this._listItems[start + i] = item === null ? EMPTY : item;
		}
		this._listStarts[list] = start;
		this._listLengths[list] = refs.length;
		return list;
	}

	/**
	 * The ESTree object of a node, the same object each time it is asked for.
	 * With `fields`, only those are built, each a whole subtree; a later call
	 * adds what it lacks.
	 * @param {number} ref the node, or -1 for none
	 * @param {string[]=} fields the fields to build, or every field
	 * @returns {EstreeNode | null} the node's object, or null for none
	 */
	toEstreeObject(ref, fields) {
		if (ref === EMPTY) return null;
		let object = this._objects[ref];
		if (object === undefined) {
			object = new EstreeObject(
				TYPES[this._types[ref]].name,
				this._starts[ref],
				this._ends[ref]
			);
			this._objects[ref] = object;
		} else if (this._complete[ref] === 1) {
			return /** @type {EstreeNode} */ (/** @type {unknown} */ (object));
		}
		const id = this._types[ref];
		const target = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (object)
		);
		for (const field of TYPES[id].fields) {
			if (fields !== undefined && !fields.includes(field.name)) continue;
			if (field.name in target) continue;
			this._build(ref, field, target);
		}
		if (id === LITERAL) this._buildLiteralForms(ref, target, fields);
		if (fields === undefined) this._complete[ref] = 1;
		return /** @type {EstreeNode} */ (/** @type {unknown} */ (object));
	}

	/**
	 * @param {number} ref the node
	 * @param {FieldDescriptor} field the field to build
	 * @param {Record<string, unknown>} target the node's object
	 * @returns {void}
	 */
	_build(ref, field, target) {
		if (field.kind === FLAG) {
			target[field.name] = (this._flags[ref] & (1 << field.slot)) !== 0;
			return;
		}
		const slot = this._slots[this._bases[ref] + field.slot];
		switch (field.kind) {
			case NODE:
				target[field.name] = this.toEstreeObject(slot);
				break;
			case LIST: {
				const start = this._listStarts[slot];
				const length = this._listLengths[slot];
				/** @type {(EstreeNode | null)[]} */
				const items = [];
				for (let i = 0; i < length; i++) {
					items.push(this.toEstreeObject(this._listItems[start + i]));
				}
				target[field.name] = items;
				break;
			}
			case OPTIONAL_STRING:
				if (slot !== EMPTY) target[field.name] = this._values[slot];
				break;
			default:
				target[field.name] = slot === EMPTY ? null : this._values[slot];
		}
	}

	/**
	 * Adds a regular expression's `regex` and a bigint's `bigint`, which
	 * ESTree spells out beside a literal's value and the store reads off it.
	 * @param {number} ref the literal
	 * @param {Record<string, unknown>} target the literal's object
	 * @param {string[]=} fields the fields asked for, or every field
	 * @returns {void}
	 */
	_buildLiteralForms(ref, target, fields) {
		const base = this._bases[ref];
		const valueSlot = this._slots[base];
		const rawSlot = this._slots[base + 1];
		const value = valueSlot === EMPTY ? null : this._values[valueSlot];
		const raw = rawSlot === EMPTY ? null : this._values[rawSlot];
		if (
			(fields === undefined || fields.includes("regex")) &&
			typeof raw === "string" &&
			raw.charCodeAt(0) === 47 &&
			!("regex" in target)
		) {
			const end = raw.lastIndexOf("/");
			target.regex = { pattern: raw.slice(1, end), flags: raw.slice(end + 1) };
		}
		if (
			(fields === undefined || fields.includes("bigint")) &&
			typeof value === "bigint" &&
			!("bigint" in target)
		) {
			target.bigint = String(value);
		}
	}
}

module.exports = JavascriptNodeStore;
