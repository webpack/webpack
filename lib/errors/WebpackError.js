/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/

"use strict";

/** @type {typeof import("util").inspect.custom} */
const inspect = require("util").inspect.custom;
const makeSerializable = require("../util/makeSerializable");

/** @import Chunk from "../graph/Chunk" */
/** @import { DependencyLocation } from "../graph/Dependency" */
/** @import Module from "../module/Module" */
/** @import { ComplexSerializableType } from "../serialization/types" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */

class WebpackError extends Error {
	/**
	 * Creates an instance of WebpackError.
	 * @param {string=} message error message
	 * @param {{ cause?: ThrownValue }} options error options
	 */
	constructor(message, options = {}) {
		super(message, options);

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
	}

	/**
	 * Whether an error is a webpack error rather than any other thrown value.
	 * @template T
	 * @param {T} value an error
	 * @returns {value is T & WebpackError} true when the value is a webpack error
	 */
	static isWebpackError(value) {
		return value instanceof WebpackError;
	}

	/**
	 * Returns inspect message.
	 * @returns {string} inspect message
	 */
	[inspect]() {
		return (
			this.stack +
			(this.details ? `\n${this.details}` : "") +
			(this.cause ? `\n${this.cause}` : "")
		);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		write(this.name);
		write(this.message);
		write(this.stack);
		// `Error#cause` holds whatever was thrown; the serializer reports one it cannot write.
		write(/** @type {ComplexSerializableType} */ (this.cause));
		write(this.details);
		write(this.loc);
		write(this.hideStack);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		// A subclass reads its own fields first; this class reads the rest.
		const c0 =
			/** @type {ObjectDeserializerContext<[WebpackError["name"], WebpackError["message"], WebpackError["stack"], WebpackError["cause"], WebpackError["details"], WebpackError["loc"], WebpackError["hideStack"]]>} */
			(context);
		this.name = c0.read();
		const c1 = c0.rest;
		this.message = c1.read();
		const c2 = c1.rest;
		this.stack = c2.read();
		const c3 = c2.rest;
		this.cause = c3.read();
		const c4 = c3.rest;
		this.details = c4.read();
		const c5 = c4.rest;
		this.loc = c5.read();
		const c6 = c5.rest;
		this.hideStack = c6.read();
	}
}

makeSerializable(WebpackError, "webpack/lib/errors/WebpackError");

/** @type {typeof WebpackError} */
module.exports = WebpackError;
