/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { cleanUp } from "../ErrorHelpers.js";
import makeSerializable from "../util/makeSerializable.js";
import WebpackError from "./WebpackError.js";
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[Error]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[Error]>} ObjectSerializerContext */

class ModuleError extends WebpackError {
	/**
	 * @param {Error} err error thrown
	 * @param {{ from?: string | null }} info additional info
	 */
	constructor(err, { from = null } = {}) {
		let message = "Module Error";

		message += from ? ` (from ${from}):\n` : ": ";

		if (err && typeof err === "object" && err.message) {
			message += err.message;
		} else if (err) {
			message += err;
		}

		super(message);

		/** @type {string} */
		this.name = "ModuleError";
		/** @type {Error} */
		this.error = err;
		/** @type {string | undefined} */
		this.details =
			err && typeof err === "object" && err.stack
				? cleanUp(err.stack, this.message)
				: undefined;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.error);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.error = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(ModuleError, "webpack/lib/errors/ModuleError");

export default ModuleError;

export { ModuleError as "module.exports" };
