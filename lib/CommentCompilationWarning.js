/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./Module")} Module */

/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */

class CommentCompilationWarning extends WebpackError {
	/**
	 *
	 * @param {string} message warning message
	 * @param {Module} module affected module
	 * @param {DependencyLocation} loc affected lines of code
	 */
	constructor(message, module, loc) {
		super(message);

		this.name = "CommentCompilationWarning";

		this.module = module;
		this.loc = loc;

		Error.captureStackTrace(this, this.constructor);
	}

	serialize(context) {
		const { write } = context;

		write(this.name);
		write(this.module);
		write(this.loc);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.name = read();
		this.module = read();
		this.loc = read();

		super.serialize(context);
	}
}

makeSerializable(
	CommentCompilationWarning,
	"webpack/lib/CommentCompilationWarning"
);

module.exports = CommentCompilationWarning;
