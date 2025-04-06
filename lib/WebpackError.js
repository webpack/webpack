/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/

"use strict";

const inspect = require("util").inspect.custom;
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class WebpackError extends Error {
	/**
	 * Creates an instance of WebpackError.
	 * @param {string} [message] Error message
	 * @param {{ cause?: Error }} [options] Options object containing an optional cause
	 */
	constructor(message, options = {}) {
		super(message);

		/** @type {string | undefined} */
		this.details = undefined;
		/** @type {Module | null | undefined} */
		this.module = undefined;
		/** @type {DependencyLocation | undefined} */
		this.loc = undefined;
		/** @type {boolean | undefined} */
		this.hideStack = undefined;
		/** @type {Chunk | undefined} */
		this.chunk = undefined;
		/** @type {string | undefined} */
		this.file = undefined;
		/** @type {Error | undefined} */
		this.cause = options.cause;
		this.errors = undefined;
	}

	[inspect]() {
		return this.stack + (this.details ? `\n${this.details}` : "");
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		write(this.name);
		write(this.message);
		write(this.stack);
		write(this.details);
		write(this.loc);
		write(this.hideStack);
		write(this.cause ? this.cause.message : null);
		write(
			this.errors ? this.errors.map((/**	@type {Error} */ e) => e.message) : null
		);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize({ read }) {
		this.name = read();
		this.message = read();
		this.stack = read();
		this.details = read();
		this.loc = read();
		this.hideStack = read();
		const errorMessages = read();
		if (errorMessages) {
			this.errors = errorMessages.map(
				(/** @type {string} */ message) => new Error(message)
			);
		}
	}
}

makeSerializable(WebpackError, "webpack/lib/WebpackError");

module.exports = WebpackError;
