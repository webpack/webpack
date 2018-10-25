/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { cutOffLoaderExecution } = require("./ErrorHelpers");
const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

class ModuleBuildError extends WebpackError {
	constructor(module, err, { from = null } = {}) {
		let message = "Module build failed";
		let details = undefined;

		if (from) {
			message += ` (from ${from}):\n`;
		} else {
			message += ": ";
		}

		if (err !== null && typeof err === "object") {
			if (typeof err.stack === "string" && err.stack) {
				const stack = cutOffLoaderExecution(err.stack);

				if (!err.hideStack) {
					message += stack;
				} else {
					details = stack;

					if (typeof err.message === "string" && err.message) {
						message += err.message;
					} else {
						message += err;
					}
				}
			} else if (typeof err.message === "string" && err.message) {
				message += err.message;
			} else {
				message += err;
			}
		} else {
			message = err;
		}

		super(message);

		this.name = "ModuleBuildError";
		this.details = details;
		this.module = module;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}

	serialize(context) {
		const { write } = context;

		write(this.name);
		write(this.details);
		write(this.module);
		write(this.error);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.name = read();
		this.details = read();
		this.module = read();
		this.error = read();

		super.deserialize(context);
	}
}

makeSerializable(ModuleBuildError, "webpack/lib/ModuleBuildError");

module.exports = ModuleBuildError;
