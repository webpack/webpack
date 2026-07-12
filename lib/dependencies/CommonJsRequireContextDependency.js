/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Dependency from "../Dependency.js";
import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";
import ContextDependencyTemplateAsRequireCall from "./ContextDependencyTemplateAsRequireCall.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Range, Range | undefined, boolean | string | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Range, Range | undefined, boolean | string | undefined]>} ObjectSerializerContext */
/** @typedef {import("./ContextDependency.js").ContextDependencyOptions} ContextDependencyOptions */
/** @typedef {import("../Dependency.js").RawReferencedExports} RawReferencedExports */
/** @typedef {import("../Dependency.js").ReferencedExports} ReferencedExports */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../util/runtime.js").RuntimeSpec} RuntimeSpec */

class CommonJsRequireContextDependency extends ContextDependency {
	/**
	 * Creates an instance of CommonJsRequireContextDependency.
	 * @param {ContextDependencyOptions} options options for the context module
	 * @param {Range} range location in source code
	 * @param {Range=} valueRange location of the require call
	 * @param {boolean | string=} inShorthand true or name
	 * @param {string=} context context
	 */
	constructor(options, range, valueRange, inShorthand, context) {
		super(options, context);

		this.range = range;
		this.valueRange = valueRange;
		// inShorthand must be serialized by subclasses that use it
		/** @type {string | boolean | undefined} */
		this.inShorthand = inShorthand;
	}

	get type() {
		return "cjs require context";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (!this.options.referencedExports) {
			return Dependency.EXPORTS_OBJECT_REFERENCED;
		}
		return this.options.referencedExports.map((name) => ({
			name,
			canMangle: false
		}));
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range).write(this.valueRange).write(this.inShorthand);

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
		const c2 = c1.rest;
		this.inShorthand = c2.read();

		super.deserialize(c2.rest);
	}
}

makeSerializable(
	CommonJsRequireContextDependency,
	"webpack/lib/dependencies/CommonJsRequireContextDependency"
);

CommonJsRequireContextDependency.Template =
	ContextDependencyTemplateAsRequireCall;

export default CommonJsRequireContextDependency;

export { CommonJsRequireContextDependency as "module.exports" };
