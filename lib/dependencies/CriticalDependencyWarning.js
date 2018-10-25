/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const makeSerializable = require("../util/makeSerializable");

class CriticalDependencyWarning extends WebpackError {
	constructor(message) {
		super();

		this.name = "CriticalDependencyWarning";
		this.message = "Critical dependency: " + message;

		Error.captureStackTrace(this, this.constructor);
	}
}

makeSerializable(
	CriticalDependencyWarning,
	"webpack/lib/dependencies/CriticalDependencyWarning"
);

module.exports = CriticalDependencyWarning;
