/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

class CommentCompilationWarning extends WebpackError {
	constructor(message, module, loc) {
		super(message);

		this.name = "CommentCompilationWarning";

		this.module = module;
		this.loc = loc;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = CommentCompilationWarning;
