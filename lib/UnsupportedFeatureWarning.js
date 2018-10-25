/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module")} Module */

class UnsupportedFeatureWarning extends WebpackError {
	/**
	 * @param {Module} module module relevant to warning
	 * @param {string} message description of warning
	 * @param {DependencyLocation} loc location start and end positions of the module
	 */
	constructor(module, message, loc) {
		super(message);

		this.name = "UnsupportedFeatureWarning";
		this.module = module;
		this.loc = loc;
		this.hideStack = true;

		Error.captureStackTrace(this, this.constructor);
	}
}

makeSerializable(
	UnsupportedFeatureWarning,
	"webpack/lib/UnsupportedFeatureWarning"
);

module.exports = UnsupportedFeatureWarning;
