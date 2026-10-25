/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @typedef {import("./syntax-printer").Node} Node */
/** @typedef {import("./syntax-printer").NodeFields} NodeFields */
/** @typedef {import("./syntax-printer").NodeFieldValue} NodeFieldValue */
/** @typedef {import("./syntax-printer").NodeProps} NodeProps */
/** @typedef {import("./syntax-printer").NodeFieldAccess} NodeFieldAccess */

// Every field `NodeFieldAccess` reads and writes, as `NodeFields` lists them.
const NODE_FIELD_NAMES = [
	"type",
	"flags",
	"startToken",
	"endToken",
	"_annotations",
	"mapName",
	"name",
	"kind",
	"role",
	"operator",
	"quote",
	"raw",
	"directive",
	"phase",
	"atom",
	"computed",
	"shorthand",
	"optional",
	"async",
	"generator",
	"static",
	"method",
	"prefix",
	"delegate",
	"await",
	"is_array",
	"is_default",
	"logical",
	"label",
	"property",
	"expression",
	"callee",
	"object",
	"argument",
	"discriminant",
	"left",
	"right",
	"test",
	"alternate",
	"consequent",
	"body",
	"tag",
	"quasi",
	"superClass",
	"id",
	"init",
	"update",
	"block",
	"handler",
	"finalizer",
	"param",
	"key",
	"value",
	"source",
	"attributes",
	"imported_name",
	"local",
	"imported",
	"exported",
	"exported_value",
	"exported_definition",
	"arguments",
	"elements",
	"properties",
	"declarations",
	"expressions",
	"segments",
	"params",
	"cases",
	"args",
	"imported_names",
	"exported_names",
	"block_scope",
	"scope",
	"globals",
	"references",
	"fixed",
	"definition",
	"tokenTables"
];

// WHY: while the branch moves the compressor onto columns, nodes are objects
// unless this is set, so both backends run the same corpus side by side; the
// switch and this flag go once handles print the same bytes.
const USES_HANDLES = process.env.WEBPACK_MINIFY_NODE_HANDLES === "1";

const FIELD_COUNT = NODE_FIELD_NAMES.length;
/** @type {Map<string, number>} */
const FIELD_INDEXES = new Map(
	NODE_FIELD_NAMES.map((name, index) => [name, index])
);

/**
 * A node held in columns: every node is one of these, of one shape, its
 * fields in the record `base` starts in the slots of the run that made it.
 */
class NodeHandle {
	/**
	 * @param {unknown[]} slots the records of the run that made it
	 * @param {number} variant its kind and type, as `registerVariant` numbers them
	 * @param {number} base where its record starts
	 */
	constructor(slots, variant, base) {
		this.slots = slots;
		this.variant = variant;
		this.base = base;
	}
}

// The records the nodes made now go to, one slot per field a record holds:
// each outermost run takes fresh ones, garbage once no node of it is held.
const nodeStore = {
	/** @type {unknown[]} */
	slots: [],
	depth: 0
};
// Per variant and field, the slot its record holds the field in, -1 for none,
// and the value its kind fixes where it holds none.
/** @type {number[]} */
const fieldSlots = [];
/** @type {unknown[]} */
const fieldConstants = [];
/** @type {EXPECTED_OBJECT[]} */
const variantPrototypes = [];
/** @type {(keyof NodeFields)[][]} */
const variantShapes = [];

/**
 * Numbers a kind's variant: its prototype, read for what the kind holds under
 * keys of its own, and the fields its records hold, in order.
 * @param {Record<string, unknown>} prototype the variant's prototype
 * @param {string[]} shape the fields each record holds
 * @returns {number} the variant
 */
const registerVariant = (prototype, shape) => {
	const variant = variantPrototypes.length;
	variantPrototypes.push(prototype);
	variantShapes.push(/** @type {(keyof NodeFields)[]} */ (shape));
	for (let i = 0; i < FIELD_COUNT; i++) {
		const name = NODE_FIELD_NAMES[i];
		const slot = shape.indexOf(name);
		fieldSlots[variant * FIELD_COUNT + i] = slot;
		fieldConstants[variant * FIELD_COUNT + i] =
			slot === -1 ? prototype[name] : undefined;
	}
	return variant;
};

/**
 * Builds `NodeFieldAccess`: each field's read and write a function of its own, so
 * each field's loads keep feedback of their own.
 * @returns {NodeFieldAccess} the reads and writes
 */
