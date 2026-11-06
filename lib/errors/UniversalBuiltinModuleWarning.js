/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");

class UniversalBuiltinModuleWarning extends WebpackError {
	/**
	 * Creates an instance of UniversalBuiltinModuleWarning.
	 * @param {string} request the node.js core module request
	 * @param {boolean} staticImport true when the builtin is imported statically, false when the getter reads it
	 */
	constructor(request, staticImport) {
		super(
			`The universal target can't load the Node.js built-in module ${JSON.stringify(
				request
			)} on every platform: ${
				staticImport
					? "it is imported statically, so a browser can't load the bundle"
					: "it is read with process.getBuiltinModule(), so it is false on Node.js without it"
			}.\nSet a Node.js version that has process.getBuiltinModule() in 'target' (20.16+ on 20.x, or 22.3+), e.g. ["node22.3", "web"].`
		);

		/** @type {string} */
		this.name = "UniversalBuiltinModuleWarning";
		/** @type {boolean} */
		this.hideStack = true;
	}
}

makeSerializable(
	UniversalBuiltinModuleWarning,
	"webpack/lib/errors/UniversalBuiltinModuleWarning"
);

module.exports = UniversalBuiltinModuleWarning;
