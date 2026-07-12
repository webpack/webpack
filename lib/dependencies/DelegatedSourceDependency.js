/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";

class DelegatedSourceDependency extends ModuleDependency {
	/**
	 * Creates an instance of DelegatedSourceDependency.
	 * @param {string} request the request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "delegated source";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	DelegatedSourceDependency,
	"webpack/lib/dependencies/DelegatedSourceDependency"
);

export default DelegatedSourceDependency;

export { DelegatedSourceDependency as "module.exports" };
