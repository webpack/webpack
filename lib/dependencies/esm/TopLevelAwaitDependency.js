/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const isGeneratorLowered = require("../../async-modules/isGeneratorLowered");
const makeSerializable = require("../../util/makeSerializable");
const NullDependency = require("../core/NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency from "../../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[TopLevelAwaitDependency["range"]]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[TopLevelAwaitDependency["range"]]>} ObjectSerializerContext */

/**
 * Marks a top-level `await` expression so it can be rewritten to `(yield …)`
 * when the module is lowered to a generator (target without `async`/`await`).
 */
class TopLevelAwaitDependency extends NullDependency {
	/**
	 * @param {Range} range range of the whole `await` expression
	 */
	constructor(range) {
		super();
		/** @type {Range} */
		this.range = range;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(TopLevelAwaitDependency, [
	"webpack/lib/dependencies/esm/TopLevelAwaitDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/TopLevelAwaitDependency"
]);

TopLevelAwaitDependency.Template = class TopLevelAwaitDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, moduleGraph, runtimeTemplate }) {
		// Only a generator body is rewritten: `await X` -> `(yield( X))`. The outer
		// parentheses keep precedence; the inner one opens on the `yield` line,
		// since `yield` takes no operand across a line break.
		if (!isGeneratorLowered(module, moduleGraph, runtimeTemplate)) {
			return;
		}
		const dep = /** @type {TopLevelAwaitDependency} */ (dependency);
		source.replace(dep.range[0], dep.range[0] + 4, "(yield(");
		source.insert(dep.range[1], "))");
	}
};

module.exports = TopLevelAwaitDependency;
