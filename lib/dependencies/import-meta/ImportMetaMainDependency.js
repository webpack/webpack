/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");
const ConstDependency = require("../core/ConstDependency");
const NullDependency = require("../core/NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { UpdateHashContext } from "../../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../../serialization/ObjectMiddleware"
 */
/** @import Hash from "../../util/Hash" */

/**
 * `import.meta.main` asks whether the module is the entry, which needs the
 * module argument scope hoisting removes. An inner concatenated module is
 * never an entry module, so it answers with a separate constant expression.
 */
class ImportMetaMainDependency extends ConstDependency {
	/**
	 * Creates an instance of ImportMetaMainDependency.
	 * @param {string} expression the expression a module outside a concatenation evaluates
	 * @param {string} concatenatedExpression the expression an inner concatenated module evaluates
	 * @param {Range} range the source range
	 * @param {(string[] | null)=} runtimeRequirements runtime requirements of `expression`
	 */
	constructor(expression, concatenatedExpression, range, runtimeRequirements) {
		super(expression, range, runtimeRequirements);
		/** @type {string} */
		this.concatenatedExpression = concatenatedExpression;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		super.updateHash(hash, context);
		hash.update(this.concatenatedExpression);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.concatenatedExpression);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.concatenatedExpression = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(
	ImportMetaMainDependency,
	"webpack/lib/dependencies/import-meta/ImportMetaMainDependency"
);
registerLegacyRequest(
	ImportMetaMainDependency,
	"webpack/lib/dependencies/ImportMetaMainDependency"
);

ImportMetaMainDependency.Template = class ImportMetaMainDependencyTemplate extends (
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
		const dep = /** @type {ImportMetaMainDependency} */ (dependency);
		const concatenated = templateContext.concatenationScope !== undefined;
		if (!concatenated && dep.runtimeRequirements) {
			for (const req of dep.runtimeRequirements) {
				templateContext.runtimeRequirements.add(req);
			}
		}
		const expression = concatenated
			? dep.concatenatedExpression
			: dep.expression;
		const range = /** @type {Range} */ (dep.range);
		source.replace(range[0], range[1] - 1, expression);
	}
};

module.exports = ImportMetaMainDependency;
