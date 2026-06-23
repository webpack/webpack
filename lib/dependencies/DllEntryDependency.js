/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("./EntryDependency")} EntryDependency */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[EntryDependency[], string]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[EntryDependency[], string]>} ObjectSerializerContext */

class DllEntryDependency extends Dependency {
	/**
	 * Creates an instance of DllEntryDependency.
	 * @param {EntryDependency[]} dependencies dependencies
	 * @param {string} name name
	 */
	constructor(dependencies, name) {
		super();

		/** @type {EntryDependency[]} */
		this.dependencies = dependencies;
		/** @type {string} */
		this.name = name;
	}

	get type() {
		return "dll entry";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.dependencies).write(this.name);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.dependencies = context.read();
		const c1 = context.rest;
		this.name = c1.read();
		super.deserialize(c1.rest);
	}
}

makeSerializable(
	DllEntryDependency,
	"webpack/lib/dependencies/DllEntryDependency"
);

module.exports = DllEntryDependency;
