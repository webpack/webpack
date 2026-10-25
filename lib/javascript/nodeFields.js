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

/**
 * Builds `NodeFieldAccess`: each field's read and write a function of its own, so
 * each field's loads keep feedback of their own.
 * @returns {NodeFieldAccess} the reads and writes
 */
const createNodeAccess = () => {
	/** @type {Record<string, EXPECTED_FUNCTION>} */
	const access = {};
	for (const name of NODE_FIELD_NAMES) {
		access[name] =
			// eslint-disable-next-line no-new-func
			new Function("node", `"use strict"; return node.${name};`);
		access[`set${name[0].toUpperCase()}${name.slice(1)}`] =
			// eslint-disable-next-line no-new-func
			new Function(
				"node",
				"value",
				`"use strict"; return (node.${name} = value);`
			);
	}
	/**
	 * What a node's kind holds under a key of its own: kind bits, or a table a
	 * phase dispatches on.
	 * @template {Node} N
	 * @template {keyof N & symbol} K
	 * @param {N} node a node
	 * @param {K} key the key
	 * @returns {N[K]} the value
	 */
	access.ofKind = (node, key) => node[key];
	/**
	 * A field read by its name, for a phase choosing the field at run time.
	 * @param {Node} node a node
	 * @param {keyof NodeFields} name the field
	 * @returns {NodeFieldValue} its value
	 */
	access.get = (node, name) => node[name];
	/**
	 * A field written by its name.
	 * @param {Node} node a node
	 * @param {keyof NodeFields} name the field
	 * @param {NodeFieldValue} value its value
	 * @returns {NodeFieldValue} the value
	 */
	access.set = (node, name, value) => {
		/** @type {Record<string, NodeFieldValue>} */ (
			/** @type {unknown} */ (node)
		)[name] = value;
		return value;
	};
	/**
	 * @param {Node} node a node
	 * @returns {(keyof NodeFields)[]} the fields it holds
	 */
	access.fieldsOf = (node) =>
		/** @type {(keyof NodeFields)[]} */ (Object.keys(node));
	/**
	 * @param {Node} node a node
	 * @returns {NodeProps} its fields, as a factory takes them
	 */
	access.propsOf = (node) => ({ ...node });
	return /** @type {NodeFieldAccess} */ (/** @type {unknown} */ (access));
};

module.exports = createNodeAccess();
