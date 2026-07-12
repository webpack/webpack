/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleDependency from "../dependencies/ModuleDependency.js";
import makeSerializable from "../util/makeSerializable.js";

class ProvideForSharedDependency extends ModuleDependency {
	/**
	 * Creates an instance of ProvideForSharedDependency.
	 * @param {string} request request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "provide module for shared";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ProvideForSharedDependency,
	"webpack/lib/sharing/ProvideForSharedDependency"
);

export default ProvideForSharedDependency;

export { ProvideForSharedDependency as "module.exports" };
