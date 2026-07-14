/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const isGeneratorLowered = require("../async-modules/isGeneratorLowered");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/**
 * Marks a top-level `await` expression so it can be rewritten to `(yield …)`
 * when the module is lowered to a generator (target without `async`/`await`).
 */
class TopLevelAwaitDependency extends NullDependency {
	/**
	 * @param {Range} range range of the whole `await` expression
	 * @param {Range} argumentRange range of the awaited argument
	 */
	constructor(range, argumentRange) {
		super();
		/** @type {Range} */
		this.range = range;
		/** @type {Range} */
		this.argumentRange = argumentRange;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.argumentRange);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.argumentRange = read();
		super.deserialize(context);
	}
}

makeSerializable(
	TopLevelAwaitDependency,
	"webpack/lib/dependencies/TopLevelAwaitDependency"
);

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
		// Only rewrite when the body is a generator (no `async`/`await`, but
		// generators). `await` and `yield` differ in precedence, so wrap the
		// whole expression: `await X` -> `(yield X)`.
		if (
			!isGeneratorLowered(
				/** @type {Module} */ (module),
				moduleGraph,
				runtimeTemplate
			)
		) {
			return;
		}
		const dep = /** @type {TopLevelAwaitDependency} */ (dependency);
		source.replace(dep.range[0], dep.argumentRange[0] - 1, "(yield ");
		source.insert(dep.argumentRange[1], ")");
	}
};

module.exports = TopLevelAwaitDependency;
