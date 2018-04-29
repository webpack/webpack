/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");
const { cutOffLoaderExecution } = require("./ErrorHelpers");

class ModuleBuildError extends WebpackError {
	constructor(module, err, { from = null } = {}) {
		super();

		this.name = "ModuleBuildError";
		this.message = "Module build failed";
		if (from) {
			this.message += ` (from ${from})`;
		}

		let message;
		if (err !== null && typeof err === "object") {
			if (typeof err.stack === "string" && err.stack) {
				const stack = cutOffLoaderExecution(err.stack);
				if (!err.hideStack) {
					message = stack;
				} else {
					this.details = stack;
					if (typeof err.message === "string" && err.message) {
						message = err.message;
					} else {
						message = err;
					}
				}
			} else if (typeof err.message === "string" && err.message) {
				message = err.message;
			} else {
				message = err;
			}
		} else {
			message = err;
		}

		if (message !== "") {
			this.message += `:\n${message}`;
		}

		this.module = module;
		this.error = err;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = ModuleBuildError;
