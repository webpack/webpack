/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

class UnsupportedFeatureWarning extends WebpackError {
	constructor(module, message, loc) {
		super(message);

		this.name = "UnsupportedFeatureWarning";
		this.module = module;
		this.loc = loc;
		this.hideStack = true;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = UnsupportedFeatureWarning;
