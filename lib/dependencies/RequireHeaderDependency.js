/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../DependenciesBlock")} DependenciesBlock */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Range]>} ObjectSerializerContext */

const getCommonJsRequireDependency = memoize(() =>
	require("./CommonJsRequireDependency")
);

class RequireHeaderDependency extends NullDependency {
	/**
	 * Creates an instance of RequireHeaderDependency.
	 * @param {Range} range range
	 */
	constructor(range) {
		super();
		if (!Array.isArray(range)) throw new Error("range must be valid");
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
	 * @returns {RequireHeaderDependency} RequireHeaderDependency
	 */
	static deserialize(context) {
		const obj = new RequireHeaderDependency(context.read());
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(
	RequireHeaderDependency,
	"webpack/lib/dependencies/RequireHeaderDependency"
);

RequireHeaderDependency.Template = class RequireHeaderDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ module, moduleGraph, runtime, runtimeRequirements }
	) {
		const dep = /** @type {RequireHeaderDependency} */ (dependency);
		const CommonJsRequireDependency = getCommonJsRequireDependency();
		// Skip only when the whole `require(...)` was replaced with `0`
		// (evaluation-only + side-effect-free). Dead-branch inactive deps still
		// need the header — they only rewrite the argument to
		// `null /* dead branch */`. Skipping those yields bare `require(null)`.
		// Walk blocks too: `require.ensure` / async callbacks put requires there.
		let skipHeader = false;
		/** @type {DependenciesBlock[]} */
		const queue = [module];
		outer: while (queue.length > 0) {
			const block = /** @type {DependenciesBlock} */ (queue.pop());
			for (const b of block.blocks) queue.push(b);
			for (const d of block.dependencies) {
				if (
					!(d instanceof CommonJsRequireDependency) ||
					!d.valueRange ||
					d.valueRange[0] !== dep.range[0]
				) {
					continue;
				}
				const connection = moduleGraph.getConnection(d);
				if (
					connection &&
					!connection.isTargetActive(runtime) &&
					d.isEvaluationOnly()
				) {
					skipHeader = true;
				}
				break outer;
			}
		}
		if (skipHeader) return;

		runtimeRequirements.add(RuntimeGlobals.require);
		source.replace(dep.range[0], dep.range[1] - 1, RuntimeGlobals.require);
	}
};

module.exports = RequireHeaderDependency;
