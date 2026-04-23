/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */

const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");

class NodeStuffInWebError extends WebpackError {
	/**
	 * Creates an instance of NodeStuffInWebError.
	 * @param {DependencyLocation} loc loc
	 * @param {string} expression expression
	 * @param {string} description description
	 */
	constructor(loc, expression, description) {
		super(
			`${JSON.stringify(
				expression
			)} has been used, it will be undefined in next major version.
${description}`
		);

		/** @type {string} */
		this.name = "NodeStuffInWebError";
		this.loc = loc;
	}
}

makeSerializable(NodeStuffInWebError, "webpack/lib/NodeStuffInWebError");

module.exports = NodeStuffInWebError;
