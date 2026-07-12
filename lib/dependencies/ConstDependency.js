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
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection.js").ConnectionState} ConnectionState */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[string, number | Range, Set<string> | null]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[string, number | Range, Set<string> | null]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash.js").default} Hash */

class ConstDependency extends NullDependency {
	/**
	 * Creates an instance of ConstDependency.
	 * @param {string} expression the expression
	 * @param {number | Range} range the source range
	 * @param {RawRuntimeRequirements | null=} runtimeRequirements runtime requirements
	 */
	constructor(expression, range, runtimeRequirements) {
		super();
		/** @type {string} */
		this.expression = expression;
		this.range = range;
		/** @type {Set<string> | null} */
		this.runtimeRequirements = runtimeRequirements
			? new Set(runtimeRequirements)
			: null;
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
			let hashUpdate = `${this.range}|${this.expression}`;
			if (this.runtimeRequirements) {
				for (const item of this.runtimeRequirements) {
					hashUpdate += "|";
					hashUpdate += item;
				}
			}
			this._hashUpdate = hashUpdate;
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Gets module evaluation side effects state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		return false;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		// chain writes so each position is type-checked against the tuple
		context
			.write(this.expression)
			.write(this.range)
			.write(this.runtimeRequirements);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		// advance the cursor via `rest` so each read is type-checked by position
		this.expression = context.read();
		const c1 = context.rest;
		this.range = c1.read();
		const c2 = c1.rest;
		this.runtimeRequirements = c2.read();
		super.deserialize(c2.rest);
	}
}

makeSerializable(ConstDependency, "webpack/lib/dependencies/ConstDependency");

ConstDependency.Template = class ConstDependencyTemplate extends (
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
		const dep = /** @type {ConstDependency} */ (dependency);
		if (dep.runtimeRequirements) {
			for (const req of dep.runtimeRequirements) {
				templateContext.runtimeRequirements.add(req);
			}
		}
		if (typeof dep.range === "number") {
			source.insert(dep.range, dep.expression);
			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, dep.expression);
	}
};

export default ConstDependency;

export { ConstDependency as "module.exports" };
