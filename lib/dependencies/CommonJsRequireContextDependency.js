/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");
const ContextDependencyTemplateAsRequireCall = require("./ContextDependencyTemplateAsRequireCall");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class CommonJsRequireContextDependency extends ContextDependency {
	constructor(options, range, valueRange, inShorthand, context) {
		super(options, context);

		this.range = range;
		this.valueRange = valueRange;
		// inShorthand must be serialized by subclasses that use it
		this.inShorthand = inShorthand;
	}

	get type() {
		return "cjs require context";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;

		write(this.range);
		write(this.valueRange);
		write(this.inShorthand);

		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;

		this.range = read();
		this.valueRange = read();
		this.inShorthand = read();

		super.deserialize(context);
	}
}

makeSerializable(
	CommonJsRequireContextDependency,
	"webpack/lib/dependencies/CommonJsRequireContextDependency"
);

CommonJsRequireContextDependency.Template =
	ContextDependencyTemplateAsRequireCall;

module.exports = CommonJsRequireContextDependency;
