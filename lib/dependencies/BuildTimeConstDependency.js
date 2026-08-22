/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ConstDependency = require("./ConstDependency");
const NullDependency = require("./NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { UpdateHashContext } from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import { Range } from "../javascript/JavascriptParser" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */
/** @import Hash from "../util/Hash" */

/**
 * A constant replacement whose source is only valid in emitted output (e.g.
 * native `import.meta`), with a separate expression for build-time execution.
 */
class BuildTimeConstDependency extends ConstDependency {
	/**
	 * Creates an instance of BuildTimeConstDependency.
	 * @param {string} expression the expression
	 * @param {string} buildTimeExpression the expression for build-time execution
	 * @param {Range} range the source range
	 * @param {(string[] | null)=} runtimeRequirements runtime requirements
	 */
	constructor(expression, buildTimeExpression, range, runtimeRequirements) {
		super(expression, range, runtimeRequirements);
		/** @type {string} */
		this.buildTimeExpression = buildTimeExpression;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		super.updateHash(hash, context);
		hash.update(this.buildTimeExpression);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.buildTimeExpression);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.buildTimeExpression = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(
	BuildTimeConstDependency,
	"webpack/lib/dependencies/BuildTimeConstDependency"
);

BuildTimeConstDependency.Template = class BuildTimeConstDependencyTemplate extends (
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
		const dep = /** @type {BuildTimeConstDependency} */ (dependency);
		if (dep.runtimeRequirements) {
			for (const req of dep.runtimeRequirements) {
				templateContext.runtimeRequirements.add(req);
			}
		}
		const expression = templateContext.chunkGraph.buildTimeExecution
			? dep.buildTimeExpression
			: dep.expression;
		const range = /** @type {Range} */ (dep.range);
		source.replace(range[0], range[1] - 1, expression);
	}
};

module.exports = BuildTimeConstDependency;
