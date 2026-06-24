/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { cleanUp } = require("../ErrorHelpers");
const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Error]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Error]>} ObjectSerializerContext */

class ModuleWarning extends WebpackError {
	/**
	 * Creates an instance of ModuleWarning.
	 * @param {Error} warning error thrown
	 * @param {{ from?: string | null }} info additional info
	 */
	constructor(warning, { from = null } = {}) {
		let message = "Module Warning";

		message += from ? ` (from ${from}):\n` : ": ";

		if (warning && typeof warning === "object" && warning.message) {
			message += warning.message;
		} else if (warning) {
			message += String(warning);
		}

		super(message);

		/** @type {string} */
		this.name = "ModuleWarning";
		/** @type {Error} */
		this.warning = warning;
		/** @type {string | undefined} */
		this.details =
			warning && typeof warning === "object" && warning.stack
				? cleanUp(warning.stack, this.message)
				: undefined;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.warning);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.warning = context.read();
		super.deserialize(context.rest);
	}
}

makeSerializable(ModuleWarning, "webpack/lib/errors/ModuleWarning");

/** @type {typeof ModuleWarning} */
module.exports = ModuleWarning;
