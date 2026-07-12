/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";
import ContextDependencyTemplateAsRequireCall from "./ContextDependencyTemplateAsRequireCall.js";
/** @typedef {import("../ContextModule.js").ContextOptions} ContextOptions */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Range]>} ObjectSerializerContext */

/** @typedef {ContextOptions & { request: string }} ContextDependencyOptions */

class URLContextDependency extends ContextDependency {
	/**
	 * Creates an instance of URLContextDependency.
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
		return "new URL() context";
	}

	get category() {
		return "url";
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
	URLContextDependency,
	"webpack/lib/dependencies/URLContextDependency"
);

URLContextDependency.Template = ContextDependencyTemplateAsRequireCall;

export default URLContextDependency;

export { URLContextDependency as "module.exports" };
