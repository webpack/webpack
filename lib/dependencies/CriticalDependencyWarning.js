/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const makeSerializable = require("../util/makeSerializable");

class CriticalDependencyWarning extends WebpackError {
	constructor(module, message, loc) {
		super();

		this.module = module;
		this.name = "CriticalDependencyWarning";
		this.message = "Critical dependency: " + message;
		this.loc = loc;
		this.hideStack = true;
	}
}

makeSerializable(
	CriticalDependencyWarning,
	"webpack/lib/dependencies/CriticalDependencyWarning"
);

module.exports = CriticalDependencyWarning;
