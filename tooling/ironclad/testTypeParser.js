/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * Test-support parser: espree plus a hand-written `parserServices`, so the
 * rule's type-aware path can be exercised without a TypeScript program.
 * Types are declared per identifier name through
 * `parserOptions.types`, as `"number"` or `"Name"` or `"Name:Base1,Base2"`.
 */

const espree = require("espree");
const typescript = require("typescript");

/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("typescript").Type} Type */

const PRIMITIVE_FLAGS = new Map([
	["bigint", typescript.TypeFlags.BigInt],
	["boolean", typescript.TypeFlags.Boolean],
	["null", typescript.TypeFlags.Null],
	["number", typescript.TypeFlags.Number],
	["string", typescript.TypeFlags.String],
	["symbol", typescript.TypeFlags.ESSymbol],
	["undefined", typescript.TypeFlags.Undefined]
]);

/**
 * @param {string} descriptor `"number"`, `"Name"` or `"Name:Base1,Base2"`
 * @returns {Type} a type answering what the rule asks of it
 */
const makeType = (descriptor) => {
	const primitive = PRIMITIVE_FLAGS.get(descriptor);
	const [name, bases] = descriptor.split(":");
	const baseTypes = bases ? bases.split(",").map(makeType) : [];
	return /** @type {Type} */ (
		/** @type {unknown} */ ({
			flags: primitive === undefined ? typescript.TypeFlags.Object : primitive,
			baseTypes,
			isUnion: () => false,
			isClassOrInterface: () => primitive === undefined,
			getSymbol: () =>
				primitive === undefined ? { getName: () => name } : undefined
		})
	);
};

/**
 * @param {string} code source to parse
 * @param {{ types?: Record<string, string>, ecmaVersion?: number | "latest", sourceType?: "script" | "module" }} options parser options
 * @returns {{ ast: Program, services: object }} parse result
 */
const parseForESLint = (code, options) => {
	const declared = (options && options.types) || {};
	const ast = espree.parse(code, {
		comment: true,
		ecmaVersion: (options && options.ecmaVersion) || "latest",
		loc: true,
		range: true,
		sourceType: (options && options.sourceType) || "script",
		tokens: true
	});
	const checker = {
		/**
		 * @param {Type} type type to look under
		 * @returns {Type[]} its base types
		 */
		getBaseTypes: (type) =>
			/** @type {{ baseTypes: Type[] }} */ (/** @type {unknown} */ (type))
				.baseTypes
	};
	return {
		ast: /** @type {Program} */ (/** @type {unknown} */ (ast)),
		services: {
			program: { getTypeChecker: () => checker },
			/**
			 * @param {Node} node node to type
			 * @returns {Type} its declared type
			 */
			getTypeAtLocation(node) {
				const name = node.type === "Identifier" ? node.name : "";
				const descriptor = Object.prototype.hasOwnProperty.call(declared, name)
					? declared[name]
					: null;
				if (descriptor === null) throw new Error(`no type for ${name}`);
				return makeType(descriptor);
			}
		}
	};
};

module.exports = { parseForESLint };
