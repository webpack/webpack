/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */

import makeSerializable from "../util/makeSerializable.js";
import WebpackError from "./WebpackError.js";

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
		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

makeSerializable(NodeStuffInWebError, "webpack/lib/NodeStuffInWebError");

export default NodeStuffInWebError;

export { NodeStuffInWebError as "module.exports" };
