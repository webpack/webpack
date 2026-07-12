/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import NullDependency from "./NullDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("./NullDependency.js").RawRuntimeRequirements} RawRuntimeRequirements */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../Dependency.js").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Set<string>]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Set<string>]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash.js").default} Hash */

class RuntimeRequirementsDependency extends NullDependency {
	/**
	 * Creates an instance of RuntimeRequirementsDependency.
	 * @param {RawRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super();
		/** @type {Set<string>} */
		this.runtimeRequirements = new Set(runtimeRequirements);
		/** @type {undefined | string} */
		this._hashUpdate = undefined;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this._hashUpdate === undefined) {
			this._hashUpdate = `${[...this.runtimeRequirements].join()}`;
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.runtimeRequirements);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.runtimeRequirements = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(
	RuntimeRequirementsDependency,
	"webpack/lib/dependencies/RuntimeRequirementsDependency"
);

RuntimeRequirementsDependency.Template = class RuntimeRequirementsDependencyTemplate extends (
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
		const dep = /** @type {RuntimeRequirementsDependency} */ (dependency);
		for (const req of dep.runtimeRequirements) {
			runtimeRequirements.add(req);
		}
	}
};

export default RuntimeRequirementsDependency;

export { RuntimeRequirementsDependency as "module.exports" };
