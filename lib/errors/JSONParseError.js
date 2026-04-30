/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

const makeSerializable = require("../util/makeSerializable");

const CONTEXT = 20;

class JSONParseError extends SyntaxError {
	/**
	 * @param {Error} err err
	 * @param {unknown} raw raw
	 * @param {string} txt text
	 */
	constructor(err, raw, txt) {
		let originalMessage = err.message;
		/** @type {string} */
		let message;
		/** @type {number} */
		let position;

		if (typeof raw !== "string") {
			message = `Cannot parse ${Array.isArray(raw) && raw.length === 0 ? "an empty array" : String(raw)}`;
			position = 0;
		} else if (!txt) {
			message = `${originalMessage} while parsing empty string`;
			position = 0;
		} else {
			// Node 20 puts single quotes around the token and a comma after it
			const UNEXPECTED_TOKEN = /^Unexpected token '?(.)'?(,)? /i;
			const badTokenMatch = originalMessage.match(UNEXPECTED_TOKEN);
			const badIndexMatch = originalMessage.match(/ position\s+(\d+)/i);

			if (badTokenMatch) {
				const h = badTokenMatch[1].charCodeAt(0).toString(16).toUpperCase();
				const hex = `0x${h.length % 2 ? "0" : ""}${h}`;

				originalMessage = originalMessage.replace(
					UNEXPECTED_TOKEN,
					`Unexpected token ${JSON.stringify(badTokenMatch[1])} (${hex})$2 `
				);
			}

			/** @type {number | undefined} */
			let errIdx;

			if (badIndexMatch) {
				errIdx = Number(badIndexMatch[1]);
			} else if (
				// doesn't happen in Node 22+
				/^Unexpected end of JSON.*/i.test(originalMessage)
			) {
				errIdx = txt.length - 1;
			}

			if (errIdx === undefined) {
				message = `${originalMessage} while parsing '${txt.slice(0, CONTEXT * 2)}'`;
				position = 0;
			} else {
				const start = errIdx <= CONTEXT ? 0 : errIdx - CONTEXT;
				const end =
					errIdx + CONTEXT >= txt.length ? txt.length : errIdx + CONTEXT;
				const slice = `${start ? "..." : ""}${txt.slice(start, end)}${end === txt.length ? "" : "..."}`;

				message = `${originalMessage} while parsing ${txt === slice ? "" : "near "}${JSON.stringify(slice)}`;
				position = errIdx;
			}
		}

		super(message);

		/** @type {string} */
		this.name = "JSONParseError";
		/** @type {string | undefined} */
		this.stack = undefined;
		/** @type {Error} */
		this.systemError = err;
		/** @type {unknown} */
		this.raw = raw;
		/** @type {string} */
		this.txt = txt;
		/** @type {number} */
		this.position = position;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		write(this.systemError);
		write(this.raw);
		write(this.txt);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {JSONParseError} DelegatedModule
	 */
	static deserialize(context) {
		const { read } = context;
		return new JSONParseError(read(), read(), read());
	}
}

makeSerializable(JSONParseError, "webpack/lib/errors/JSONParseError");

module.exports = JSONParseError;