const createNodeAccess = () => {
	/** @type {Record<string, EXPECTED_FUNCTION>} */
	const access = {};
	for (const name of NODE_FIELD_NAMES) {
		const index = /** @type {number} */ (FIELD_INDEXES.get(name));
		const setter = `set${name[0].toUpperCase()}${name.slice(1)}`;
		access[name] = USES_HANDLES
			? // eslint-disable-next-line no-new-func
				new Function(
					"store",
					"fieldSlots",
					"fieldConstants",
					"NodeHandle",
					`"use strict"; return function read(node) { if (!(node instanceof NodeHandle)) return node.${name}; const at = node.variant * ${FIELD_COUNT} + ${index}; const slot = fieldSlots[at]; return slot >= 0 ? node.slots[node.base + slot] : fieldConstants[at]; };`
				)(nodeStore, fieldSlots, fieldConstants, NodeHandle)
			: // eslint-disable-next-line no-new-func
				new Function("node", `"use strict"; return node.${name};`);
		access[setter] = USES_HANDLES
			? // eslint-disable-next-line no-new-func
				new Function(
					"store",
					"fieldSlots",
					"missing",
					"NodeHandle",
					`"use strict"; return function write(node, value) { if (!(node instanceof NodeHandle)) return (node.${name} = value); const slot = fieldSlots[node.variant * ${FIELD_COUNT} + ${index}]; if (slot < 0) missing(node, "${name}"); return (node.slots[node.base + slot] = value); };`
				)(nodeStore, fieldSlots, missingSlot, NodeHandle)
			: // eslint-disable-next-line no-new-func
				new Function(
					"node",
					"value",
					`"use strict"; return (node.${name} = value);`
				);
	}
	/** @typedef {Record<string, EXPECTED_FUNCTION>} Accessors */
	// What a node's kind holds under a key of its own: kind bits, or a table a
	// phase dispatches on.
	/** @type {NodeFieldAccess["ofKind"]} */
	const ofKind = USES_HANDLES
		? (node, key) =>
				/** @type {typeof node} */ (
					variantPrototypes[
						/** @type {NodeHandle} */ (/** @type {unknown} */ (node)).variant
					]
				)[key]
		: (node, key) => node[key];
	// A field read or written by its name, for a phase choosing it at run time.
	/** @type {NodeFieldAccess["get"]} */
	const get = USES_HANDLES
		? (node, name) => access[name](node)
		: (node, name) => node[name];
	/** @type {NodeFieldAccess["set"]} */
	const set = USES_HANDLES
		? (node, name, value) =>
				access[`set${name[0].toUpperCase()}${name.slice(1)}`](node, value)
		: (node, name, value) => {
				/** @type {Record<string, NodeFieldValue>} */ (
					/** @type {unknown} */ (node)
				)[name] = value;
				return value;
			};
	// The fields a node holds, and them as a factory takes them.
	/** @type {NodeFieldAccess["fieldsOf"]} */
	const fieldsOf = USES_HANDLES
		? (node) =>
				variantShapes[
					/** @type {NodeHandle} */ (/** @type {unknown} */ (node)).variant
				]
		: (node) => /** @type {(keyof NodeFields)[]} */ (Object.keys(node));
	/** @type {NodeFieldAccess["propsOf"]} */
	const propsOf = USES_HANDLES
		? (node) => {
				const { variant } = /** @type {NodeHandle} */ (
					/** @type {unknown} */ (node)
				);
				// A factory reads `type` to tell a node copied from properties given.
				/** @type {Record<string, unknown>} */
				const props = {
					type: /** @type {{ type: string }} */ (variantPrototypes[variant])
						.type
				};
				for (const name of variantShapes[variant]) {
					props[name] = access[name](node);
				}
				return /** @type {NodeProps} */ (props);
			}
		: (node) => ({ ...node });
	Object.assign(access, { ofKind, get, set, fieldsOf, propsOf });
	return /** @type {NodeFieldAccess} */ (/** @type {unknown} */ (access));
};

/**
 * @param {NodeHandle} node a node
 * @param {string} name a field its record holds no slot for
 * @returns {never} nothing
 */
const missingSlot = (node, name) => {
	throw new Error(
		`A ${/** @type {{ type?: string }} */ (variantPrototypes[node.variant]).type} holds no ${name}`
	);
};

const Nodes = createNodeAccess();

if (USES_HANDLES) {
	// A handle reads as the object it stands for, for what reads nodes directly.
	for (const name of NODE_FIELD_NAMES) {
		const setter = `set${name[0].toUpperCase()}${name.slice(1)}`;
		const read = /** @type {Record<string, EXPECTED_FUNCTION>} */ (
			/** @type {unknown} */ (Nodes)
		)[name];
		const write = /** @type {Record<string, EXPECTED_FUNCTION>} */ (
			/** @type {unknown} */ (Nodes)
		)[setter];
		Object.defineProperty(NodeHandle.prototype, name, {
			configurable: true,
			/**
			 * @this {NodeHandle}
			 * @returns {unknown} the field
			 */
			get() {
				return read(this);
			},
			/**
			 * @this {NodeHandle}
			 * @param {unknown} value the field's value
			 */
			set(value) {
				write(this, value);
			}
		});
	}
}

module.exports = Object.assign(Nodes, {
	USES_HANDLES,
	NodeHandle,
	nodeStore,
	registerVariant
});
