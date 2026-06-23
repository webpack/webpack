/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { cutOffLoaderExecution } = require("../ErrorHelpers");
const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");

/** @typedef {Error & { hideStack?: boolean }} ErrorWithHideStack */

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string | ErrorWithHideStack]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string | ErrorWithHideStack]>} ObjectSerializerContext */

class ModuleBuildError extends WebpackError {
	/**
	 * Creates an instance of ModuleBuildError.
	 * @param {string | ErrorWithHideStack} err error thrown
	 * @param {{ from?: string | null }} info additional info
	 */
	constructor(err, { from = null } = {}) {
		let message = "Module build failed";
		/** @type {undefined | string} */
		let details;

		message += from ? ` (from ${from}):\n` : ": ";

		if (err !== null && typeof err === "object") {
			if (typeof err.stack === "string" && err.stack) {
				const stack = cutOffLoaderExecution(err.stack);

				if (!err.hideStack) {
					// V8 prefixes `.stack` with "Name: message"; JSC and others emit
					// frames only, which would drop the message. Lead with it then.
					message +=
						typeof err.message === "string" &&
						err.message &&
						!stack.includes(err.message)
							? `${err.name ? `${err.name}: ` : ""}${err.message}`
							: stack;
				} else {
					details = stack;

					message +=
						typeof err.message === "string" && err.message ? err.message : err;
				}
			} else if (typeof err.message === "string" && err.message) {
				message += err.message;
			} else {
				message += String(err);
			}
		} else {
			message += String(err);
		}

		super(message);

		/** @type {string} */
		this.name = "ModuleBuildError";
		/** @type {string | undefined} */
		this.details = details;
		/** @type {string | ErrorWithHideStack} */
		this.error = err;
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

makeSerializable(ModuleBuildError, "webpack/lib/errors/ModuleBuildError");

module.exports = ModuleBuildError;
