/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const NullDependency = require("../dependencies/core/NullDependency");
const makeSerializable = require("../util/makeSerializable");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { UpdateHashContext } from "../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../template/DependencyTemplate" */
/** @import Hash from "../util/Hash" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[number[]]>} ObjectSerializerContext */

/** @typedef {[number, number, string]} Blank a range of the source and the text it is replaced with */

/**
 * The TypeScript syntax a module's parse skipped, which its code generation
 * blanks: every character turns into a space but line terminators, so every
 * offset, line and column stays where it was, and a `;` or `)` is written
 * where the blanked text would otherwise read as other JavaScript.
 */
class TypeScriptTypesDependency extends NullDependency {
	/**
	 * @param {number[]} ranges the parser's `typeRanges`: start, end and the character to write at the start (0 for none), for each range
	 */
	constructor(ranges) {
		super();
		/** @type {number[]} */
		this.ranges = ranges;
	}

	get type() {
		return "typescript types";
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(this.ranges.join(","));
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.ranges);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const c0 =
			/** @type {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[number[], ...import("../serialization/types").ComplexSerializableType[]]>} */
			(context);
		this.ranges = c0.read();
		super.deserialize(c0.rest);
	}

	/**
	 * The replacements blanking `ranges` in `source`, overlapping and adjacent
	 * ranges joined, in source order.
	 * @param {string} source the module's source
	 * @param {number[]} ranges the parser's `typeRanges`
	 * @returns {Blank[]} each replaced range and its text
	 */
	static blanks(source, ranges) {
		/** @type {number[]} */
		const order = [];
		for (let i = 0; i < ranges.length; i += 3) order.push(i);
		// a moved `)` is recorded after the return type it lands in
		order.sort(
			(a, b) => ranges[a] - ranges[b] || ranges[a + 1] - ranges[b + 1]
		);
		/** @type {Blank[]} */
		const result = [];
		let index = 0;
		while (index < order.length) {
			const start = ranges[order[index]];
			let end = ranges[order[index] + 1];
			let next = index + 1;
			while (next < order.length && ranges[order[next]] <= end) {
				end = Math.max(end, ranges[order[next] + 1]);
				next++;
			}
			/** @type {string[]} */
			const chars = [];
			for (let i = start; i < end; i++) {
				const ch = source.charCodeAt(i);
				// a line terminator stays, so lines and columns do
				chars.push(
					ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029
						? source[i]
						: " "
				);
			}
			for (let i = index; i < next; i++) {
				const write = ranges[order[i] + 2];
				if (write !== 0) {
					chars[ranges[order[i]] - start] = String.fromCharCode(write);
				}
			}
			result.push([start, end, chars.join("")]);
			index = next;
		}
		return result;
	}
}

makeSerializable(
	TypeScriptTypesDependency,
	"webpack/lib/typescript/TypeScriptTypesDependency"
);

TypeScriptTypesDependency.Template = class TypeScriptTypesDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {TypeScriptTypesDependency} */ (dependency);
		const original = /** @type {string} */ (source.original().source());
		for (const [start, end, text] of TypeScriptTypesDependency.blanks(
			original,
			dep.ranges
		)) {
			source.replace(start, end - 1, text);
		}
	}
};

module.exports = TypeScriptTypesDependency;
