/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/

"use strict";

const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */

class WebpackError extends Error {
	/**
	 * Creates an instance of WebpackError.
	 * @param {string=} message error message
	 */
	constructor(message) {
		super(message);

		this.details = undefined;
		this.missing = undefined;
		this.module = undefined;
		/** @type {DependencyLocation} */
		this.loc = undefined;

		Error.captureStackTrace(this, this.constructor);
	}

	inspect() {
		return this.stack + (this.details ? `\n${this.details}` : "");
	}

	serialize(context) {
		const { write } = context;

		write(this.details);
		write(this.missing);
		write(this.module);
		write(this.loc);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.details = read();
		this.missing = read();
		this.module = read();
		this.loc = read();

		super.deserialize(context);
	}
}

makeSerializable(WebpackError, "webpack/lib/WebpackError");

module.exports = WebpackError;
