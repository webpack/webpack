/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import WebpackError from "../errors/WebpackError.js";
import makeSerializable from "../util/makeSerializable.js";

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
	"webpack/lib/dependencies/CriticalDependencyWarning"
);

export default CriticalDependencyWarning;

export { CriticalDependencyWarning as "module.exports" };
