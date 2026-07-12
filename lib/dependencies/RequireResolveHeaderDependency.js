/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import NullDependency from "./NullDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Range]>} ObjectSerializerContext */

class RequireResolveHeaderDependency extends NullDependency {
	/**
	 * Creates an instance of RequireResolveHeaderDependency.
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
	 * @returns {RequireResolveHeaderDependency} RequireResolveHeaderDependency
	 */
	static deserialize(context) {
		const obj = new RequireResolveHeaderDependency(context.read());
		obj.deserialize(context);
		return obj;
	}
}

makeSerializable(
	RequireResolveHeaderDependency,
	"webpack/lib/dependencies/RequireResolveHeaderDependency"
);

RequireResolveHeaderDependency.Template = class RequireResolveHeaderDependencyTemplate extends (
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
		const dep = /** @type {RequireResolveHeaderDependency} */ (dependency);
		source.replace(dep.range[0], dep.range[1] - 1, "/*require.resolve*/");
	}

	/**
	 * Apply as template argument.
	 * @param {string} name name
	 * @param {RequireResolveHeaderDependency} dep dependency
	 * @param {ReplaceSource} source source
	 */
	applyAsTemplateArgument(name, dep, source) {
		source.replace(dep.range[0], dep.range[1] - 1, "/*require.resolve*/");
	}
};

export default RequireResolveHeaderDependency;

export { RequireResolveHeaderDependency as "module.exports" };
