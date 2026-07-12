/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleDependency from "../dependencies/ModuleDependency.js";
import makeSerializable from "../util/makeSerializable.js";

class FallbackItemDependency extends ModuleDependency {
	/**
	 * Creates an instance of FallbackItemDependency.
	 * @param {string} request request
	 */
	constructor(request) {
		/** @type {string} */
		super(request);
	}

	get type() {
		return "fallback item";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	FallbackItemDependency,
	"webpack/lib/container/FallbackItemDependency"
);

export default FallbackItemDependency;

export { FallbackItemDependency as "module.exports" };
