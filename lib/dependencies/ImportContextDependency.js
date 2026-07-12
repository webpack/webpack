/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";
import ContextDependencyTemplateAsRequireCall from "./ContextDependencyTemplateAsRequireCall.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Range]>} ObjectSerializerContext */
/** @typedef {import("./ContextDependency.js").ContextDependencyOptions} ContextDependencyOptions */

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

		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.valueRange = context.read();

		super.deserialize(context.rest);
	}
}

makeSerializable(
	ImportContextDependency,
	"webpack/lib/dependencies/ImportContextDependency"
);

ImportContextDependency.Template = ContextDependencyTemplateAsRequireCall;

export default ImportContextDependency;

export { ImportContextDependency as "module.exports" };
