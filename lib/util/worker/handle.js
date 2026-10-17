/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const makeSerializable = require("../makeSerializable");

/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/** @typedef {(...args: EXPECTED_ANY[]) => unknown} HandleFunction */

/** What `kind` holds on every handle, so a token that crossed structured clone is still recognizable */
const HANDLE_KIND = "webpack/worker-handle";

/**
 * A token for a function one side exposed to the other. It carries only the id and the owner, since a function cannot cross a port; the function stays in the owner's registry.
 */
class Handle {
	/**
	 * @param {number} id id in the owner's registry
	 * @param {number | undefined} workerId the thread owning the function, `undefined` when the main thread does
	 */
	constructor(id, workerId) {
		this.kind = HANDLE_KIND;
		this.id = id;
		this.workerId = workerId;
	}

	/**
	 * @param {unknown} value a handle, or the plain object structured clone made of one
	 * @returns {value is Handle} whether it names a handle
	 */
	static isHandle(value) {
		throw new Error("Not implemented");
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		throw new Error("Not implemented");
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		throw new Error("Not implemented");
	}
}

makeSerializable(Handle, "webpack/lib/util/worker/handle");

module.exports = Handle;

Handle.HANDLE_KIND = HANDLE_KIND;
