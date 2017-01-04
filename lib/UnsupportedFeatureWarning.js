"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class UnsupportedFeatureWarning extends Error {
	constructor(module, message) {
		super();
		this.module = module;
		this.message = message;
		this.name = "UnsupportedFeatureWarning";
		Error.captureStackTrace(this, UnsupportedFeatureWarning);
		this.origin = module;
	}
}
module.exports = UnsupportedFeatureWarning;
