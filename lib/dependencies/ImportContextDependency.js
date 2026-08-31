/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");
const importOptionsCheck = require("./importOptionsCheck");

/** @import { Range } from "../javascript/JavascriptParser" */
/** @import { ObjectDeserializerContext, ObjectSerializerContext } from "../serialization/ObjectMiddleware" */
/** @import { ContextDependencyOptions } from "./ContextDependency" */
/** @import { ReplaceSource } from "webpack-sources" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */

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
	/**
	 * Rewrites the call around its request, dropping anything the original one
	 * carried after it. Overridden where a later argument must be kept.
	 * @param {ContextDependency} dep the dependency
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {string} moduleExports the expression the request is passed to
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	replaceCall(dep, source, moduleExports, templateContext) {
		const optionsRange = /** @type {ImportContextDependency} */ (dep)
			.optionsRange;
		if (optionsRange === undefined) {
			super.replaceCall(dep, source, moduleExports, templateContext);
			return;
		}
		// Request then options, in that order; their own source is kept so
		// nested dependencies in them still get their replacements.
		const range = /** @type {Range} */ (dep.range);
		const valueRange = /** @type {Range} */ (dep.valueRange);
		const check = importOptionsCheck(
			templateContext.runtimeTemplate,
			["r", "o"],
			`${moduleExports}(r)`
		);
		source.replace(range[0], valueRange[0] - 1, `(${check})(`);
		// The options range excludes any parentheses the source had, so a comma
		// expression would otherwise split into arguments of its own.
		source.replace(valueRange[1], optionsRange[0] - 1, ", (");
		source.replace(optionsRange[1], range[1] - 1, "))");
	}
};

module.exports = ImportContextDependency;
