/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../errors/WebpackError");
const makeSerializable = require("../util/makeSerializable");
const { registerLegacyRequest } = require("../util/serialization");

class CriticalDependencyWarning extends WebpackError {
	/**
	 * Creates an instance of CriticalDependencyWarning.
	 * @param {string} message message
	 */
	constructor(message) {
		super();

		/** @type {string} */
		this.name = "CriticalDependencyWarning";
		/** @type {string} */
		this.message = `Critical dependency: ${message}`;
	}
}

makeSerializable(
	CriticalDependencyWarning,
	"webpack/lib/errors/CriticalDependencyWarning"
);
registerLegacyRequest(
	CriticalDependencyWarning,
	"webpack/lib/dependencies/CriticalDependencyWarning"
);

module.exports = CriticalDependencyWarning;
