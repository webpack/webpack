/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { cleanUp } = require("./ErrorHelpers");
const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

class ModuleError extends WebpackError {
	/**
	 * @param {Error} err error thrown
	 * @param {TODO} info additional info
	 */
	constructor(err, { from = null } = {}) {
		let message = "Module Error";

		if (from) {
			message += ` (from ${from}):\n`;
		} else {
			message += ": ";
		}

		if (err && typeof err === "object" && err.message) {
			message += err.message;
		} else if (err) {
			message += err;
		}

		super(message);

		this.name = "ModuleError";
		this.error = err;
		this.details =
			err && typeof err === "object" && err.stack
				? cleanUp(err.stack, this.message)
				: undefined;

		Error.captureStackTrace(this, this.constructor);
	}

	serialize(context) {
		const { write } = context;

		write(this.error);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.error = read();

		super.deserialize(context);
	}
}

makeSerializable(ModuleError, "webpack/lib/ModuleError");

module.exports = ModuleError;
