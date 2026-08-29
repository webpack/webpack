/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

/** @import { Range } from "../javascript/JavascriptParser" */
/** @import { ObjectDeserializerContext, ObjectSerializerContext } from "../serialization/ObjectMiddleware" */
/** @import { ContextDependencyOptions } from "./ContextDependency" */
/** @import { ReplaceSource } from "webpack-sources" */

class ImportContextDependency extends ContextDependency {
	/**
	 * Creates an instance of ImportContextDependency.
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 * @param {Range} valueRange value range
	 */
	constructor(options, range, valueRange) {
		super(options);

		this.range = range;
		this.valueRange = valueRange;
		/** @type {Range | undefined} */
		this.optionsRange = undefined;
	}

	get type() {
		return `import() context ${this.options.mode}`;
	}

	get category() {
		return "esm";
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		let str = super.getResourceIdentifier();

		if (this.options.attributes) {
			str += `|attributes${JSON.stringify(this.options.attributes)}`;
		}

		return str;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.valueRange);
		context.write(this.optionsRange);

		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.valueRange = context.read();
		this.optionsRange = context.read();

		super.deserialize(context.rest);
	}
}

makeSerializable(
	ImportContextDependency,
	"webpack/lib/dependencies/ImportContextDependency"
);

ImportContextDependency.Template = class ImportContextDependencyTemplate extends (
	ContextDependencyTemplateAsRequireCall
) {
	// The spec evaluates an `import(request, options)` options argument right
	// after the request, so it stays as a second argument the context module
	// ignores. Its own source is left in place, so nested dependencies in it
	// still get their replacements.
	/**
	 * Closes the generated call, dropping everything the original one carried
	 * after its request. Overridden where a later argument must be kept.
	 * @param {ContextDependency} dep the dependency
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @returns {void}
	 */
	replaceAfterValue(dep, source) {
		const optionsRange = /** @type {ImportContextDependency} */ (dep)
			.optionsRange;
		if (optionsRange === undefined) {
			super.replaceAfterValue(dep, source);
			return;
		}
		const valueRange = /** @type {Range} */ (dep.valueRange);
		source.replace(valueRange[1], optionsRange[0] - 1, ", ");
		source.replace(
			optionsRange[1],
			/** @type {Range} */ (dep.range)[1] - 1,
			")"
		);
	}
};

module.exports = ImportContextDependency;
