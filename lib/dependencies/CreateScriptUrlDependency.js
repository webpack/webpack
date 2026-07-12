/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import makeSerializable from "../util/makeSerializable.js";
import NullDependency from "./NullDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Range]>} ObjectSerializerContext */

class CreateScriptUrlDependency extends NullDependency {
	/**
	 * Creates an instance of CreateScriptUrlDependency.
	 * @param {Range} range range
	 */
	constructor(range) {
		super();
		this.range = range;
	}

	get type() {
		return "create script url";
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

CreateScriptUrlDependency.Template = class CreateScriptUrlDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { runtimeRequirements }) {
		const dep = /** @type {CreateScriptUrlDependency} */ (dependency);

		runtimeRequirements.add(RuntimeGlobals.createScriptUrl);

		source.insert(dep.range[0], `${RuntimeGlobals.createScriptUrl}(`);
		source.insert(dep.range[1], ")");
	}
};

makeSerializable(
	CreateScriptUrlDependency,
	"webpack/lib/dependencies/CreateScriptUrlDependency"
);

export default CreateScriptUrlDependency;

export { CreateScriptUrlDependency as "module.exports" };
