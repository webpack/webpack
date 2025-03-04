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
	 * @param {string=} message error message
	 * @param {Error=} cause the cause of the error
	 */
	constructor(message, cause) {
		super(message);

		/** @type {string=} */
		this.details = undefined;
		/** @type {(Module | null)=} */
		this.module = undefined;
		/** @type {DependencyLocation=} */
		this.loc = undefined;
		/** @type {boolean=} */
		this.hideStack = undefined;
		/** @type {Chunk=} */
		this.chunk = undefined;
		/** @type {string=} */
		this.file = undefined;
		/** @type {Error=} */
		this.cause = cause;
	}

	[inspect]() {
		return (
			this.stack +
			(this.details ? `\n${this.details}` : "") +
			(this.cause ? `\nCaused by: ${this.cause.stack}` : "") +
			(this.errors
				? `\nErrors: ${this.errors.map(e => e.stack).join("\n")}`
				: "")
		);
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
		write(this.errors ? this.errors.map(e => e.message) : null);
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
		const causeMessage = read();
		if (causeMessage) {
			this.cause = new Error(causeMessage);
		}
		const errorsMessages = read();
		if (errorsMessages) {
			this.errors = errorsMessages.map(msg => new Error(msg));
		}
	}
}

makeSerializable(WebpackError, "webpack/lib/WebpackError");

module.exports = WebpackError;
