/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Range, Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Range, Range]>} ObjectSerializerContext */
/** @typedef {import("./ContextDependency.js").ContextDependencyOptions} ContextDependencyOptions */

class AMDRequireContextDependency extends ContextDependency {
	/**
	 * Creates an instance of AMDRequireContextDependency.
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
		return "amd require context";
	}

	get category() {
		return "amd";
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
	AMDRequireContextDependency,
	"webpack/lib/dependencies/AMDRequireContextDependency"
);

AMDRequireContextDependency.Template =
	/** @type {typeof import("./ContextDependencyTemplateAsRequireCall.js").default} */ (
		require("./ContextDependencyTemplateAsRequireCall.js")
	);

export default AMDRequireContextDependency;

export { AMDRequireContextDependency as "module.exports" };
