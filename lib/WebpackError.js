/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jarid Margolin @jaridmargolin
*/
"use strict";

const createHash = require("./util/createHash");

const hash = Symbol("hash");
const meta = Symbol("meta");

module.exports = class WebpackError extends Error {
	constructor(
		message,
		options = Object.create({
			category: "error",
			// NOTE: went with a more semantic structure here, even though it
			// deviates from other similar structures in webpack
			column: { end: 0, start: 0 },
			line: { end: 0, start: 0 }
		})
	) {
		// TODO: enable message assertion during construction in a commit to follow
		// if (!message) {
		// 	WebpackError.deprecate("message must be a non-null, non-empty value.");
		// }
		// TODO: enable message length limit at a commit to follow
		// else if (message.length > 160) {
		// 	WebpackError.deprecate("message cannot be longer than 80 characters.");
		// }

		super(message);

		this[hash] = createHash("md4");
		this[meta] = Object.create(null);
		this.category = options.category;
		this.column = options.column;
		this.line = options.line;

		// TODO: enable abstract protection at a commit to follow
		// if (this.constructor === WebpackError) {
		// 	const message = `A WebpackError cannot be directly constructed.`;
		// 	WebpackError.deprecate(message);
		// }
	}

	static deprecate(message) {
		const err = new Error();
		const stack = err.stack
			.split("\n")
			.slice(3, 4)
			.join("\n");
		// use process.stdout to assert the message will be displayed in
		// environments where console has been proxied. this mimics node's
		// util.deprecate method.
		process.emitWarning(`DeprecationWarning: ${message}\n${stack}\n`);
	}

	get id() {
		return this[hash];
	}

	inspect() {
		return this.stack + (this.details ? `\n${this.details}` : "");
	}

	get meta() {
		return this[meta];
	}

	// TODO: enable this standard output in a later PR. at present, webpack tests
	// rely heavily on arbitrary toString() output of different errors.
	// toString(formatFn) {
	// 	if (formatFn) {
	// 		return formatFn(this);
	// 	}
	//
	// 	let preface = `${this.line}:${this.column} `;
	//
	// 	if (this.category) {
	// 		preface += `${this.category}: `;
	// 	}
	//
	// 	return `${preface}${this.message}`;
	// }
};
