/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class UnsupportedFeatureWarning extends Error {

	constructor(module, message) {
		super();

		this.name = "UnsupportedFeatureWarning";
		this.message = message;
		this.origin = this.module = module;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = UnsupportedFeatureWarning;
