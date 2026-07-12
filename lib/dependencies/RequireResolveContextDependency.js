/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";
import ContextDependencyTemplateAsId from "./ContextDependencyTemplateAsId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Range, Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Range, Range]>} ObjectSerializerContext */
/** @typedef {import("./ContextDependency.js").ContextDependencyOptions} ContextDependencyOptions */

class RequireResolveContextDependency extends ContextDependency {
	/**
	 * Creates an instance of RequireResolveContextDependency.
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 * @param {Range} valueRange value range
	 * @param {string=} context context
	 */
	constructor(options, range, valueRange, context) {
		super(options, context);

		this.range = range;
		this.valueRange = valueRange;
	}

	get type() {
		return "amd require context";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range).write(this.valueRange);

		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		const c1 = context.rest;
		this.valueRange = c1.read();

		super.deserialize(c1.rest);
	}
}

makeSerializable(
	RequireResolveContextDependency,
	"webpack/lib/dependencies/RequireResolveContextDependency"
);

RequireResolveContextDependency.Template = ContextDependencyTemplateAsId;

export default RequireResolveContextDependency;

export { RequireResolveContextDependency as "module.exports" };
