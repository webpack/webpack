/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleDependency from "../dependencies/ModuleDependency.js";
import makeSerializable from "../util/makeSerializable.js";

class ConsumeSharedFallbackDependency extends ModuleDependency {
	/**
	 * Creates an instance of ConsumeSharedFallbackDependency.
	 * @param {string} request the request
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "consume shared fallback";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ConsumeSharedFallbackDependency,
	"webpack/lib/sharing/ConsumeSharedFallbackDependency"
);

export default ConsumeSharedFallbackDependency;

export { ConsumeSharedFallbackDependency as "module.exports" };
